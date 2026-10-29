import { useEffect, useState } from "react";
import { api } from "../api";
import { displayNameOf, useMe } from "../session";
import { GUEST_NAME, type GreetState, SLOTS, type Slot, WEEKDAYS, type Weekday, formatGreeting, pickGreeting, slotOf, stateOf } from "./pick";

/**
 * 首页顶部的一行欢迎语：“文案，名字”。名字用显示名（没设就用真名），游客是“新朋友”。
 * 一次打开网页只选一次（在站内切换页面再回首页不会变），换一次网页才换一句。
 */

const LAST_KEY = "hiana-greeting-last";

function readLast(): string | null {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

function writeLast(text: string) {
  try {
    localStorage.setItem(LAST_KEY, text);
  } catch {
    /* 隐私模式存不了，只是可能和上次重复 */
  }
}

/** 每个账号每次打开网页只报一次到：先拿到旧的“上次访问时间”，后端再更新。失败时按普通状态处理。 */
const visits = new Map<string, Promise<number | null>>();
function visitOnce(uid: string): Promise<number | null> {
  let p = visits.get(uid);
  if (!p) {
    p = api<{ lastSeenAt: number | null }>("/api/me/visit", { method: "POST" })
      .then((r) => r.lastSeenAt)
      .catch(() => Date.now());
    visits.set(uid, p);
  }
  return p;
}

/** 这次打开网页已经选好的句子（按账号；游客用 "guest"） */
const chosen = new Map<string, string>();

interface Debug {
  slot?: Slot;
  state?: GreetState;
  day?: Weekday;
}

const STATE_ALIASES: Record<string, GreetState> = { guest: "guest", 游客: "guest", first: "first", 初来: "first", away: "away", 久别: "away", normal: "normal", 其余: "normal" };

/**
 * 调试：只在本机开发（localhost / 127.0.0.1）时生效，线上域名一律忽略。
 *   ?greet_slot=深夜        指定时段（清晨 上午 中午 下午 傍晚 夜晚 深夜）
 *   ?greet_state=away       指定状态（guest / first / away / normal，也可以写 游客 初来 久别 其余）
 *   ?greet_day=周六         强制取“周几”那一句（周一 … 周日）
 * 可以组合，例如 /?greet_state=guest&greet_slot=深夜
 */
function readDebug(): Debug | null {
  if (!["localhost", "127.0.0.1", "[::1]", "::1"].includes(location.hostname)) return null;
  const q = new URLSearchParams(location.search);
  const slot = q.get("greet_slot");
  const state = q.get("greet_state");
  const day = q.get("greet_day");
  const d: Debug = {
    slot: (SLOTS as readonly string[]).includes(slot ?? "") ? (slot as Slot) : undefined,
    state: state ? STATE_ALIASES[state] : undefined,
    day: (WEEKDAYS as readonly string[]).includes(day ?? "") ? (day as Weekday) : undefined,
  };
  return d.slot || d.state || d.day ? d : null;
}

export function Welcome() {
  const { me } = useMe();
  const isGuest = !me.role;
  const uid = me.member?.id;
  const key = isGuest || !uid ? "guest" : uid;
  const [text, setText] = useState<string | null>(() => chosen.get(key) ?? null);
  const [debugGuest, setDebugGuest] = useState(false);

  useEffect(() => {
    const debug = readDebug();
    if (!debug && chosen.has(key)) {
      setText(chosen.get(key) ?? null);
      return;
    }
    let alive = true;
    (async () => {
      const lastSeen = isGuest || !uid ? undefined : await visitOnce(uid);
      const now = new Date();
      const state = debug?.state ?? stateOf(isGuest, lastSeen, now.getTime());
      const line = pickGreeting({
        state,
        slot: debug?.slot ?? slotOf(now.getHours(), now.getMinutes()),
        weekday: debug?.day ?? WEEKDAYS[now.getDay()],
        forceWeekday: !!debug?.day,
        last: readLast(),
      });
      if (!alive) return;
      writeLast(line);
      if (!debug) chosen.set(key, line);
      setDebugGuest(state === "guest");
      setText(line);
    })();
    return () => {
      alive = false;
    };
  }, [key, isGuest, uid]);

  const name = isGuest || debugGuest ? GUEST_NAME : displayNameOf(me);
  return (
    <h1 className="welcome">
      {/* 文字由 React 输出，会自动转义，显示名里写 HTML 也只会原样显示 */}
      {text ? <span className="welcome-in">{formatGreeting(text, name)}</span> : " "}
    </h1>
  );
}

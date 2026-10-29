import data from "./greetings.json";

/**
 * 首页欢迎语怎么选一句。只有纯函数，不碰 DOM 和网络，方便测试。
 * 文案在 greetings.json 里，增删文案只改那个文件。
 *
 * 规则：
 *  1. 状态优先级：久别 > 初来 > 其余。游客不适用久别和初来。
 *     久别：距离上次访问超过 7 天；初来：从没访问过（lastSeenAt 为 null）。
 *  2. 其余情况：按浏览器本地时间取时段文案；另有约 25% 的概率改取“周几”文案里当天那一句。
 *  3. 同一台设备不连续出现同一句（上一句由调用方从 localStorage 读出来传进来）。
 */

export const SLOTS = ["清晨", "上午", "中午", "下午", "傍晚", "夜晚", "深夜"] as const;
export type Slot = (typeof SLOTS)[number];
export const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const; // 按 Date.getDay() 的顺序
export type Weekday = (typeof WEEKDAYS)[number];
export type GreetState = "guest" | "first" | "away" | "normal";

export const AWAY_MS = 7 * 86_400_000;
export const WEEKDAY_CHANCE = 0.25;
export const GUEST_NAME = "新朋友";

interface Copy {
  时段: Record<Slot, string[]>;
  周几: Record<Weekday, string[]>;
  初来: string[];
  久别: string[];
}
export const COPY = data as Copy;

/** 时段：清晨 5:00–8:00，上午 8:00–11:30，中午 11:30–14:00，下午 14:00–17:30，傍晚 17:30–19:30，夜晚 19:30–23:00，深夜 23:00–次日 5:00。 */
export function slotOf(hour: number, minute = 0): Slot {
  const m = hour * 60 + minute;
  if (m >= 5 * 60 && m < 8 * 60) return "清晨";
  if (m >= 8 * 60 && m < 11 * 60 + 30) return "上午";
  if (m >= 11 * 60 + 30 && m < 14 * 60) return "中午";
  if (m >= 14 * 60 && m < 17 * 60 + 30) return "下午";
  if (m >= 17 * 60 + 30 && m < 19 * 60 + 30) return "傍晚";
  if (m >= 19 * 60 + 30 && m < 23 * 60) return "夜晚";
  return "深夜";
}

/** lastSeenAt：游客传 undefined；登录了但从没来过是 null。 */
export function stateOf(isGuest: boolean, lastSeenAt: number | null | undefined, now: number): GreetState {
  if (isGuest) return "guest";
  if (lastSeenAt === null || lastSeenAt === undefined) return "first";
  if (now - lastSeenAt > AWAY_MS) return "away";
  return "normal";
}

/** 从一组里随机取一句，尽量不和上一句一样（只有一句时没得选）。 */
function draw(pool: string[], last: string | null, rand: () => number): string {
  const options = pool.length > 1 ? pool.filter((s) => s !== last) : pool;
  return options[Math.floor(rand() * options.length) % options.length];
}

export interface PickInput {
  state: GreetState;
  slot: Slot;
  weekday: Weekday;
  last: string | null;
  rand?: () => number;
  /** 调试用：强制取“周几”那一句 */
  forceWeekday?: boolean;
}

export function pickGreeting({ state, slot, weekday, last, rand = Math.random, forceWeekday }: PickInput): string {
  if (state === "away") return draw(COPY.久别, last, rand);
  if (state === "first") return draw(COPY.初来, last, rand);
  if (forceWeekday || rand() < WEEKDAY_CHANCE) {
    const day = COPY.周几[weekday].filter((s) => s !== last);
    if (day.length) return day[Math.floor(rand() * day.length) % day.length];
    // 当天那句刚出现过：退回时段文案
  }
  return draw(COPY.时段[slot], last, rand);
}

/** 拼成最终显示的一行：“文案，名字”。 */
export function formatGreeting(text: string, name: string): string {
  return `${text}，${name}`;
}

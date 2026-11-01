import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api, mutate, relativeTime, useApi } from "../api";
import { Icon } from "../icons";
import { Link, useQuery } from "../router";
import { loginHref, useMe, useRequireLogin } from "../session";
import { useToast } from "../ui";

/**
 * 蓝色钉子：在讲义的某一段（或某道练手题）上钉一个问题，大家在下面讨论。
 *
 * 做法照负责人的 Math-Teach-Job（PinBoard）：
 * - 内容块有固定的位置标记 data-anchor（讲义按“所在小标题 + 第几段”自动生成，练手题用题号），
 *   图钉存成“在这个块里的百分比坐标”，页面缩放、换行都不会错位；
 * - 另存这一段开头的文字，讲义改版后按它重新找位置（Hypothesis 的办法），找不到就收进“原文已变”；
 * - 图钉画在正文右侧的窄边栏里（不盖住字），尖头指向那一段；悬停或点开时把那一段高亮；
 * - 宽屏时点开的钉子显示在右栏，手机上从底部弹出；正文末尾列出本页所有钉子。
 */

export interface PinMessage {
  id: number;
  author: string;
  agent: boolean;
  mine: boolean;
  body: string;
  createdAt: number;
}

export interface Pin {
  id: string;
  course: string;
  item: string;
  page: string;
  anchorKey: string;
  anchorLabel: string | null;
  xPct: number;
  yPct: number;
  snippet: string | null;
  status: "open" | "resolved";
  createdAt: number;
  updatedAt: number;
  author: string;
  mine: boolean;
  answered: boolean;
  votes: number;
  voted: boolean;
  messages: PinMessage[];
}

interface Draft {
  anchorKey: string;
  anchorLabel: string | null;
  xPct: number;
  yPct: number;
  snippet: string | null;
}

interface Placed {
  key: string; // pin id 或 "draft"
  /** 图钉在右边栏里的高度（已避让重叠） */
  y: number;
  /** 所在内容块的上沿和高度，用来高亮“钉的是哪一段” */
  top: number;
  h: number;
}

/** 两颗图钉至少隔这么高，避免叠在一起 */
const PIN_GAP = 28;

// 讲义的块：顶层段落、代码、表格……列表按每一条算（讲义大多是列表）；练手题每题一块
const BLOCKS = "article > .prose > :not(ul):not(ol), article > .prose > ul > li, article > .prose > ol > li, li.practice";
const norm = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

/** 给内容块打上位置标记：小标题用它的 id，正文段落是“小标题/第几段”，练手题是“q:题号” */
function tagAnchors(root: HTMLElement) {
  let heading = "top";
  let headingText = "开头";
  let n = 0;
  let q = 0;
  for (const el of root.querySelectorAll<HTMLElement>(BLOCKS)) {
    if (el.matches("li.practice")) {
      q++;
      el.dataset.anchor = `q:${el.id.replace(/^q-/, "")}`;
      el.dataset.anchorLabel = `练手题 ${q}`;
      continue;
    }
    if (/^H[1-4]$/.test(el.tagName) && el.id) {
      heading = el.id;
      headingText = norm(el.textContent).replace(/^#\s*/, "").slice(0, 20) || "小标题";
      n = 0;
      el.dataset.anchor = heading;
      el.dataset.anchorLabel = headingText;
      continue;
    }
    n++;
    el.dataset.anchor = `${heading}/${n}`;
    el.dataset.anchorLabel = `${headingText} 第 ${n} 段`;
  }
}

/** 找钉子所在的块：先按位置标记，开头文字对不上时按文字重新找 */
function findBlock(root: HTMLElement, key: string, snippet: string | null): HTMLElement | null {
  let el: HTMLElement | null = null;
  try {
    el = root.querySelector<HTMLElement>(`[data-anchor="${CSS.escape(key)}"]`);
  } catch {
    el = null;
  }
  const head = norm(snippet).slice(0, 24);
  if (el && (!head || norm(el.textContent).startsWith(head.slice(0, 16)))) return el.getClientRects().length ? el : null;
  if (!head) return el;
  for (const b of root.querySelectorAll<HTMLElement>("[data-anchor]")) if (norm(b.textContent).includes(head)) return b;
  return null;
}

function useWide() {
  const q = "(min-width: 1180px)";
  const [wide, setWide] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

export function PinBoard({
  course,
  page,
  enabled,
  toolHost,
  panelHost,
  onPanel,
  children,
}: {
  course: string;
  page: string;
  /** 本机导入的课不能钉（别人看不到这门课） */
  enabled: boolean;
  toolHost: HTMLElement | null;
  panelHost: HTMLElement | null;
  /** 右栏有没有打开钉子面板（讲义页据此把右栏加宽） */
  onPanel?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const key = enabled ? `/api/pins?course=${encodeURIComponent(course)}&page=${encodeURIComponent(page)}` : null;
  const { data } = useApi<Pin[]>(key);
  const pins = data ?? [];
  const { me } = useMe();
  const needLogin = useRequireLogin();
  const toast = useToast();
  const wide = useWide();
  const focus = useQuery("pin");
  const board = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [orphans, setOrphans] = useState<string[]>([]);
  const [tick, setTick] = useState(0);

  const numbered = useMemo(() => new Map([...pins].sort((a, b) => a.createdAt - b.createdAt).map((p, i) => [p.id, i + 1])), [pins]);
  const setPins = useCallback((fn: (old: Pin[]) => Pin[]) => key && mutate<Pin[]>(key, (old) => fn(old ?? [])), [key]);
  const upsert = (p: Pin) => setPins((old) => (old.some((x) => x.id === p.id) ? old.map((x) => (x.id === p.id ? p : x)) : [...old, p]));

  /* 计算位置：内容是异步渲染的，变化时重新打标记、重新量 */
  useLayoutEffect(() => {
    void tick;
    const root = board.current;
    if (!root) return;
    tagAnchors(root);
    const b = root.getBoundingClientRect();
    const out: Placed[] = [];
    const lost: string[] = [];
    const place = (k: string, anchor: string, snippet: string | null, y: number) => {
      const el = findBlock(root, anchor, snippet);
      if (!el) return lost.push(k);
      const r = el.getBoundingClientRect();
      const top = r.top - b.top;
      // 只取点击的高度（横向位置照存，边栏里用不上）；不超过这一段
      out.push({ key: k, y: top + Math.min(r.height - 10, Math.max(12, y * r.height)), top, h: r.height });
    };
    for (const p of pins) place(p.id, p.anchorKey, p.snippet, p.yPct);
    if (draft) place("draft", draft.anchorKey, draft.snippet, draft.yPct);
    out.sort((p, q) => p.y - q.y);
    for (let i = 1; i < out.length; i++) out[i].y = Math.max(out[i].y, out[i - 1].y + PIN_GAP);
    setPlaced((prev) => (JSON.stringify(prev) === JSON.stringify(out) ? prev : out));
    setOrphans((prev) => (prev.join() === lost.join() ? prev : lost));
  });

  useEffect(() => {
    const root = board.current;
    if (!root) return;
    const bump = () => setTick((t) => t + 1);
    const ro = new ResizeObserver(bump);
    ro.observe(root);
    const mo = new MutationObserver(bump);
    mo.observe(root, { childList: true, subtree: true });
    window.addEventListener("resize", bump);
    document.fonts?.ready.then(bump).catch(() => {});
    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", bump);
    };
  }, []);

  /* 快捷键 Q 进入钉钉子模式，Esc 退出 */
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "Escape") {
        setMode(false);
        setActive(null);
      }
      if ((e.key === "q" || e.key === "Q") && !e.metaKey && !e.ctrlKey && !e.altKey && me.role) setMode((m) => !m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, me.role]);
  useEffect(() => {
    document.body.classList.toggle("pin-mode", mode);
    return () => document.body.classList.remove("pin-mode");
  }, [mode]);

  /* 从通知、后台列表跳过来：?pin=id */
  const focused = useRef(false);
  useEffect(() => {
    if (!focus || focused.current) return;
    const p = placed.find((x) => x.key === focus);
    if (!p || !board.current) return;
    focused.current = true;
    setActive(focus);
    const y = board.current.getBoundingClientRect().top + window.scrollY + p.y - window.innerHeight / 3;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  }, [focus, placed]);

  const panelOpen = !!active && (active === "draft" ? !!draft : pins.some((p) => p.id === active));
  useEffect(() => onPanel?.(panelOpen && wide), [panelOpen, wide, onPanel]);

  const onClickCapture = (e: React.MouseEvent) => {
    if (!mode) return;
    const root = board.current;
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-anchor]");
    if (!root || !el || !root.contains(el)) return;
    e.preventDefault();
    e.stopPropagation();
    const r = el.getBoundingClientRect();
    setDraft({
      anchorKey: el.dataset.anchor as string,
      anchorLabel: el.dataset.anchorLabel ?? null,
      xPct: Math.min(1, Math.max(0, (e.clientX - r.left) / Math.max(1, r.width))),
      yPct: Math.min(1, Math.max(0, (e.clientY - r.top) / Math.max(1, r.height))),
      snippet: norm(el.textContent).slice(0, 80) || null,
    });
    setMode(false);
    setActive("draft");
  };

  const startMode = () => {
    if (needLogin()) return;
    setMode((m) => !m);
  };

  const submitDraft = async (body: string) => {
    if (!draft) return;
    const pin = await api<Pin>("/api/pins", { body: { course, page, ...draft, body } });
    upsert(pin);
    setDraft(null);
    setActive(pin.id);
    toast("已经钉上了，管理员会收到通知");
  };

  const jump = (id: string) => {
    setActive(id);
    const p = placed.find((x) => x.key === id);
    if (p && board.current) {
      const y = board.current.getBoundingClientRect().top + window.scrollY + p.y - window.innerHeight / 3;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    }
  };

  const activePin = pins.find((p) => p.id === active);
  const lit = placed.find((p) => p.key === (hover ?? active));
  const panel =
    active === "draft" && draft ? (
      <DraftPanel
        number={pins.length + 1}
        label={draft.anchorLabel}
        snippet={draft.snippet}
        onCancel={() => {
          setDraft(null);
          setActive(null);
        }}
        onSubmit={submitDraft}
      />
    ) : activePin ? (
      <ThreadPanel
        pin={activePin}
        number={numbered.get(activePin.id) ?? 0}
        onClose={() => setActive(null)}
        onChange={upsert}
        onRemove={() => {
          setPins((old) => old.filter((p) => p.id !== activePin.id));
          setActive(null);
        }}
      />
    ) : null;

  if (!enabled) return <>{children}</>;

  return (
    <div className="pin-wrap">
      {toolHost &&
        createPortal(
          <button type="button" className={`btn btn-sm ${mode ? "btn-primary" : "btn-quiet"} pin-mode-btn`} aria-pressed={mode} onClick={startMode} title="快捷键 Q">
            <Icon name="pin" size={16} />
            {mode ? "点一下有问题的地方" : "钉一个问题"}
          </button>,
          toolHost,
        )}
      <div className="pin-board" ref={board} onClickCapture={onClickCapture}>
        {children}
        <div className="pin-layer">
          {lit && <div className="pin-target" style={{ top: lit.top, height: lit.h }} />}
          {placed.map((p) => {
            const pin = pins.find((x) => x.id === p.key);
            const n = p.key === "draft" ? pins.length + 1 : numbered.get(p.key);
            return (
              <button
                key={p.key}
                type="button"
                className={`pin-dot ${p.key === "draft" ? "draft" : pinState(pin)}${active === p.key ? " active" : ""}${(pin?.votes ?? 0) >= 2 ? " hot" : ""}`}
                style={{ top: p.y }}
                aria-label={`钉子 ${n}${pin?.anchorLabel ? `：${pin.anchorLabel}` : ""}`}
                onMouseEnter={() => setHover(p.key)}
                onMouseLeave={() => setHover(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  setActive(p.key);
                }}
              >
                <span>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <PinList pins={pins} numbered={numbered} orphans={orphans} active={active} onPick={jump} />

      {mode && (
        <div className="pin-hint">
          <Icon name="pin" size={16} />
          点一下你有问题的那一段 · Esc 取消
        </div>
      )}
      {panel && wide && panelHost && createPortal(<div className="pin-panel">{panel}</div>, panelHost)}
      {panel && !wide && (
        <>
          <div className="pin-sheet-backdrop" onClick={() => setActive(null)} />
          <div className="pin-sheet" role="dialog" aria-label="钉子">
            {panel}
          </div>
        </>
      )}
    </div>
  );
}

/** 正文末尾：本页的钉子 */
type PinState = "open" | "answered" | "resolved";
const pinState = (p: Pin | undefined): PinState => (p?.status === "resolved" ? "resolved" : p?.answered ? "answered" : "open");
const STATE_LABEL: Record<PinState, string> = { open: "等回复", answered: "有回复", resolved: "已解决" };

/** 静态的编号徽标（列表、讨论框标题里用） */
function PinBadge({ n, state }: { n: number | string | undefined; state: PinState | "draft" }) {
  return (
    <span className={`pin-badge ${state}`} aria-hidden="true">
      {n}
    </span>
  );
}

function StateChip({ state }: { state: PinState }) {
  return <span className={`pin-state ${state}`}>{STATE_LABEL[state]}</span>;
}

/** 被钉住的那段原文 */
function Quote({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <blockquote className="pin-quote">
      <span className="clamp-2">{text}</span>
    </blockquote>
  );
}

function Avatar({ name, agent }: { name: string; agent: boolean }) {
  return <span className={`pin-avatar${agent ? " agent" : ""}`}>{agent ? "AI" : [...name.trim()][0] ?? "?"}</span>;
}

function PinList({ pins, numbered, orphans, active, onPick }: { pins: Pin[]; numbered: Map<string, number>; orphans: string[]; active: string | null; onPick: (id: string) => void }) {
  if (!pins.length) return null;
  const sorted = [...pins].sort((a, b) => Number(a.status === "resolved") - Number(b.status === "resolved") || b.votes - a.votes || a.createdAt - b.createdAt);
  return (
    <section className="pin-list" aria-labelledby="pins-h">
      <div className="section-head">
        <h2 id="pins-h" className="h3">
          本页的钉子
        </h2>
        <span className="small sub num">{pins.length} 个</span>
      </div>
      <ul className="card card-flush">
        {sorted.map((p) => (
          <li key={p.id}>
            <button type="button" className={`pin-row${active === p.id ? " active" : ""}`} onClick={() => onPick(p.id)}>
              <PinBadge n={numbered.get(p.id)} state={pinState(p)} />
              <span className="pin-row-main">
                <span className="clamp-2">{p.messages[0]?.body}</span>
                <span className="small sub">
                  {p.anchorLabel ?? "这一页"}
                  {orphans.includes(p.id) && " · 原文已变"}
                  {p.messages.length > 1 && ` · ${p.messages.length - 1} 条回复`}
                  {p.votes > 0 && ` · ${p.votes} 人也想问`}
                </span>
              </span>
              <StateChip state={pinState(p)} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DraftPanel({
  number,
  label,
  snippet,
  onCancel,
  onSubmit,
}: {
  number: number;
  label: string | null;
  snippet: string | null;
  onCancel: () => void;
  onSubmit: (body: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return setError("写一句你的问题");
    setBusy(true);
    setError(null);
    try {
      await onSubmit(text.trim());
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };
  return (
    <form className="pin-thread" onSubmit={submit}>
      <header className="pin-thread-head">
        <PinBadge n={number} state="draft" />
        <span className="pin-thread-meta">
          <span className="pin-eyebrow">新钉子</span>
          <span className="pin-thread-title">{label ?? "这一页"}</span>
        </span>
        <button type="button" className="icon-btn" aria-label="取消" onClick={onCancel}>
          <Icon name="close" size={14} stroke={2} />
        </button>
      </header>
      <Quote text={snippet} />
      <div className="pin-compose">
        <textarea
          rows={4}
          autoFocus
          value={text}
          aria-label="你的问题"
          placeholder="哪一步没看懂？写一句就行，大家都能看到、都能回答"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit(e);
          }}
        />
        <div className="pin-compose-bar">
          <span className="small sub">Ctrl + Enter 发送</span>
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
            {busy ? "正在钉上…" : "钉在这里"}
          </button>
        </div>
      </div>
      {error && (
        <span className="small" role="alert" style={{ color: "var(--bad-ink)" }}>
          {error}
        </span>
      )}
    </form>
  );
}

function ThreadPanel({ pin, number, onClose, onChange, onRemove }: { pin: Pin; number: number; onClose: () => void; onChange: (p: Pin) => void; onRemove: () => void }) {
  const { me } = useMe();
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const ai = useApi<{ enabled: boolean }>("/api/ai/status");
  const isAdmin = !!me.isAdmin;
  const act = async (fn: () => Promise<Pin | void>) => {
    setBusy(true);
    try {
      const p = await fn();
      if (p) onChange(p);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    void act(async () => {
      const p = await api<Pin>(`/api/pins/${pin.id}/messages`, { body: { body: text.trim() } });
      setText("");
      return p;
    });
  };
  const askAi = async () => {
    setThinking(true);
    await act(() => api<Pin>(`/api/pins/${pin.id}/ai`, { body: {} }));
    setThinking(false);
  };
  const remove = () =>
    act(async () => {
      await api(`/api/pins/${pin.id}`, { method: "DELETE" });
      onRemove();
    });

  return (
    <div className="pin-thread">
      <header className="pin-thread-head">
        <PinBadge n={number} state={pinState(pin)} />
        <span className="pin-thread-meta">
          <span className="pin-eyebrow">
            钉子 {number} · <StateChip state={pinState(pin)} />
          </span>
          <span className="pin-thread-title">{pin.anchorLabel ?? "这一页"}</span>
        </span>
        <button type="button" className="icon-btn" aria-label="关闭" onClick={onClose}>
          <Icon name="close" size={14} stroke={2} />
        </button>
      </header>
      <Quote text={pin.snippet} />
      <ol className="pin-msgs">
        {pin.messages.map((m, i) => (
          <li key={m.id} className={`pin-msg${m.agent ? " agent" : ""}${i === 0 ? " first" : ""}`}>
            <Avatar name={m.author} agent={m.agent} />
            <div className="pin-msg-main">
              <span className="pin-msg-meta">
                <b>{m.author}</b>
                {i === 0 && <span className="pin-tag">提问</span>}
                <span className="sub">{relativeTime(m.createdAt)}</span>
              </span>
              <p className="pin-msg-body">{m.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="pin-actions">
        {me.role ? (
          <button type="button" className={`btn btn-sm ${pin.voted ? "btn-soft" : "btn-quiet"}`} disabled={busy} onClick={() => act(() => api<Pin>(`/api/pins/${pin.id}/vote`, { body: {} }))}>
            我也想问{pin.votes > 0 ? ` · ${pin.votes}` : ""}
          </button>
        ) : (
          pin.votes > 0 && <span className="sub">{pin.votes} 人也想问</span>
        )}
        {me.role && ai.data?.enabled && pin.status !== "resolved" && (
          <button type="button" className="btn btn-quiet btn-sm" disabled={busy} onClick={askAi}>
            {thinking ? "AI 正在想…" : "请 AI 回答"}
          </button>
        )}
        {(pin.mine || isAdmin) && (
          <button
            type="button"
            className="btn btn-quiet btn-sm"
            disabled={busy}
            onClick={() => act(() => api<Pin>(`/api/pins/${pin.id}/resolve`, { body: { resolved: pin.status !== "resolved" } }))}
          >
            {pin.status === "resolved" ? "重新打开" : "明白了，标成已解决"}
          </button>
        )}
        {((pin.mine && !pin.answered) || isAdmin) && (
          <button type="button" className="btn btn-quiet btn-sm" disabled={busy} onClick={remove}>
            {pin.mine && !pin.answered ? "撤回" : "删除"}
          </button>
        )}
      </div>
      {me.role ? (
        <form className="pin-compose" onSubmit={send}>
          <textarea
            rows={3}
            value={text}
            aria-label="回复"
            placeholder={pin.mine ? "补充一句，或者接着问" : "你知道答案？写下来"}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(e);
            }}
          />
          <div className="pin-compose-bar">
            <span className="small sub">Ctrl + Enter 发送</span>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !text.trim()}>
              回复
            </button>
          </div>
        </form>
      ) : (
        <Link to={loginHref(location.pathname + location.search)} className="btn btn-quiet btn-sm pin-login">
          登录后参与讨论
        </Link>
      )}
    </div>
  );
}

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import type { ApiError } from "./api";
import { Icon } from "./icons";

/* ---------- 分段选择：选中的胶囊滑过去 ---------- */

export function Seg<T extends string | number>({
  options,
  value,
  onChange,
  label,
  flat,
  className,
}: {
  options: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  flat?: boolean;
  className?: string;
}) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      role="group"
      aria-label={label}
      className={`seg${flat ? " seg-flat" : ""}${className ? ` ${className}` : ""}`}
      style={{ "--n": options.length, "--i": i } as React.CSSProperties}
    >
      <span className="seg-pill" aria-hidden="true" />
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- 加载、出错、空状态 ---------- */

export function Skeleton({ h = 20, w = "100%", r }: { h?: number | string; w?: number | string; r?: number }) {
  return <div className="sk" style={{ height: h, width: w, borderRadius: r }} aria-hidden="true" />;
}

export function SkeletonCards({ n = 3, h = 200 }: { n?: number; h?: number }) {
  return (
    <div className="grid-cards" aria-busy="true" aria-label="正在加载">
      {Array.from({ length: n }, (_, i) => (
        <Skeleton key={i} h={h} r={22} />
      ))}
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: ApiError | Error; onRetry?: () => void }) {
  return (
    <div className="error-box" role="alert">
      <span className="h3">没加载出来</span>
      <span className="small sub">{error.message}</span>
      {onRetry && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
          <Icon name="refresh" size={16} />
          再试一次
        </button>
      )}
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-title">{title}</span>
      {children && <span className="small pretty" style={{ maxWidth: 420 }}>{children}</span>}
      {action}
    </div>
  );
}

/* ---------- 进度 ---------- */

export function Bar({ ratio, label }: { ratio: number; label?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return (
    <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Ring({ ratio, size = 96, stroke = 9, label, children }: { ratio: number; size?: number; stroke?: number; label: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2 - 1;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, ratio));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(c * pct).toFixed(1)} ${c.toFixed(1)}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 520ms var(--ease)" }}
      />
      {children}
    </svg>
  );
}

/* ---------- 提示条 ---------- */

interface ToastItem {
  id: number;
  text: string;
  kind: "info" | "error";
  leaving?: boolean;
}
const ToastContext = createContext<(text: string, kind?: "info" | "error") => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const show = useCallback((text: string, kind: "info" | "error" = "info") => {
    const id = ++seq.current;
    setItems((xs) => [...xs.slice(-2), { id, text, kind }]);
    setTimeout(() => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, leaving: true } : x))), kind === "error" ? 4200 : 2800);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), kind === "error" ? 4400 : 3000);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast${t.kind === "error" ? " toast-error" : ""}${t.leaving ? " leaving" : ""}`} role={t.kind === "error" ? "alert" : "status"}>
            {t.kind === "info" && <Icon name="check" size={18} style={{ color: "var(--accent-text)" }} />}
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/* ---------- 对话框：桌面居中，手机从底部滑上来 ---------- */

export function Dialog({
  title,
  sub,
  onClose,
  children,
  wide,
  labelledBy,
}: {
  title: string;
  sub?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  labelledBy?: string;
}) {
  const [leaving, setLeaving] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    setLeaving(true);
    setTimeout(onClose, 200);
  }, [onClose]);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>("input, textarea, select, button:not([data-close])");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab" && ref.current) {
        const els = [...ref.current.querySelectorAll<HTMLElement>("a[href], button:not(:disabled), input, textarea, select")];
        if (!els.length) return;
        const [a, b] = [els[0], els[els.length - 1]];
        if (e.shiftKey && document.activeElement === a) (e.preventDefault(), b.focus());
        else if (!e.shiftKey && document.activeElement === b) (e.preventDefault(), a.focus());
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [close]);
  return (
    <div className={`scrim${leaving ? " leaving" : ""}`} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={ref} className={`dialog${wide ? " dialog-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy ?? id}>
        <div className="dialog-head">
          <div className="stack" style={{ gap: 4 }}>
            <h2 id={id} className="h2">
              {title}
            </h2>
            {sub && <div className="small sub">{sub}</div>}
          </div>
          <button type="button" className="icon-btn" data-close aria-label="关闭" onClick={close} style={{ border: 0, background: "var(--well)" }}>
            <Icon name="close" size={16} stroke={2} />
          </button>
        </div>
        <DialogCloseContext.Provider value={close}>{children}</DialogCloseContext.Provider>
      </div>
    </div>
  );
}

const DialogCloseContext = createContext<() => void>(() => {});
/** 在对话框里面调用：带退场动画地关掉。 */
export function useDialogClose() {
  return useContext(DialogCloseContext);
}

/* ---------- 确认框 ---------- */

interface ConfirmOpts {
  title: string;
  body?: React.ReactNode;
  ok?: string;
  danger?: boolean;
}
const ConfirmContext = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const ask = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setState({ ...o, resolve })), []);
  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {state && (
        <Dialog
          title={state.title}
          onClose={() => {
            state.resolve(false);
            setState(null);
          }}
        >
          <ConfirmBody
            state={state}
            done={(v) => {
              state.resolve(v);
              setState(null);
            }}
          />
        </Dialog>
      )}
    </ConfirmContext.Provider>
  );
}

function ConfirmBody({ state, done }: { state: ConfirmOpts; done: (v: boolean) => void }) {
  const close = useDialogClose();
  const [answered, setAnswered] = useState(false);
  return (
    <>
      {state.body && <div className="small sub pretty">{state.body}</div>}
      <div className="dialog-actions">
        <button type="button" className="btn btn-ghost" onClick={close}>
          取消
        </button>
        <button
          type="button"
          className={`btn ${state.danger ? "btn-danger" : "btn-primary"}`}
          disabled={answered}
          onClick={() => {
            setAnswered(true);
            done(true);
          }}
        >
          {state.ok ?? "确定"}
        </button>
      </div>
    </>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}

/* ---------- 小工具 ---------- */

/** 每 interval 毫秒刷新一次的“现在”。 */
export function useNow(interval = 30_000) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · HIANA 协会学习平台` : "HIANA 协会学习平台";
  }, [title]);
}

export function Spinner() {
  return <span className="spin" aria-hidden="true" />;
}

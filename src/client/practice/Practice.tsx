import { useEffect, useRef, useState } from "react";
import type { CodePractice, Practice } from "../../shared/package";
import { InlineMd, Prose } from "../components/Prose";
import { Icon } from "../icons";
import { Spinner } from "../ui";
import { type RunResult, isLoaded, runCode } from "./run";

/**
 * 练手题：选择、填空、代码。全部在浏览器里判，做对了调 onSolved（记一条学习记录）。
 * 草稿存在本机（localStorage），换页回来还在。
 */

const DRAFT_KEY = "hiana-practice-draft";
function readDraft(key: string): string | null {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}")[key] ?? null;
  } catch {
    return null;
  }
}
function saveDraft(key: string, v: string | null) {
  try {
    const all = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}");
    if (v === null) delete all[key];
    else all[key] = v;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(all));
  } catch {
    /* 存不了也没关系 */
  }
}

export const normalizeText = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

export function PracticeList({
  items,
  solved,
  onSolved,
  draftKey,
}: { items: Practice[]; solved: Set<string>; onSolved: (id: string) => void; draftKey: string }) {
  return (
    <ol className="practice-list">
      {items.map((q, i) => (
        <li key={q.id} className="practice" id={`q-${q.id}`}>
          <header className="practice-head">
            <span className="practice-no num">{i + 1}</span>
            <span className="practice-title">{q.title ?? (q.type === "choice" ? (Array.isArray(q.answer) ? "多选" : "单选") : q.type === "text" ? "填空" : LANG[q.lang])}</span>
            {solved.has(q.id) && (
              <span className="tag tag-ok">
                <Icon name="check" size={14} stroke={2.4} />
                做对过
              </span>
            )}
          </header>
          <Prose source={q.prompt} className="prose prose-tight" />
          {q.type === "choice" ? (
            <ChoiceQ q={q} onSolved={() => onSolved(q.id)} />
          ) : q.type === "text" ? (
            <TextQ q={q} onSolved={() => onSolved(q.id)} />
          ) : (
            <CodeQ q={q} onSolved={() => onSolved(q.id)} draftKey={`${draftKey}/${q.id}`} />
          )}
        </li>
      ))}
    </ol>
  );
}

const LANG: Record<CodePractice["lang"], string> = { python: "Python", sql: "SQL", javascript: "JavaScript" };

function Verdict({ ok, children }: { ok: boolean; children?: React.ReactNode }) {
  return (
    <div className={`verdict ${ok ? "is-ok" : "is-bad"}`} role="status">
      <strong>{ok ? "对了" : "还不对"}</strong>
      {children}
    </div>
  );
}

function ChoiceQ({ q, onSolved }: { q: Extract<Practice, { type: "choice" }>; onSolved: () => void }) {
  const multi = Array.isArray(q.answer);
  const answer = new Set(Array.isArray(q.answer) ? q.answer : [q.answer]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState<boolean | null>(null);
  const pick = (i: number) => {
    setChecked(null);
    setPicked((p) => {
      const n = new Set(multi ? p : []);
      if (multi && p.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  };
  const check = () => {
    const ok = picked.size === answer.size && [...picked].every((i) => answer.has(i));
    setChecked(ok);
    if (ok) onSolved();
  };
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="options" role={multi ? "group" : "radiogroup"}>
        {q.options.map((o, i) => {
          const on = picked.has(i);
          const reveal = checked !== null && on;
          return (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: 选项没有 id
              key={i}
              type="button"
              role={multi ? "checkbox" : "radio"}
              aria-checked={on}
              className={`option${on ? " is-on" : ""}${reveal ? (answer.has(i) ? " is-right" : " is-wrong") : ""}`}
              onClick={() => pick(i)}
            >
              <span className="option-mark num" aria-hidden="true">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="option-text">
                <InlineMd text={o} />
              </span>
            </button>
          );
        })}
      </div>
      <div className="row wrap" style={{ gap: 12 }}>
        <button type="button" className="btn btn-primary" disabled={picked.size === 0} onClick={check}>
          检查
        </button>
        {multi && <span className="small sub">多选</span>}
      </div>
      {checked !== null && (
        <Verdict ok={checked}>{checked && q.explain && <Prose source={q.explain} className="prose prose-tight" />}</Verdict>
      )}
    </div>
  );
}

function TextQ({ q, onSolved }: { q: Extract<Practice, { type: "text" }>; onSolved: () => void }) {
  const [v, setV] = useState("");
  const [checked, setChecked] = useState<boolean | null>(null);
  const [shown, setShown] = useState(false);
  const check = () => {
    const ok = q.answer.some((a) => normalizeText(a) === normalizeText(v));
    setChecked(ok);
    if (ok) onSolved();
  };
  return (
    <div className="stack" style={{ gap: 12 }}>
      <form
        className="row wrap"
        style={{ gap: 8 }}
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
      >
        <input
          className="input mono grow"
          value={v}
          onChange={(e) => {
            setV(e.target.value);
            setChecked(null);
          }}
          aria-label="你的答案"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className="btn btn-primary" disabled={!v.trim()}>
          检查
        </button>
      </form>
      {checked !== null && (
        <Verdict ok={checked}>
          {checked && q.explain && <Prose source={q.explain} className="prose prose-tight" />}
          {!checked && !shown && (
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setShown(true)}>
              看答案
            </button>
          )}
          {!checked && shown && (
            <span className="mono">
              {q.answer.join(" / ")}
            </span>
          )}
        </Verdict>
      )}
    </div>
  );
}

function CodeQ({ q, onSolved, draftKey }: { q: CodePractice; onSolved: () => void; draftKey: string }) {
  const [code, setCode] = useState(() => readDraft(draftKey) ?? q.starter);
  const [busy, setBusy] = useState<null | "loading" | "running">(null);
  const [res, setRes] = useState<RunResult | null>(null);
  const [hint, setHint] = useState(false);
  const [solution, setSolution] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = setTimeout(() => saveDraft(draftKey, code === q.starter ? null : code), 400);
    return () => clearTimeout(t);
  }, [code, draftKey, q.starter]);

  const run = async () => {
    setBusy(isLoaded(q.lang) ? "running" : "loading");
    setRes(null);
    const r = await runCode(q, code, () => setBusy("running"));
    setBusy(null);
    setRes(r);
    if (r.ok) onSolved();
  };

  // Tab 缩进，Ctrl/⌘ + Enter 运行
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!busy) void run();
      return;
    }
    if (e.key !== "Tab" || e.shiftKey) return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: s, selectionEnd: end } = el;
    const next = `${code.slice(0, s)}    ${code.slice(end)}`;
    setCode(next);
    requestAnimationFrame(() => el.setSelectionRange(s + 4, s + 4));
  };

  const lines = Math.min(24, Math.max(6, code.split("\n").length + 1));
  return (
    <div className="stack" style={{ gap: 12 }}>
      {q.lang === "sql" && q.setup && (
        <details className="disclosure">
          <summary>数据表（建表语句）</summary>
          <pre className="code">
            <code>{q.setup.length > 6000 ? `${q.setup.slice(0, 6000)}\n…` : q.setup}</code>
          </pre>
        </details>
      )}
      <div className="editor">
        <div className="editor-bar">
          <span>{LANG[q.lang]}</span>
          <span className="grow" />
          <button
            type="button"
            className="btn btn-quiet btn-sm"
            onClick={() => {
              setCode(q.starter);
              ta.current?.focus();
            }}
            disabled={code === q.starter}
          >
            还原
          </button>
        </div>
        <textarea
          ref={ta}
          className="editor-input mono"
          value={code}
          rows={lines}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={onKey}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-label={`${LANG[q.lang]} 代码`}
        />
      </div>
      <div className="row wrap" style={{ gap: 8 }}>
        <button type="button" className="btn btn-primary" onClick={run} disabled={!!busy}>
          {busy ? <Spinner /> : <Icon name="play" size={16} stroke={2.2} />}
          {busy === "loading" ? "加载运行环境…" : busy === "running" ? "运行中…" : "运行测试"}
        </button>
        {q.hint && (
          <button type="button" className="btn btn-quiet" onClick={() => setHint((x) => !x)} aria-expanded={hint}>
            提示
          </button>
        )}
        {q.solution && res && !res.ok && (
          <button type="button" className="btn btn-quiet" onClick={() => setSolution((x) => !x)} aria-expanded={solution}>
            参考答案
          </button>
        )}
        <span className="small sub hide-sm">Ctrl + Enter 运行</span>
      </div>
      {busy === "loading" && <p className="small sub">第一次运行要下载 {q.lang === "python" ? "Python（约 10MB）" : q.lang === "sql" ? "SQLite（约 1MB）" : ""}，之后就快了。</p>}
      {hint && q.hint && <Prose source={q.hint} className="prose prose-tight callout" />}
      {res && <Results r={res} />}
      {solution && q.solution && (
        <pre className="code">
          <code>{q.solution}</code>
        </pre>
      )}
      {res?.ok && q.explain && <Prose source={q.explain} className="prose prose-tight" />}
    </div>
  );
}

function Results({ r }: { r: RunResult }) {
  if (r.error) return <div className="verdict is-bad" role="status"><strong>没跑起来</strong><span>{r.error}</span></div>;
  const passed = r.results.filter((x) => x.ok).length;
  const firstBad = r.results.find((x) => !x.ok);
  return (
    <div className={`verdict ${r.ok ? "is-ok" : "is-bad"}`} role="status">
      <strong className="num">
        {r.ok ? "全部通过" : `通过 ${passed} / ${r.results.length}`}
      </strong>
      <ul className="test-list">
        {r.results.map((t) => (
          <li key={t.name} className={t.ok ? "is-ok" : "is-bad"}>
            <Icon name={t.ok ? "check" : "close"} size={14} stroke={2.4} />
            {t.name}
          </li>
        ))}
      </ul>
      {firstBad && (
        <div className="diff">
          {firstBad.error && (
            <div>
              <span className="small sub">错误</span>
              <pre className="code"><code>{firstBad.error}</code></pre>
            </div>
          )}
          <div>
            <span className="small sub">应该输出</span>
            <pre className="code"><code>{firstBad.want || "（空）"}</code></pre>
          </div>
          <div>
            <span className="small sub">实际输出</span>
            <pre className="code"><code>{firstBad.got || "（空）"}</code></pre>
          </div>
        </div>
      )}
    </div>
  );
}

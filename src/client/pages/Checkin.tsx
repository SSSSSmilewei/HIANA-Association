import { useState } from "react";
import type { CheckinResponse, CheckinState } from "../../shared/api";
import { api, useApi } from "../api";
import { Link } from "../router";
import { ErrorView, Loading } from "../components/Layout";

function clock(ms: number) {
  return new Date(ms + 8 * 3_600_000).toISOString().slice(11, 16);
}

export function CheckinPage() {
  const { data, error, reload } = useApi<CheckinState>("/api/checkin");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorView message={error.message} />;
  if (!data) return <Loading />;

  const submit = async (value: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await api<CheckinResponse>("/api/checkin", { body: { code: value || undefined } });
      reload();
    } catch (e) {
      setMsg((e as Error).message);
      setCode("");
    } finally {
      setBusy(false);
    }
  };
  const press = (d: string) => {
    if (busy) return;
    const next = (code + d).slice(0, 4);
    setCode(next);
    setMsg(null);
    if (next.length === 4) submit(next);
  };

  if (data.checkedAt)
    return (
      <main className="wrap page-pad checkin">
        <div className="done-mark" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <h1 className="page-title">已打卡，{clock(data.checkedAt)}</h1>
        <p>今晚的到场记录已经交给会长，也会出现在你的热力图上。这是你第 {data.total} 次晚自习打卡。</p>
        <div className="stack-s" style={{ marginTop: 24 }}>
          <Link to="/" className="btn btn-ink">
            回到首页，继续这周的主线
          </Link>
          <Link to="/heatmap" className="btn btn-outline">
            看我的热力图
          </Link>
        </div>
      </main>
    );

  const [from, to] = data.window.split("-");
  return (
    <main className="wrap page-pad checkin">
      <h1 className="page-title">晚自习打卡</h1>
      <p className="muted">
        今天 {data.today}，打卡时间 {from} 到 {to}。{data.requireCode ? "输入会长在现场屏幕上展示的 4 位口令。" : ""}
      </p>
      {data.requireCode ? (
        <>
          <div className="code-slots" aria-live="polite" aria-label={`已输入 ${code.length} 位`}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={i === code.length ? "cur" : code[i] ? "fill" : ""}>
                {code[i] ?? ""}
              </span>
            ))}
          </div>
          <p className="error-text" style={{ minHeight: 24 }}>
            {msg}
          </p>
          <div className="keypad" role="group" aria-label="数字键盘">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button key={d} type="button" onClick={() => press(d)} aria-label={`数字 ${d}`}>
                {d}
              </button>
            ))}
            <button type="button" className="aux" onClick={() => setCode("")}>
              清空
            </button>
            <button type="button" onClick={() => press("0")} aria-label="数字 0">
              0
            </button>
            <button type="button" className="aux" onClick={() => setCode(code.slice(0, -1))} aria-label="删除一位">
              删除
            </button>
          </div>
        </>
      ) : (
        <>
          <button type="button" className="btn btn-red btn-lg" disabled={busy} onClick={() => submit("")} style={{ marginTop: 24 }}>
            {busy ? "正在打卡…" : "打卡"}
          </button>
          {msg && <p className="error-text">{msg}</p>}
        </>
      )}
    </main>
  );
}

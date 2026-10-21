import { useEffect, useState } from "react";
import type { Me } from "../../shared/api";
import { api } from "../api";
import { navigate } from "../router";

export function StudentLogin({ initialCode, onLogin }: { initialCode?: string; onLogin: (me: Me) => void }) {
  const [mode, setMode] = useState<"password" | "activate">(initialCode ? "activate" : "password");
  const [studentNo, setStudentNo] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState(initialCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (path: string, body: unknown, after: string) => {
    setBusy(true);
    setError(null);
    try {
      const me = await api<Me>(path, { body });
      onLogin(me);
      navigate(after, { replace: true });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  useEffect(() => {
    if (initialCode) run("/api/auth/activate", { code: initialCode }, "/password");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="login">
      <h1>智慧网络算法协会</h1>
      <p className="muted" style={{ marginTop: 8 }}>
        学习平台。用学号和自己设的密码登录。
      </p>
      <div className="seg" role="tablist" aria-label="登录方式">
        <button type="button" role="tab" aria-selected={mode === "password"} onClick={() => (setMode("password"), setError(null))}>
          学号登录
        </button>
        <button type="button" role="tab" aria-selected={mode === "activate"} onClick={() => (setMode("activate"), setError(null))}>
          第一次使用
        </button>
      </div>
      {mode === "password" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run("/api/auth/member", { studentNo, password }, "/");
          }}
        >
          <label className="field" htmlFor="login-no">
            学号
            <input id="login-no" className="input" value={studentNo} onChange={(e) => setStudentNo(e.target.value)} autoFocus autoComplete="username" inputMode="numeric" />
          </label>
          <label className="field" htmlFor="login-pw">
            密码
            <input id="login-pw" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          {error && <span className="error-text">{error}</span>}
          <button className="btn btn-ink" type="submit" disabled={busy || !studentNo.trim() || !password}>
            {busy ? "正在登录…" : "登录"}
          </button>
          <p className="xsmall muted">忘了密码就找会长重置，会长会给你一个新口令，用它重新激活账号。</p>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run("/api/auth/activate", { code }, "/password");
          }}
        >
          <label className="field" htmlFor="login-code">
            会长发给你的口令
            <input id="login-code" className="input" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" placeholder="例如 abcd-efgh-jkmn" />
          </label>
          {error && <span className="error-text">{error}</span>}
          <button className="btn btn-ink" type="submit" disabled={busy || code.trim().length < 4}>
            {busy ? "正在激活…" : "激活账号"}
          </button>
          <p className="xsmall muted">口令只能用一次。激活后马上设置你自己的密码，以后就用学号和密码登录。</p>
        </form>
      )}
    </main>
  );
}

/** 设置密码（激活后必经）或修改密码（已有密码时要先输当前密码）。 */
export function PasswordPage({ me, onDone }: { me: Me; onDone: () => void }) {
  const first = !!me.needsPassword;
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== password;

  if (done)
    return (
      <main className="login">
        <h1>{first ? "账号已激活" : "密码已修改"}</h1>
        <p style={{ marginTop: 12 }}>以后用学号 {me.member?.studentNo} 和这个密码登录，换手机、换电脑都可以。</p>
        <button className="btn btn-ink" type="button" style={{ marginTop: 24 }} onClick={() => (onDone(), navigate("/", { replace: true }))}>
          进入学习平台
        </button>
      </main>
    );

  return (
    <main className="login">
      <h1>{first ? "设置你的密码" : "修改密码"}</h1>
      <p className="muted" style={{ marginTop: 8 }}>
        {first ? `${me.member?.name ?? ""}，口令已经用掉了。设一个自己的密码，以后用学号和密码登录。` : "先输当前密码，再把新密码输两次。"}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await api("/api/auth/password", { body: { password, confirm, current: first ? undefined : current } });
            setDone(true);
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <input type="text" autoComplete="username" value={me.member?.studentNo ?? ""} readOnly hidden />
        {!first && (
          <label className="field" htmlFor="pw-current">
            当前密码
            <input id="pw-current" className="input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          </label>
        )}
        <label className="field" htmlFor="pw-new">
          新密码
          <input id="pw-new" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
          <span className="xsmall muted">至少 8 个字符，不能和学号一样。</span>
        </label>
        <label className="field" htmlFor="pw-confirm">
          再输一次新密码
          <input id="pw-confirm" className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          {mismatch && <span className="error-text xsmall">两次输入的不一样</span>}
        </label>
        {error && <span className="error-text">{error}</span>}
        <button className="btn btn-ink" type="submit" disabled={busy || password.length < 8 || confirm !== password || (!first && !current)}>
          {busy ? "正在保存…" : first ? "设置密码并进入" : "保存新密码"}
        </button>
        {!first && (
          <button className="link-btn muted" type="button" onClick={() => navigate("/")}>
            取消
          </button>
        )}
      </form>
    </main>
  );
}

export function AdminLogin({ onLogin }: { onLogin: (me: Me) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <main className="login">
      <h1>会长后台</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            const me = await api<Me>("/api/auth/admin", { body: { password } });
            onLogin(me);
            navigate("/admin", { replace: true });
          } catch (err) {
            setError((err as Error).message);
            setBusy(false);
          }
        }}
      >
        <label className="field">
          密码
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus autoComplete="current-password" />
        </label>
        {error && <span className="error-text">{error}</span>}
        <button className="btn btn-ink" type="submit" disabled={busy || !password}>
          登录
        </button>
      </form>
    </main>
  );
}

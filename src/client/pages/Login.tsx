import { useEffect, useState } from "react";
import { api, clearCache } from "../api";
import { BrandMark } from "../components/Shell";
import { navigate } from "../router";
import type { Me } from "../types";
import { Seg, Spinner, useTitle } from "../ui";

/** 登录页背后的装饰墙：固定的伪随机图案，右边（最近）更密一些。 */
function DecorWall() {
  const cols = 40;
  const rows = 18;
  return (
    <div className="wall" aria-hidden="true">
      {Array.from({ length: cols * rows }, (_, i) => {
        const w = Math.floor(i / rows);
        const v = ((i * 2654435761) % 1000) / 1000 + (w / cols) * 0.5 - 0.35;
        const lv = v < 0.2 ? 0 : v < 0.42 ? 1 : v < 0.62 ? 2 : v < 0.82 ? 3 : 4;
        return <i key={i} className={`l${lv}`} style={{ "--c": w } as React.CSSProperties} />;
      })}
    </div>
  );
}

function LoginFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="login">
      <DecorWall />
      <div className="login-card glass">
        <div className="row" style={{ gap: 12 }}>
          <BrandMark />
          <span className="stack" style={{ gap: 0 }}>
            <span className="brand-name">HIANA</span>
            <span className="brand-sub">智慧网络算法协会 · 学习平台</span>
          </span>
        </div>
        {children}
      </div>
    </main>
  );
}

type LoginMode = "password" | "activate" | "admin";

export function LoginPage({ initialCode, initialMode, onLogin }: { initialCode?: string; initialMode?: LoginMode; onLogin: (me: Me) => void }) {
  useTitle(initialMode === "admin" ? "会长登录" : "登录");
  const [mode, setMode] = useState<LoginMode>(initialCode ? "activate" : (initialMode ?? "password"));
  const [adminPassword, setAdminPassword] = useState("");
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
      clearCache();
      onLogin(me);
      navigate(after, { replace: true });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  useEffect(() => {
    if (initialCode) void run("/api/auth/activate", { code: initialCode }, "/password");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LoginFrame>
      <Seg
        label="登录方式"
        flat
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError(null);
        }}
        options={[
          { value: "password", label: "学号登录" },
          { value: "activate", label: "第一次使用" },
          { value: "admin", label: "会长" },
        ]}
      />
      {mode === "admin" ? (
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            void run("/api/auth/admin", { password: adminPassword }, "/admin");
          }}
        >
          <label className="field">
            后台密码
            <input className="input" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} autoFocus autoComplete="current-password" />
          </label>
          {error && (
            <span className="error-text" role="alert">
              {error}
            </span>
          )}
          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy || !adminPassword}>
            {busy ? <Spinner /> : "进入后台"}
          </button>
          <p className="xsmall sub pretty">用后台密码进管理后台：管成员、发口令、开签到、发公告。如果你在「成员」里把自己的账号设成了管理员，也可以直接用学号登录，学习和管理在一个账号里。</p>
        </form>
      ) : mode === "password" ? (
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            void run("/api/auth/member", { studentNo, password }, "/");
          }}
        >
          <label className="field">
            学号
            <input className="input" value={studentNo} onChange={(e) => setStudentNo(e.target.value)} autoFocus autoComplete="username" inputMode="numeric" />
          </label>
          <label className="field">
            密码
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          {error && (
            <span className="error-text" role="alert">
              {error}
            </span>
          )}
          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy || !studentNo.trim() || !password}>
            {busy ? <Spinner /> : "登录"}
          </button>
          <p className="xsmall sub pretty">忘了密码就找会长重置，会给你一个新口令，用它重新激活账号。</p>
        </form>
      ) : (
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            void run("/api/auth/activate", { code }, "/password");
          }}
        >
          <label className="field">
            会长发给你的口令
            <input className="input mono" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" autoFocus placeholder="例如 abcd-efgh-jkmn" />
          </label>
          {error && (
            <span className="error-text" role="alert">
              {error}
            </span>
          )}
          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy || code.trim().length < 4}>
            {busy ? <Spinner /> : "激活账号"}
          </button>
          <p className="xsmall sub pretty">口令只能用一次。激活后马上设一个自己的密码，以后用学号和密码登录。</p>
        </form>
      )}
    </LoginFrame>
  );
}

/** 设置密码（激活后必经）或修改密码（已经有密码时要先输当前密码）。 */
export function PasswordPage({ me, onDone }: { me: Me; onDone: () => void }) {
  const first = !!me.needsPassword;
  useTitle(first ? "设置密码" : "修改密码");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== password;

  if (done)
    return (
      <LoginFrame>
        <div className="stack" style={{ gap: 6 }}>
          <h1 className="h2">{first ? "账号已激活" : "密码已修改"}</h1>
          <p className="small sub">以后用学号 {me.member?.studentNo} 和这个密码登录，换手机、换电脑都可以。</p>
        </div>
        <button
          className="btn btn-primary btn-lg btn-block"
          type="button"
          onClick={() => {
            onDone();
            navigate("/", { replace: true });
          }}
        >
          进入学习平台
        </button>
      </LoginFrame>
    );

  return (
    <LoginFrame>
      <div className="stack" style={{ gap: 6 }}>
        <h1 className="h2">{first ? "设置你的密码" : "修改密码"}</h1>
        <p className="small sub pretty">
          {first ? `${me.member?.name ?? ""}，口令已经用掉了。设一个自己的密码，以后用学号和密码登录。` : "先输当前密码，再把新密码输两次。"}
        </p>
      </div>
      <form
        className="form"
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
          <label className="field">
            当前密码
            <input className="input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" autoFocus />
          </label>
        )}
        <label className="field">
          新密码
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus={first} />
          <span className="hint xsmall">至少 8 个字符，不能和学号一样。</span>
        </label>
        <label className="field">
          再输一次新密码
          <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          {mismatch && <span className="error-text xsmall">两次输入的不一样</span>}
        </label>
        {error && (
          <span className="error-text" role="alert">
            {error}
          </span>
        )}
        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy || password.length < 8 || confirm !== password || (!first && !current)}>
          {busy ? <Spinner /> : first ? "设置密码并进入" : "保存新密码"}
        </button>
        {!first && (
          <button className="btn btn-quiet btn-block" type="button" onClick={() => history.back()}>
            取消
          </button>
        )}
      </form>
    </LoginFrame>
  );
}

import { useState } from "react";
import { api, clearCache, useApi } from "../api";
import { markOnboarding } from "../components/Onboarding";
import { BrandMark } from "../components/Shell";
import { Link, navigate, useLocation } from "../router";
import { safeNext } from "../session";
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

function LoginFrame({ children, back }: { children: React.ReactNode; back?: string }) {
  return (
    <main className="login">
      <DecorWall />
      <div className="login-card glass">
        <div className="row" style={{ gap: 12 }}>
          <BrandMark />
          <span className="stack" style={{ gap: 0 }}>
            <span className="brand-name">海纳协会</span>
            <span className="brand-sub">智慧网络算法协会 · 学习平台</span>
          </span>
        </div>
        {children}
        {back && (
          <Link to={back} className="btn btn-quiet btn-block">
            游客浏览
          </Link>
        )}
      </div>
    </main>
  );
}

type LoginMode = "login" | "register" | "reset";
type Kind = "campus" | "external";

/** 学号：9 位数字（和后端 STUDENT_NO_RE 一致；登录时不检查，兼容以前录入的账号） */
const STUDENT_NO_RE = /^\d{9}$/;
/** 校外账号的用户名（和后端 USERNAME_RE 一致） */
const USERNAME_RE = /^[a-z][a-z0-9_-]{2,19}$/;

function ErrorText({ error }: { error: string | null }) {
  return error ? (
    <span className="error-text" role="alert">
      {error}
    </span>
  ) : null;
}

/**
 * 登录页：登录、用邀请码注册（校内 / 校外）、用重置码找回密码。
 * 地址参数：mode=register|reset，invite=邀请码（管理员可以发注册链接），kind=external（校外注册链接），code=重置码，next=登录后回到哪里。
 */
export function LoginPage({ onLogin }: { onLogin: (me: Me) => void }) {
  const { search } = useLocation();
  const q = new URLSearchParams(search);
  const initial = q.get("mode");
  const [mode, setMode] = useState<LoginMode>(initial === "register" || initial === "reset" ? initial : q.get("invite") ? "register" : "login");
  useTitle(mode === "register" ? "注册" : mode === "reset" ? "找回密码" : "登录");
  const options = useApi<{ registrationOpen: boolean }>("/api/auth/options");
  const [kind, setKind] = useState<Kind>(q.get("kind") === "external" ? "external" : "campus");
  const [account, setAccount] = useState("");
  const [studentNo, setStudentNo] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [invite, setInvite] = useState(q.get("invite") ?? "");
  const [code, setCode] = useState(q.get("code") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== password;
  const badNo = studentNo.length > 0 && !STUDENT_NO_RE.test(studentNo.trim());
  const uname = username.trim().toLowerCase();
  const badUser = uname.length > 0 && !USERNAME_RE.test(uname);
  const closed = options.data?.registrationOpen === false;

  const switchMode = (m: LoginMode) => {
    setMode(m);
    setError(null);
  };

  const run = async (path: string, body: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const me = await api<Me>(path, { body });
      clearCache();
      if (path === "/api/auth/register" && me.member) markOnboarding(me.member.id);
      onLogin(me);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const accountField = (
    <label className="field">
      账号
      <input className="input" value={account} onChange={(e) => setAccount(e.target.value)} autoFocus autoComplete="username" maxLength={100} autoCapitalize="off" spellCheck={false} />
      <span className="hint xsmall">校内填学号，校外填用户名或邮箱</span>
    </label>
  );
  const registerFields =
    kind === "campus" ? (
      <>
        <label className="field">
          学号
          <input
            className="input"
            value={studentNo}
            onChange={(e) => setStudentNo(e.target.value)}
            autoComplete="username"
            inputMode="numeric"
            maxLength={9}
            aria-invalid={badNo || undefined}
          />
          {badNo && <span className="error-text xsmall">学号为 9 位数字</span>}
        </label>
        <label className="field">
          姓名
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={20} />
          <span className="hint xsmall">真实姓名</span>
        </label>
      </>
    ) : (
      <>
        <label className="field">
          用户名
          <input
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            maxLength={20}
            autoCapitalize="off"
            spellCheck={false}
            aria-invalid={badUser || undefined}
          />
          <span className={badUser ? "error-text xsmall" : "hint xsmall"}>3–20 位，小写字母开头，可用小写字母、数字、_ 和 -</span>
        </label>
        <label className="field">
          昵称
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="nickname" maxLength={20} />
        </label>
        <label className="field">
          邮箱（选填）
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={100} />
          <span className="hint xsmall">也可以用邮箱登录</span>
        </label>
        <label className="field">
          学校 / 单位（选填）
          <input className="input" value={org} onChange={(e) => setOrg(e.target.value)} autoComplete="organization" maxLength={40} />
        </label>
      </>
    );
  const newPasswordFields = (
    <>
      <label className="field">
        {mode === "reset" ? "新密码" : "密码"}
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        <span className="hint xsmall">至少 8 个字符，不能和账号相同。</span>
      </label>
      <label className="field">
        确认密码
        <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        {mismatch && <span className="error-text xsmall">两次输入不一致</span>}
      </label>
    </>
  );
  const pwReady = password.length >= 8 && confirm === password;

  return (
    <LoginFrame back={safeNext(q.get("next"))}>
      {mode === "reset" ? (
        <h1 className="h2">重置密码</h1>
      ) : (
        <Seg
          label="登录方式"
          flat
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError(null);
          }}
          options={[
            { value: "login" as const, label: "登录" },
            { value: "register" as const, label: "注册" },
          ]}
        />
      )}
      {mode === "login" ? (
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            void run("/api/auth/member", { account: account.trim(), password });
          }}
        >
          {accountField}
          <label className="field">
            密码
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          <ErrorText error={error} />
          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy || !account.trim() || !password}>
            {busy ? <Spinner /> : "登录"}
          </button>
          <button type="button" className="btn btn-quiet btn-sm" style={{ alignSelf: "center" }} onClick={() => switchMode("reset")}>
            忘记密码？
          </button>
        </form>
      ) : mode === "register" ? (
        closed ? (
          <p className="small sub">当前未开放注册。</p>
        ) : (
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                "/api/auth/register",
                kind === "campus"
                  ? { kind, studentNo: studentNo.trim(), name, password, confirm, invite: invite.trim() }
                  : { kind, username: uname, email: email.trim(), org: org.trim(), name, password, confirm, invite: invite.trim() },
              );
            }}
          >
            <Seg
              label="账号类型"
              value={kind}
              onChange={(k) => {
                setKind(k);
                setError(null);
              }}
              options={[
                { value: "campus" as const, label: "校内" },
                { value: "external" as const, label: "校外" },
              ]}
            />
            <label className="field">
              邀请码
              <input className="input mono" value={invite} onChange={(e) => setInvite(e.target.value)} autoComplete="off" placeholder="xxxx-xxxx-xxxx" />
              <span className="hint xsmall">{kind === "campus" ? "本校同学，用学号注册" : "外校同学和老师，用用户名注册"}</span>
            </label>
            {registerFields}
            {newPasswordFields}
            <ErrorText error={error} />
            <button
              className="btn btn-primary btn-lg btn-block"
              type="submit"
              disabled={busy || (kind === "campus" ? !STUDENT_NO_RE.test(studentNo.trim()) : !USERNAME_RE.test(uname)) || !name.trim() || !invite.trim() || !pwReady}
            >
              {busy ? <Spinner /> : "注册并登录"}
            </button>
          </form>
        )
      ) : (
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            void run("/api/auth/reset", { account: account.trim(), code: code.trim(), password, confirm });
          }}
        >
          <p className="small sub">请输入管理员提供的重置码。</p>
          {accountField}
          <label className="field">
            重置码
            <input className="input mono" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" placeholder="xxxx-xxxx-xxxx" />
          </label>
          {newPasswordFields}
          <ErrorText error={error} />
          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy || !account.trim() || code.trim().length < 4 || !pwReady}>
            {busy ? <Spinner /> : "重置并登录"}
          </button>
          <button type="button" className="btn btn-quiet btn-sm" style={{ alignSelf: "center" }} onClick={() => switchMode("login")}>
            返回登录
          </button>
        </form>
      )}
    </LoginFrame>
  );
}

/** 修改密码：先输当前密码。改完后其他设备上的登录会失效。 */
export function PasswordPage({ me }: { me: Me }) {
  useTitle("修改密码");
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
          <h1 className="h2">密码已修改</h1>
          <p className="small sub">其他设备已退出登录</p>
        </div>
        <button className="btn btn-primary btn-lg btn-block" type="button" onClick={() => navigate("/me", { replace: true })}>
          回到“我的”
        </button>
      </LoginFrame>
    );

  return (
    <LoginFrame>
      <div className="stack" style={{ gap: 6 }}>
        <h1 className="h2">修改密码</h1>
      </div>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await api("/api/auth/password", { body: { password, confirm, current } });
            setDone(true);
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <input type="text" autoComplete="username" value={(me.member?.kind === "external" ? me.member.username : me.member?.studentNo) ?? ""} readOnly hidden />
        <label className="field">
          当前密码
          <input className="input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" autoFocus />
        </label>
        <label className="field">
          新密码
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          <span className="hint xsmall">至少 8 个字符，不能和账号相同。</span>
        </label>
        <label className="field">
          确认新密码
          <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          {mismatch && <span className="error-text xsmall">两次输入不一致</span>}
        </label>
        <ErrorText error={error} />
        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy || password.length < 8 || confirm !== password || !current}>
          {busy ? <Spinner /> : "保存新密码"}
        </button>
        <button className="btn btn-quiet btn-block" type="button" onClick={() => history.back()}>
          取消
        </button>
      </form>
    </LoginFrame>
  );
}

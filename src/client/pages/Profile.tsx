import { useMemo, useState } from "react";
import { type SourceSeries, buildGrid, overview } from "../../shared/heatmap";
import { api, clearCache, invalidate, longDay, relativeTime, useApi } from "../api";
import { AppearancePickers } from "../components/Appearance";
import { HeatGrid, Legend, Strip } from "../components/Heatmap";
import { Icon } from "../icons";

import { Link } from "../router";
import { useMe } from "../session";
import type { HeatmapPayload, Me } from "../types";
import { Dialog, ErrorBox, Skeleton, Spinner, useConfirm, useDialogClose, useTitle, useToast } from "../ui";

const GROUP_COLOR: Record<string, string> = { "site:attendance": "var(--l3)", "site:reflection": "var(--l2)", "site:study": "var(--l4)" };
const colorOf = (s: SourceSeries) => GROUP_COLOR[s.source] ?? "var(--sub)";
const MONO: Record<string, string> = { github: "GH", "leetcode-cn": "力扣", leetcode: "LC", codeforces: "CF", atcoder: "AT", wakatime: "WT", maimemo: "墨墨", bbdc: "不背", duolingo: "多邻" };

export function ProfilePage({ me, onLogout }: { me: Me; onLogout: () => void }) {
  useTitle("我的");
  const { data, error, reload } = useApi<HeatmapPayload>("/api/heatmap");
  const [off, setOff] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<string | null>(null);
  const [binding, setBinding] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  const series = data?.series ?? [];
  const on = series.filter((s) => !off.has(s.source) && !s.error);
  const grid = useMemo(() => (data ? overview(on, data.today, 53) : null), [data, off]);
  const today = data?.today ?? "";
  const day = sel ?? today;
  const parts = on.map((s) => ({ s, n: s.days[day] ?? 0 })).filter((x) => x.n > 0);

  const unbind = async (source: string, label: string) => {
    if (!(await confirm({ title: `解绑 ${label}？`, body: "解绑后热力图里不再显示这个平台的记录，以后可以重新绑定。", ok: "解绑", danger: true }))) return;
    try {
      await api(`/api/heatmap/bindings/${encodeURIComponent(source)}`, { method: "DELETE" });
      toast(`已解绑 ${label}`);
      invalidate("/api/heatmap");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    clearCache();
    onLogout();
  };

  return (
    <div className="page">
      <header className="row wrap" style={{ gap: 18 }}>
        <span className="avatar avatar-lg" aria-hidden="true">
          {me.member?.name.slice(0, 1)}
        </span>
        <span className="grow stack" style={{ gap: 4 }}>
          <h1 className="h1" style={{ fontSize: 30, lineHeight: "38px" }}>
            {me.member?.name}
          </h1>
          <span className="small sub">{(me.member?.kind === "external"
            ? ["校外账号", me.member.username, me.member.org, me.isAdmin ? "管理员" : null]
            : [me.member?.className, `学号 ${me.member?.studentNo}`, me.isAdmin ? "管理员" : null]
          )
            .filter(Boolean)
            .join(" · ")}</span>
        </span>
      </header>

      <section className="card stack" aria-labelledby="hm-h" style={{ gap: 16, padding: 22, borderRadius: 26 }}>
        <div className="row wrap" style={{ justifyContent: "space-between" }}>
          <span className="stack" style={{ gap: 2 }}>
            <h2 id="hm-h" className="h3">
              一年的学习
            </h2>
            <span className="small sub">{grid ? `过去一年 ${grid.activeDays} 天` : " "}</span>
          </span>
          <div role="group" aria-label="显示哪些记录" className="row wrap" style={{ gap: 6 }}>
            {series.map((s) => (
              <button
                key={s.source}
                type="button"
                className="chip"
                aria-pressed={!off.has(s.source)}
                style={{ "--c": colorOf(s) } as React.CSSProperties}
                onClick={() => {
                  const n = new Set(off);
                  if (n.has(s.source)) n.delete(s.source);
                  else n.add(s.source);
                  setOff(n);
                }}
              >
                <span className="dot" aria-hidden="true" />
                {s.label}
              </button>
            ))}
          </div>
        </div>
        {error && !data ? (
          <ErrorBox error={error} onRetry={reload} />
        ) : !grid ? (
          <Skeleton h={150} />
        ) : (
          <HeatGrid
            grid={grid}
            today={today}
            selected={sel}
            onSelect={setSel}
            label="一年的学习热力图，每格是一天，方向键可以移动"
            describe={(d) => {
              const xs = on.map((s) => (s.days[d] ? `${s.label} ${s.days[d]}` : "")).filter(Boolean);
              return xs.length ? xs.join("，") : "没有记录";
            }}
          />
        )}
        <div className="row wrap" style={{ justifyContent: "space-between", paddingTop: 14, borderTop: "1px solid var(--line)" }}>
          <div aria-live="polite" className="row wrap" style={{ gap: "6px 16px", alignItems: "baseline" }}>
            <span style={{ fontSize: "var(--fs-md)", lineHeight: "22px", fontWeight: 600 }}>{today ? `${day === today ? "今天 · " : ""}${longDay(day)}` : ""}</span>
            {today &&
              (parts.length ? (
                parts.map(({ s, n }) => (
                  <span key={s.source} className="small sub">
                    {s.label} {n} {s.unit}
                  </span>
                ))
              ) : (
                <span className="small sub">这天没有记录</span>
              ))}
          </div>
          <Legend />
        </div>
      </section>

      <div className="grid-2">
        <section className="card stack" aria-labelledby="src-h" style={{ gap: 4 }}>
          <div className="section-head" style={{ marginBottom: 4 }}>
            <h2 id="src-h" className="h3">
              来源
            </h2>
            <button type="button" className="btn btn-soft btn-sm" onClick={() => setBinding(true)}>
              <Icon name="plus" size={16} stroke={2} />
              绑定平台
            </button>
          </div>
          {!data && <Skeleton h={160} />}
          {series.map((s) => {
            const b = data?.bindings.find((x) => x.source === s.source);
            const g = buildGrid(s.days, today, 26);
            return (
              <div key={s.source} className="list-row" style={{ flexWrap: "wrap" }}>
                <span className="stack grow" style={{ gap: 6, minWidth: 180 }}>
                  <span className="row" style={{ gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 4, background: colorOf(s), flexShrink: 0 }} aria-hidden="true" />
                    <span style={{ fontSize: "var(--fs-sm)", lineHeight: "22px", fontWeight: 500 }}>{s.label}</span>
                    <span className="xsmall sub num">
                      半年 {g.total} {s.unit}
                    </span>
                  </span>
                  {s.error ? <span className="xsmall error-text">同步失败：{s.error}</span> : <Strip grid={g} />}
                  {b && (
                    <span className="xsmall sub">
                      {b.handle}
                      {b.syncedAt ? ` · ${relativeTime(b.syncedAt)}同步` : " · 还没同步"}
                    </span>
                  )}
                </span>
                {b && (
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => unbind(s.source, s.label)}>
                    解绑
                  </button>
                )}
              </div>
            );
          })}
        </section>

        <section className="card stack" id="settings" aria-labelledby="set-h" style={{ gap: 16 }}>
          <DisplayNameForm />
          <h2 id="set-h" className="h3" style={{ paddingTop: 14, borderTop: "1px solid var(--line)" }}>
            外观
          </h2>
          <AppearancePickers />
          <span className="xsmall sub">外观只保存在这台设备上。</span>
          <div className="row wrap" style={{ paddingTop: 14, borderTop: "1px solid var(--line)" }}>
            <Link to="/password" className="btn btn-ghost">
              <Icon name="key" size={18} />
              修改密码
            </Link>
            <button type="button" className="btn btn-quiet" onClick={logout}>
              <Icon name="logout" size={18} />
              退出登录
            </button>
          </div>
        </section>
      </div>
      {binding && data && <BindDialog data={data} onClose={() => setBinding(false)} />}
    </div>
  );
}

/**
 * 首页欢迎语里的称呼。只影响欢迎语：签到表、名单、公告、讨论里还是真名。
 * 保存空字符串 = 恢复真名。
 */
function DisplayNameForm() {
  const { me, setMe } = useMe();
  const toast = useToast();
  const real = me.member?.name ?? "";
  const saved = me.member?.displayName ?? "";
  const [value, setValue] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (next: string) => {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ displayName: string | null }>("/api/me/display-name", { method: "PUT", body: { displayName: next } });
      if (me.member) setMe({ ...me, member: { ...me.member, displayName: r.displayName } });
      setValue(r.displayName ?? "");
      toast(r.displayName ? `首页会叫你“${r.displayName}”` : "已恢复为真名");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="stack"
      style={{ gap: 8 }}
      onSubmit={(e) => {
        e.preventDefault();
        void save(value.trim());
      }}
    >
      <h2 className="h3">首页称呼</h2>
      <label className="field">
        <span className="sr-only">显示名</span>
        <input className="input" value={value} onChange={(e) => setValue(e.target.value)} maxLength={20} placeholder={real} autoComplete="nickname" />
        <span className="hint xsmall">只用于首页欢迎语</span>
      </label>
      {error && (
        <span className="error-text xsmall" role="alert">
          {error}
        </span>
      )}
      <div className="row wrap" style={{ gap: 8 }}>
        <button type="submit" className="btn btn-soft btn-sm" disabled={busy || !value.trim() || value.trim() === saved}>
          {busy ? <Spinner /> : "保存"}
        </button>
        <button type="button" className="btn btn-quiet btn-sm" disabled={busy || !saved} onClick={() => void save("")}>
          恢复真名
        </button>
      </div>
    </form>
  );
}

function BindDialog({ data, onClose }: { data: HeatmapPayload; onClose: () => void }) {
  return (
    <Dialog title="绑定平台" sub="填你在那个平台的用户名，热力图会多一行。" onClose={onClose}>
      <BindForm data={data} />
    </Dialog>
  );
}

function BindForm({ data }: { data: HeatmapPayload }) {
  const close = useDialogClose();
  const toast = useToast();
  const usable = data.providers.filter((p) => p.status !== "pending");
  const [source, setSource] = useState(usable.find((p) => !data.bindings.some((b) => b.source === p.id))?.id ?? usable[0]?.id ?? "");
  const [handle, setHandle] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const p = usable.find((x) => x.id === source);
  const groups: [string, string][] = [
    ["code", "写代码"],
    ["algo", "刷题"],
    ["english", "英语"],
  ];
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const r = await api<{ error: string | null; days: number }>("/api/heatmap/bindings", { body: { source, handle: handle.trim(), secret: secret.trim() || undefined } });
          if (r.error) toast(`绑定了，但这次没同步成功：${r.error}`, "error");
          else toast(`绑定好了，同步到 ${r.days} 天的记录`);
          invalidate("/api/heatmap");
          close();
        } catch (err) {
          setError((err as Error).message);
          setBusy(false);
        }
      }}
    >
      <div className="stack" style={{ gap: 8 }}>
        {groups.map(([cat, name]) => {
          const ps = usable.filter((x) => x.category === cat);
          if (!ps.length) return null;
          return (
            <div key={cat} className="stack" style={{ gap: 6 }}>
              <span className="xsmall sub">{name}</span>
              <div className="row wrap" style={{ gap: 6 }}>
                {ps.map((x) => (
                  <button key={x.id} type="button" className="chip" aria-pressed={x.id === source} onClick={() => setSource(x.id)} style={{ "--c": "var(--accent)" } as React.CSSProperties}>
                    <span className="mono xsmall" aria-hidden="true">
                      {MONO[x.id] ?? x.id.slice(0, 2).toUpperCase()}
                    </span>
                    {x.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {p && (
        <>
          <label className="field">
            {p.handleHint}
            <input className="input" value={handle} onChange={(e) => setHandle(e.target.value)} autoComplete="off" required />
          </label>
          {p.needsUserSecret && (
            <label className="field">
              令牌
              <input className="input mono" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" />
              <span className="hint xsmall">{p.needsUserSecret}</span>
            </label>
          )}
        </>
      )}
      {error && (
        <span className="error-text" role="alert">
          {error}
        </span>
      )}
      <div className="dialog-actions">
        <button type="button" className="btn btn-ghost" onClick={close}>
          取消
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy || !handle.trim() || !p}>
          {busy ? <Spinner /> : "绑定并同步"}
        </button>
      </div>
    </form>
  );
}

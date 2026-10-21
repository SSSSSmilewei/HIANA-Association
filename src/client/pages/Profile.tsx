import { useMemo, useState } from "react";
import { type SourceSeries, buildGrid, overview } from "../../shared/heatmap";
import { api, clearCache, invalidate, longDay, relativeTime, useApi } from "../api";
import { HeatGrid, Legend, Strip } from "../components/Heatmap";
import { Icon } from "../icons";
import { usePrefs } from "../prefs";
import { Link } from "../router";
import type { HeatmapPayload, Me } from "../types";
import { Dialog, ErrorBox, Seg, Skeleton, Spinner, useConfirm, useDialogClose, useTitle, useToast } from "../ui";

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
  const [prefs, setPrefs] = usePrefs();

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
          <span className="small sub">{[me.member?.className, `学号 ${me.member?.studentNo}`, me.isAdmin ? "管理员" : null].filter(Boolean).join(" · ")}</span>
        </span>
      </header>

      <section className="card stack" aria-labelledby="hm-h" style={{ gap: 16, padding: 22, borderRadius: 26 }}>
        <div className="row wrap" style={{ justifyContent: "space-between" }}>
          <span className="stack" style={{ gap: 2 }}>
            <h2 id="hm-h" className="h3" style={{ fontSize: 18 }}>
              一年的学习
            </h2>
            <span className="small sub">{grid ? `过去一年有 ${grid.activeDays} 天在学。没有连续天数，哪天没来不会断。` : " "}</span>
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
            <span style={{ fontSize: 15, lineHeight: "22px", fontWeight: 600 }}>{today ? `${day === today ? "今天 · " : ""}${longDay(day)}` : ""}</span>
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
          <p className="small sub" style={{ marginBottom: 8 }}>
            站外平台每天夜里同步一次，只读公开数据。
          </p>
          {!data && <Skeleton h={160} />}
          {series.map((s) => {
            const b = data?.bindings.find((x) => x.source === s.source);
            const g = buildGrid(s.days, today, 26);
            return (
              <div key={s.source} className="list-row" style={{ flexWrap: "wrap" }}>
                <span className="stack grow" style={{ gap: 6, minWidth: 180 }}>
                  <span className="row" style={{ gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 4, background: colorOf(s), flexShrink: 0 }} aria-hidden="true" />
                    <span style={{ fontSize: 14, lineHeight: "20px", fontWeight: 500 }}>{s.label}</span>
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
          <h2 id="set-h" className="h3">
            外观
          </h2>
          <div className="stack" style={{ gap: 8 }}>
            <span className="small sub">风格</span>
            <div role="group" aria-label="风格" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              <SkinTile label="液态玻璃" active={prefs.skin === "glass"} onClick={() => setPrefs({ skin: "glass" })}>
                <span style={{ position: "absolute", inset: 0, background: "#FFF1E6" }} />
                <span style={{ position: "absolute", right: 8, top: 8, width: 14, height: 14, borderRadius: 4, background: "#F26B1D" }} />
                <span style={{ position: "absolute", right: 26, top: 8, width: 14, height: 14, borderRadius: 4, background: "#FFAA6B" }} />
                <span style={{ position: "absolute", left: 8, right: 30, bottom: 8, height: 22, borderRadius: 9, background: "rgba(255,255,255,0.7)", border: "1px solid #fff" }} />
              </SkinTile>
              <SkinTile label="经典直角" active={prefs.skin === "classic"} onClick={() => setPrefs({ skin: "classic" })}>
                <span style={{ position: "absolute", inset: 0, background: "#fff", border: "1px solid #141416" }} />
                <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, background: "#A31F34" }} />
                <span style={{ position: "absolute", left: 16, top: 12, width: 50, height: 6, background: "#141416" }} />
                <span style={{ position: "absolute", left: 16, top: 26, width: 72, height: 4, background: "#A9ABB2" }} />
              </SkinTile>
            </div>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <span className="small sub">深浅</span>
            <Seg
              label="深浅"
              flat
              value={prefs.theme}
              onChange={(t) => setPrefs({ theme: t })}
              options={[
                { value: "light" as const, label: "浅色" },
                { value: "dark" as const, label: "深色" },
                { value: "system" as const, label: "跟随系统" },
              ]}
            />
            <span className="xsmall sub">只保存在这台设备上。</span>
          </div>
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

function SkinTile({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        padding: 12,
        borderRadius: "var(--r-card)",
        border: `2px solid ${active ? "var(--accent)" : "var(--line)"}`,
        background: active ? "var(--well)" : "transparent",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        textAlign: "left",
      }}
    >
      <span aria-hidden="true" style={{ height: 54, borderRadius: 10, position: "relative", overflow: "hidden", display: "block" }}>
        {children}
      </span>
      <span style={{ fontSize: 14, lineHeight: "20px", fontWeight: active ? 600 : 500 }}>{label}</span>
    </button>
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
            {p.status === "unofficial" && <span className="hint xsmall">这个平台没有公开接口，用的是网页上能看到的数据，偶尔会同步失败。</span>}
          </label>
          {p.needsUserSecret && (
            <label className="field">
              令牌
              <input className="input mono" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" />
              <span className="hint xsmall">{p.needsUserSecret}。令牌加密保存，只用来读取你的记录。</span>
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

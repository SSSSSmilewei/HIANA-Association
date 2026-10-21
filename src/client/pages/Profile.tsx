import { useMemo, useState } from "react";
import type { HeatmapPayload, ProviderInfo } from "../../shared/api";
import { addDays, buildGrid, clip, overview, weekdayMon0 } from "../../shared/heatmap";
import { api, useApi } from "../api";
import { HeatLegend, HeatmapGrid } from "../components/Heatmap";
import { ErrorView, Loading } from "../components/Layout";

const GROUPS: { key: ProviderInfo["category"] | "site"; label: string }[] = [
  { key: "site", label: "协会平台" },
  { key: "code", label: "写代码" },
  { key: "algo", label: "刷题" },
  { key: "english", label: "英语" },
];
const WD = "一二三四五六日";

export function ProfilePage() {
  const { data, error, reload } = useApi<HeatmapPayload>("/api/heatmap");
  const [selected, setSelected] = useState<string | null>(null);

  const ov = useMemo(() => (data ? overview(data.series, data.today) : null), [data]);
  if (error) return <ErrorView message={error.message} />;
  if (!data || !ov) return <Loading />;

  const providers = new Map(data.providers.map((p) => [p.id, p]));
  const day = selected ?? data.today;
  const last7 = addDays(data.today, -6);
  const recent = new Set(data.series.flatMap((s) => (s.error ? [] : Object.keys(clip(s.days, last7, data.today))))).size;
  const parts = data.series.filter((s) => s.days[day]).map((s) => `${s.label} ${s.days[day]} ${s.unit}`);

  return (
    <main className="wrap page-pad stack-xl">
      <section className="split-head">
        <div>
          <h1 className="page-title">我的学习记录</h1>
          <p className="muted">协会平台上的学习，加上你绑定的平台，每晚 23:30 同步一次。</p>
        </div>
        <dl className="stats">
          <div>
            <dt>过去一年有记录</dt>
            <dd>{ov.activeDays} 天</dd>
          </div>
          <div>
            <dt>最近 7 天</dt>
            <dd>{recent} 天</dd>
          </div>
        </dl>
      </section>

      <section className="stack-s" aria-labelledby="ov">
        <div className="row-between">
          <h2 id="ov" className="h2">
            总览
          </h2>
          <HeatLegend />
        </div>
        <HeatmapGrid grid={ov} cell={13} label="过去一年总览热力图" selected={day} onSelect={setSelected} />
        <p className="day-detail">
          <b>
            {day} 周{WD[weekdayMon0(day)]}
          </b>
          ：{parts.length ? parts.join("，") : "这一天没有记录"}
        </p>
      </section>

      <section className="stack-s" aria-labelledby="by">
        <h2 id="by" className="h2">
          按平台
        </h2>
        {GROUPS.map((g) => {
          const rows = data.series.filter((s) => (s.source === "site" ? g.key === "site" : providers.get(s.source)?.category === g.key));
          if (rows.length === 0) return null;
          return (
            <div key={g.key}>
              <h3 className="group-title">{g.label}</h3>
              {rows.map((s) => {
                const grid = buildGrid(s.days, data.today, 26);
                const p = providers.get(s.source);
                return (
                  <div className="source-row" key={s.source}>
                    <div className="source-name">
                      <b>{s.label}</b>
                      <span className="muted xsmall">
                        {grid.activeDays} 天，{grid.total.toLocaleString("zh-CN")} {s.unit}
                      </span>
                    </div>
                    <HeatmapGrid grid={grid} cell={9} label={`${s.label}最近 26 周`} />
                    <div className={`source-status${s.error ? " bad" : ""}`}>
                      {s.source === "site" ? "站内自动记录" : s.error ? `同步失败：${s.error}` : s.syncedAt ? "同步正常" : "等待今晚同步"}
                      {s.source !== "site" && <UnbindButton source={s.source} label={p?.label ?? s.label} onDone={reload} />}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </section>

      <section className="two-col">
        <BindForm providers={data.providers} bound={new Set(data.bindings.map((b) => b.source))} onDone={reload} />
        <div className="stack-s small">
          <h2 className="h2">记录哪些、用在哪</h2>
          <p>记录你做了什么：打卡、完成课时、提问和回答，以及绑定平台每天的次数。不记录停留时长，也不算连续天数。</p>
          <p>会长能看到谁最近 7 天没有任何记录，用来线下问问你是不是卡住了。不做排名。</p>
          <p>令牌加密保存。解绑时连同攒下的数据一起删除。</p>
        </div>
      </section>
    </main>
  );
}

function UnbindButton({ source, label, onDone }: { source: string; label: string; onDone: () => void }) {
  const [confirm, setConfirm] = useState(false);
  if (!confirm)
    return (
      <button type="button" className="link-btn muted" onClick={() => setConfirm(true)}>
        解绑
      </button>
    );
  return (
    <span className="inline-confirm">
      解绑 {label} 并删除数据？
      <button
        type="button"
        className="link-btn"
        onClick={async () => {
          await api(`/api/heatmap/bindings/${encodeURIComponent(source)}`, { method: "DELETE" });
          onDone();
        }}
      >
        确定
      </button>
      <button type="button" className="link-btn muted" onClick={() => setConfirm(false)}>
        取消
      </button>
    </span>
  );
}

function BindForm({ providers, bound, onDone }: { providers: ProviderInfo[]; bound: Set<string>; onDone: () => void }) {
  const choices = providers.filter((p) => p.status !== "pending");
  const [source, setSource] = useState(choices[0]?.id ?? "");
  const [handle, setHandle] = useState("");
  const [secret, setSecret] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const p = choices.find((x) => x.id === source);
  const pending = providers.filter((x) => x.status === "pending");

  return (
    <form
      className="stack-s form-narrow"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        try {
          const r = await api<{ error: string | null; days: number }>("/api/heatmap/bindings", { body: { source, handle, secret: secret || undefined } });
          setMsg(r.error ? { ok: false, text: `已绑定，但这次同步失败：${r.error}` } : { ok: true, text: `已绑定，同步到 ${r.days} 天的数据。` });
          setHandle("");
          setSecret("");
          onDone();
        } catch (err) {
          setMsg({ ok: false, text: (err as Error).message });
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="h2">绑定一个平台</h2>
      <label className="field" htmlFor="bind-source">
        平台
        <select id="bind-source" value={source} onChange={(e) => setSource(e.target.value)}>
          {choices.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
              {bound.has(c.id) ? "（已绑定，改用户名）" : ""}
            </option>
          ))}
        </select>
      </label>
      {p && (
        <>
          <label className="field" htmlFor="bind-handle">
            {p.handleHint}
            <input id="bind-handle" value={handle} onChange={(e) => setHandle(e.target.value)} autoComplete="off" required />
          </label>
          {p.needsUserSecret && (
            <label className="field" htmlFor="bind-secret">
              令牌
              <input id="bind-secret" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" type="password" />
              <span className="muted xsmall">{p.needsUserSecret}</span>
            </label>
          )}
          <p className="muted xsmall">
            {p.coverage === "snapshot" ? "这个平台只给最近几天的数据，从今天开始攒，之前的日子不会有格子。" : "会同步过去一年的数据。"}
            {p.status === "unofficial" ? "数据来自平台网页用的接口，平台改版时可能暂时同步不了。" : ""}
          </p>
        </>
      )}
      <button className="btn btn-ink" type="submit" disabled={busy || !handle.trim()}>
        {busy ? "正在同步…" : "绑定并同步一次"}
      </button>
      {msg && <p className={msg.ok ? "ok-text" : "error-text"}>{msg.text}</p>}
      {pending.length > 0 && <p className="muted xsmall">暂不支持：{pending.map((x) => x.label).join("、")}。接口还在测试。</p>}
    </form>
  );
}

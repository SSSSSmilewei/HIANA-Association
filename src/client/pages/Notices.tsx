import { useState } from "react";
import { api, cnToday, daysBetween, invalidate, longDay, useApi } from "../api";
import { Icon } from "../icons";
import type { Notice } from "../types";
import { Dialog, Empty, ErrorBox, Seg, SkeletonCards, useConfirm, useDialogClose, useTitle, useToast } from "../ui";

const dayOf = (ms: number) => new Date(ms + 8 * 3_600_000).toISOString().slice(0, 10);

export function NoticesPage() {
  useTitle("公告与比赛");
  const { data, error, reload } = useApi<Notice[]>("/api/notices");
  const [tab, setTab] = useState<"all" | "notice" | "competition">("all");
  const [joining, setJoining] = useState<Notice | null>(null);
  const today = cnToday();

  const notices = (data ?? []).filter((n) => n.kind === "notice");
  const comps = (data ?? [])
    .filter((n) => n.kind === "competition")
    .sort((a, b) => {
      const ea = a.deadline && a.deadline < today ? 1 : 0;
      const eb = b.deadline && b.deadline < today ? 1 : 0;
      return ea - eb || (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999");
    });

  return (
    <div className="page">
      <header className="page-head">
        <div className="stack" style={{ gap: 6 }}>
          <span className="eyebrow">会长和老师发布 · 新比赛会推送到群里</span>
          <h1 className="h1">公告与比赛</h1>
        </div>
        <Seg
          label="显示"
          value={tab}
          onChange={setTab}
          options={[
            { value: "all" as const, label: "全部" },
            { value: "notice" as const, label: "公告" },
            { value: "competition" as const, label: "比赛" },
          ]}
        />
      </header>

      {error && !data ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : !data ? (
        <SkeletonCards n={3} h={220} />
      ) : data.length === 0 ? (
        <div className="card">
          <Empty title="还没有公告">会长发布的通知和比赛都会出现在这里。</Empty>
        </div>
      ) : (
        <>
          {tab !== "competition" && notices.length > 0 && (
            <section className="section" aria-labelledby="nt-h">
              {tab === "all" && (
                <h2 id="nt-h" className="h2">
                  公告
                </h2>
              )}
              <div className="stack" style={{ gap: 12 }}>
                {notices.map((n, i) => (
                  <NoticeCard key={n.id} n={n} i={i} />
                ))}
              </div>
            </section>
          )}
          {tab !== "notice" && comps.length > 0 && (
            <section className="section" aria-labelledby="cp-h">
              <div className="section-head">
                <h2 id="cp-h" className="h2">
                  比赛
                </h2>
                <span className="small sub">这里只是协会内部登记，方便找队友。正式报名按比赛资料里的流程走。</span>
              </div>
              <div className="grid-cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))" }}>
                {comps.map((n, i) => (
                  <CompetitionCard key={n.id} n={n} i={i} today={today} onJoin={() => setJoining(n)} />
                ))}
              </div>
            </section>
          )}
          {((tab === "notice" && !notices.length) || (tab === "competition" && !comps.length)) && (
            <div className="card">
              <Empty title={tab === "notice" ? "还没有公告" : "还没有比赛"} />
            </div>
          )}
        </>
      )}
      {joining && <JoinDialog n={joining} onClose={() => setJoining(null)} />}
    </div>
  );
}

function NoticeCard({ n, i }: { n: Notice; i: number }) {
  const [open, setOpen] = useState(n.pinned || n.body.length < 120);
  return (
    <article className="card row rise" style={{ alignItems: "flex-start", gap: 16, "--i": i } as React.CSSProperties}>
      {n.pinned && (
        <span className="kind-icon" aria-hidden="true">
          <Icon name="pin" size={18} />
        </span>
      )}
      <span className="grow stack" style={{ gap: 6 }}>
        <span className="row wrap" style={{ gap: 10 }}>
          <span style={{ fontSize: 17, lineHeight: "24px", fontWeight: 700 }}>{n.title}</span>
          <span className="xsmall sub">{[n.pinned ? "置顶" : null, longDay(dayOf(n.createdAt), false), n.author].filter(Boolean).join(" · ")}</span>
        </span>
        {n.body && (
          <span
            className="small sub pretty"
            style={{ whiteSpace: "pre-wrap", ...(open ? {} : { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }) }}
          >
            {n.body}
          </span>
        )}
        {!open && (
          <button type="button" className="btn btn-quiet btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setOpen(true)}>
            展开
          </button>
        )}
        {n.docUrl && (
          <a href={n.docUrl} target="_blank" rel="noreferrer" className="ext-link" style={{ alignSelf: "flex-start" }}>
            相关链接
            <Icon name="external" size={12} stroke={2.2} />
          </a>
        )}
      </span>
    </article>
  );
}

function CompetitionCard({ n, i, today, onJoin }: { n: Notice; i: number; today: string; onJoin: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const days = n.deadline ? daysBetween(today, n.deadline) : null;
  const ended = days !== null && days < 0;
  const teams = new Set(n.entries.map((e) => e.team).filter(Boolean));
  const leave = async () => {
    if (!(await confirm({ title: "取消登记？", body: `从「${n.title}」的登记名单里去掉你。`, ok: "取消登记", danger: true }))) return;
    try {
      await api(`/api/notices/${n.id}/entry`, { method: "DELETE" });
      toast("已取消登记");
      invalidate("/api/notices");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
  return (
    <article className="card stack rise" style={{ gap: 14, opacity: ended ? 0.7 : 1, "--i": i } as React.CSSProperties}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <span className="row wrap" style={{ gap: 6 }}>
          {n.tags.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </span>
        {days !== null && (
          <span className="stack" style={{ alignItems: "flex-end", gap: 0, flexShrink: 0 }}>
            <span className="num" style={{ fontSize: 32, lineHeight: "34px", fontWeight: 700, letterSpacing: -1, color: !ended && days <= 14 ? "var(--bad-ink)" : "var(--ink)" }}>
              {ended ? "—" : days}
            </span>
            <span className="xsmall sub">{ended ? "已截止" : days === 0 ? "今天截止" : "天后截止"}</span>
          </span>
        )}
      </div>
      <span className="stack" style={{ gap: 6 }}>
        <span style={{ fontSize: 19, lineHeight: "26px", fontWeight: 700 }}>{n.title}</span>
        {n.body && (
          <span className="small sub pretty" style={{ whiteSpace: "pre-wrap" }}>
            {n.body}
          </span>
        )}
      </span>
      <span className="row wrap" style={{ gap: 8 }}>
        {n.docUrl && (
          <a href={n.docUrl} target="_blank" rel="noreferrer" className="ext-link">
            比赛资料
            <Icon name="external" size={12} stroke={2.2} />
          </a>
        )}
        {n.groupInfo && <span className="ext-link sub" style={{ background: "var(--well)", cursor: "default" }}>{n.groupInfo}</span>}
        {n.deadline && <span className="ext-link sub" style={{ cursor: "default" }}>截止 {longDay(n.deadline, false)}</span>}
      </span>
      {n.entries.length > 0 && (
        <details>
          <summary className="small" style={{ cursor: "pointer", minHeight: 32 }}>
            {n.entries.length} 人登记{teams.size ? ` · ${teams.size} 支队` : ""}
          </summary>
          <ul className="stack small" style={{ gap: 4, marginTop: 8 }}>
            {n.entries.map((e, k) => (
              <li key={k} className="row" style={{ gap: 8 }}>
                <span style={{ fontWeight: 500 }}>{e.name}</span>
                {e.team && <span className="tag">{e.team}</span>}
                {e.contact && <span className="xsmall sub">{e.contact}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="row" style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px solid var(--line)", justifyContent: "space-between" }}>
        <span className="small sub">{n.joined ? "你已登记" : n.entries.length ? "" : "还没有人登记"}</span>
        {!ended && (
          <span className="row" style={{ gap: 8 }}>
            {n.joined && (
              <button type="button" className="btn btn-quiet" onClick={leave}>
                取消
              </button>
            )}
            <button type="button" className={`btn ${n.joined ? "btn-soft" : "btn-primary"}`} onClick={onJoin}>
              {n.joined ? "修改登记" : "我要参加"}
            </button>
          </span>
        )}
      </div>
    </article>
  );
}

function JoinDialog({ n, onClose }: { n: Notice; onClose: () => void }) {
  return (
    <Dialog title="登记参赛" sub={n.title} onClose={onClose}>
      <JoinForm n={n} />
    </Dialog>
  );
}

function JoinForm({ n }: { n: Notice }) {
  const close = useDialogClose();
  const toast = useToast();
  const [team, setTeam] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api(`/api/notices/${n.id}/entry`, { method: "PUT", body: { team: team.trim() || undefined, contact: contact.trim() || undefined } });
          toast(n.joined ? "登记已更新" : "登记好了");
          invalidate("/api/notices");
          close();
        } catch (err) {
          setError((err as Error).message);
          setBusy(false);
        }
      }}
    >
      <label className="field">
        队伍名<span className="hint">还没组队可以不填，之后再改</span>
        <input className="input" value={team} onChange={(e) => setTeam(e.target.value)} maxLength={30} placeholder="例如：视觉一队" />
      </label>
      <label className="field">
        联系方式<span className="hint">登记名单里大家都看得到，方便找队友</span>
        <input className="input" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={60} placeholder="QQ 或微信号" />
      </label>
      {error && (
        <span className="error-text" role="alert">
          {error}
        </span>
      )}
      <div className="dialog-actions">
        <button type="button" className="btn btn-ghost" onClick={close}>
          取消
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {n.joined ? "保存" : "登记"}
        </button>
      </div>
    </form>
  );
}

import { useMemo, useState } from "react";
import { UNIT_KIND_LABEL, getCourse } from "../../shared/courses";
import { overview } from "../../shared/heatmap";
import { api, clock, daysBetween, greeting, longDay, minutesText, mutate, useApi } from "../api";
import { KIND_LABEL, phaseOf } from "../attendance";
import { Legend, Wall } from "../components/Heatmap";
import { courseCode, refreshLearning } from "../courseMeta";
import { Icon, KIND_ICON } from "../icons";
import { Link } from "../router";
import type { AttendanceState, Calendar, HeatmapPayload, Me, NextItem, Notice } from "../types";
import { Bar, Empty, ErrorBox, Skeleton, SkeletonCards, useNow, useTitle, useToast } from "../ui";

export function HomePage({ me }: { me: Me }) {
  useTitle("");
  const now = useNow(30_000);
  const cal = useApi<Calendar>("/api/calendar");
  const att = useApi<AttendanceState>("/api/attendance", { refreshMs: 60_000 });
  const next = useApi<{ today: string; items: NextItem[] }>("/api/learning/next");
  const notices = useApi<Notice[]>("/api/notices");
  const heat = useApi<HeatmapPayload>("/api/heatmap");

  const grid = useMemo(() => (heat.data ? overview(heat.data.series, heat.data.today, 40) : null), [heat.data]);
  const today = cal.data?.today ?? att.data?.today;
  const name = me.member?.name ?? "";

  return (
    <div className="page">
      <header className="page-head">
        <div className="stack" style={{ gap: 6 }}>
          <span className="eyebrow">{today ? [cal.data?.week ? `第 ${cal.data.week} 周` : null, longDay(today)].filter(Boolean).join(" · ") : " "}</span>
          <h1 className="h1">
            {greeting(now)}，{name}
          </h1>
        </div>
      </header>

      <section className="hero" aria-label="今天">
        <Wall grid={grid} />
        <div className="hero-legend glass">
          <span>最近的学习</span>
          <Legend />
        </div>
        <div className="hero-card glass">{att.data ? <CheckinCard s={att.data} now={now} /> : att.error ? <ErrorBox error={att.error} onRetry={att.reload} /> : <CardSkeleton />}</div>
      </section>

      <section className="section" aria-labelledby="next-h">
        <div className="section-head">
          <h2 id="next-h" className="h2">
            接下来
          </h2>
          <Link to="/courses" className="more-link">
            全部课程
            <Icon name="arrowRight" size={16} stroke={2} />
          </Link>
        </div>
        {next.data ? (
          next.data.items.length ? (
            <div className="grid-cards">
              {next.data.items.map((it, i) => (
                <NextCard key={it.slug} item={it} i={i} />
              ))}
            </div>
          ) : (
            <div className="card">
              <Empty
                title="还没选课"
                action={
                  <Link to="/courses" className="btn btn-primary">
                    去选课
                  </Link>
                }
              >
                先选三门必修：Missing Semester、Git 和 CS50x。选了的课会在这里显示下一步该学什么。
              </Empty>
            </div>
          )
        ) : next.error ? (
          <ErrorBox error={next.error} onRetry={next.reload} />
        ) : (
          <SkeletonCards n={3} h={190} />
        )}
      </section>

      <NoticeRow notices={notices.data} today={today} error={notices.error} retry={notices.reload} />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="stack" aria-busy="true" aria-label="正在加载">
      <Skeleton h={22} w={140} />
      <Skeleton h={34} w={200} />
      <Skeleton h={48} w={180} r={16} />
    </div>
  );
}

function CheckinCard({ s, now }: { s: AttendanceState; now: number }) {
  const p = phaseOf(s, now);
  const [a, b] = s.evening.window;
  const window = (
    <span className="small sub num">
      {a} – {b}
    </span>
  );
  if (p.kind === "in")
    return (
      <>
        <div className="row wrap">
          <span className="tag tag-accent">
            <span className="live-dot" style={{ background: "var(--accent)" }} />
            {KIND_LABEL[p.scene]} · 学习中
          </span>
          <span className="small sub num">{clock(p.inAt)} 签到</span>
        </div>
        <div className="stack" style={{ gap: 4 }}>
          <p className="hero-title">已经学了 {minutesText(p.minutes)}</p>
          <p className="small sub">离开前拍照签退。忘了的话 {clock(p.endsAt)} 会自动结束。</p>
        </div>
        <div className="row wrap">
          <Link to="/checkin?go=out" className="btn btn-primary btn-lg">
            <Icon name="camera" />
            拍照签退
          </Link>
        </div>
      </>
    );
  if (p.kind === "evening-open")
    return (
      <>
        <div className="row wrap">
          <span className="tag tag-accent">
            <span className="live-dot" />
            晚自习进行中
          </span>
          {window}
        </div>
        <div className="stack" style={{ gap: 4 }}>
          <p className="hero-title">你还没签到</p>
          <p className="small sub">还有 {minutesText(p.remaining)}结束。到教室后拍一张现场照片就行。</p>
        </div>
        <div className="row wrap">
          <Link to="/checkin?go=evening" className="btn btn-primary btn-lg">
            <Icon name="camera" />
            拍照签到
          </Link>
          <Link to="/checkin?go=venue" className="btn btn-ghost btn-lg">
            去大创场地
          </Link>
        </div>
      </>
    );
  if (p.kind === "evening-done")
    return (
      <>
        <div className="row wrap">
          <span className="tag tag-ok">
            <Icon name="check" size={14} stroke={2.2} />
            今晚签到了
          </span>
          {window}
        </div>
        <div className="stack" style={{ gap: 4 }}>
          <p className="hero-title num">
            {clock(p.inAt)} – {p.outAt ? clock(p.outAt) : "进行中"}
          </p>
          <p className="small sub">{p.auto ? "这次没有签退，按结束时间记的。下次离开前记得拍一张。" : "今天的格子已经亮了。去大创场地继续学的话，可以再签一次场地。"}</p>
        </div>
        <div className="row wrap">
          <Link to="/checkin?go=venue" className="btn btn-ghost btn-lg">
            场地签到
          </Link>
        </div>
      </>
    );
  if (p.kind === "evening-later")
    return (
      <>
        <div className="row wrap">
          <span className="tag">今晚有晚自习</span>
          {window}
        </div>
        <div className="stack" style={{ gap: 4 }}>
          <p className="hero-title">{clock(p.opensAt)} 起可以签到</p>
          <p className="small sub">在大创场地学习的话，现在就可以签场地。</p>
        </div>
        <div className="row wrap">
          <Link to="/checkin?go=venue" className="btn btn-ghost btn-lg">
            场地签到
          </Link>
        </div>
      </>
    );
  return (
    <>
      <div className="row wrap">
        <span className="tag">今天没有晚自习</span>
        {p.next && <span className="small sub">下次：{p.next} {a}</span>}
      </div>
      <div className="stack" style={{ gap: 4 }}>
        <p className="hero-title">去大创场地学一会儿？</p>
        <p className="small sub">进场拍照签到，离开拍照签退，当天 23:59 自动结束。</p>
      </div>
      <div className="row wrap">
        <Link to="/checkin?go=venue" className="btn btn-primary btn-lg">
          <Icon name="camera" />
          场地签到
        </Link>
      </div>
    </>
  );
}

function NextCard({ item, i }: { item: NextItem; i: number }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const u = item.next;
  const markDone = async () => {
    if (!u) return;
    setBusy(true);
    try {
      const r = await api<{ next: { title: string } | null }>(`/api/courses/${item.slug}/units/${u.id}`, { method: "PUT", body: { done: true } });
      // 先在本地换成下一步，接口刷新回来再校正
      mutate<{ today: string; items: NextItem[] }>("/api/learning/next", (old) =>
        old ? { ...old, items: old.items.map((x) => (x.slug === item.slug ? { ...x, next: (r.next as NextItem["next"]) ?? null } : x)).filter((x) => x.next) } : old,
      );
      toast(r.next ? `完成了。下一步：${r.next.title}` : `${item.title} 全部学完了`);
      refreshLearning();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="card next-card rise" style={{ "--i": i } as React.CSSProperties} data-vt-host>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="course-code">{courseCode({ slug: item.slug, university: universityOf(item.slug) })}</span>
        <span className="xsmall sub num">
          {item.progress.doneUnits} / {item.progress.units} 单元
        </span>
      </div>
      <Link to={`/courses/${item.slug}`} vt="course-title" style={{ fontSize: 15, lineHeight: "22px", fontWeight: 600, color: "var(--ink)" }}>
        <span data-vt>{item.title}</span>
      </Link>
      <Bar ratio={item.progress.ratio} label={`${item.title} 进度`} />
      {u && (
        <div className="next-step">
          <span className="kind-icon" aria-hidden="true">
            <Icon name={KIND_ICON[u.kind] ?? "book"} size={18} />
          </span>
          <span className="grow stack" style={{ gap: 2 }}>
            <span className="xsmall sub">
              下一步 · {UNIT_KIND_LABEL[u.kind]} · {u.periods} 课时
            </span>
            <span style={{ fontSize: 15, lineHeight: "22px", fontWeight: 500 }}>{u.title}</span>
          </span>
          <button type="button" className="check-btn next" aria-label={`标记完成：${u.title}`} aria-pressed={false} disabled={busy} onClick={markDone}>
            <Icon name="check" size={18} stroke={2} />
          </button>
        </div>
      )}
    </article>
  );
}

/** 课号标签要用学校名；首页接口没带，按 slug 查一下课程目录（已经打包在前端里）。 */
function universityOf(slug: string) {
  return getCourse(slug)?.university ?? "";
}

function NoticeRow({ notices, today, error, retry }: { notices?: Notice[]; today?: string; error?: Error; retry: () => void }) {
  if (error) return <ErrorBox error={error} onRetry={retry} />;
  if (!notices) return <SkeletonCards n={2} h={180} />;
  const plain = notices.filter((n) => n.kind === "notice").slice(0, 3);
  const comps = notices
    .filter((n) => n.kind === "competition" && (!n.deadline || !today || n.deadline >= today))
    .sort((x, y) => (x.deadline ?? "9999").localeCompare(y.deadline ?? "9999"));
  const comp = comps[0];
  if (!plain.length && !comp) return null;
  return (
    <section className="grid-2" aria-label="公告与比赛">
      {plain.length > 0 && (
        <div className="card stack" style={{ gap: 6 }}>
          <div className="section-head" style={{ marginBottom: 2 }}>
            <h2 className="h3" style={{ fontSize: 18 }}>
              公告
            </h2>
            <Link to="/notices" className="more-link" style={{ minHeight: 0 }}>
              全部
            </Link>
          </div>
          {plain.map((n) => (
            <Link key={n.id} to="/notices" className="list-row" style={{ color: "var(--ink)", alignItems: "flex-start" }}>
              {n.pinned && <span className="tag tag-accent">置顶</span>}
              <span className="grow stack" style={{ gap: 2 }}>
                <span style={{ fontSize: 15, lineHeight: "22px", fontWeight: 500 }}>{n.title}</span>
                {n.body && <span className="small sub ellipsis">{n.body}</span>}
              </span>
              <span className="xsmall sub" style={{ flexShrink: 0, lineHeight: "22px" }}>
                {longDay(new Date(n.createdAt + 8 * 3_600_000).toISOString().slice(0, 10), false)}
              </span>
            </Link>
          ))}
        </div>
      )}
      {comp && <CompetitionTeaser n={comp} today={today} more={comps.length - 1} />}
    </section>
  );
}

function CompetitionTeaser({ n, today, more }: { n: Notice; today?: string; more: number }) {
  const days = n.deadline && today ? daysBetween(today, n.deadline) : null;
  return (
    <Link to="/notices" className="night-card">
      <span className="mini-wall" aria-hidden="true">
        {Array.from({ length: 36 }, (_, j) => (
          <i key={j} style={{ background: `var(--n${(j * 13 + j * j) % 5})` }} />
        ))}
      </span>
      <span className="tag" style={{ position: "relative", alignSelf: "flex-start", background: "var(--night-tag)", color: "var(--night-tag-ink)", fontWeight: 600 }}>
        比赛
      </span>
      <span className="stack" style={{ position: "relative", gap: 4, maxWidth: "70%" }}>
        <span style={{ fontSize: 20, lineHeight: "28px", fontWeight: 700 }}>{n.title}</span>
        {n.body && (
          <span className="small night-sub" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {n.body}
          </span>
        )}
      </span>
      <span className="row" style={{ position: "relative", marginTop: "auto", justifyContent: "space-between", alignItems: "flex-end" }}>
        <span className="row" style={{ alignItems: "baseline", gap: 6 }}>
          {days !== null ? (
            <>
              <span className="big-num" style={{ color: "var(--night-accent)" }}>
                {days}
              </span>
              <span className="small night-sub">
                天后截止{n.joined ? " · 你已登记" : n.entries.length ? ` · ${n.entries.length} 人登记` : ""}
              </span>
            </>
          ) : (
            <span className="small night-sub">{n.joined ? "你已登记" : "长期有效"}</span>
          )}
        </span>
        <span className="btn btn-sm" style={{ background: "var(--night-ink)", color: "var(--night)", height: 40 }}>
          {more > 0 ? `还有 ${more} 场` : "看看"}
        </span>
      </span>
    </Link>
  );
}

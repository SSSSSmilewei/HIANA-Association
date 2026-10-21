import { useState } from "react";
import { ACCESS_LABEL, UNIT_KIND_LABEL, nextUnit, periodsToHours, progress, weeksToFinish } from "../../shared/courses";
import { api, mutate, useApi } from "../api";
import { DIFFICULTY, courseCode, refreshLearning } from "../courseMeta";
import { Icon } from "../icons";
import { Link } from "../router";
import type { CourseDetail } from "../types";
import { Empty, ErrorBox, Ring, Seg, Skeleton, useConfirm, useTitle, useToast } from "../ui";

const PACE_KEY = "hiana-pace";
function readPace(slug: string): number {
  try {
    const v = Number(JSON.parse(localStorage.getItem(PACE_KEY) ?? "{}")[slug]);
    return [4, 6, 8, 10].includes(v) ? v : 6;
  } catch {
    return 6;
  }
}
function savePace(slug: string, v: number) {
  try {
    const all = JSON.parse(localStorage.getItem(PACE_KEY) ?? "{}");
    all[slug] = v;
    localStorage.setItem(PACE_KEY, JSON.stringify(all));
  } catch {
    /* 存不了也没关系 */
  }
}

const AV_COLORS = ["#B8460B", "#6B5A8E", "#3E6E8C", "#5E7A3A", "#8C3E5E"];

export function CoursePage({ slug }: { slug: string }) {
  const key = `/api/courses/${slug}`;
  const { data, error, reload } = useApi<CourseDetail>(key);
  const toast = useToast();
  const confirm = useConfirm();
  const [pace, setPace] = useState(() => readPace(slug));
  const [all, setAll] = useState(false);
  useTitle(data?.course.title ?? "课程");

  if (error && !data)
    return (
      <div className="page">
        <BackLink />
        {error.status === 404 ? <Empty title="没有这门课">可能链接写错了。</Empty> : <ErrorBox error={error} onRetry={reload} />}
      </div>
    );
  if (!data)
    return (
      <div className="page" aria-busy="true">
        <BackLink />
        <Skeleton h={18} w={220} />
        <Skeleton h={44} w={420} />
        <Skeleton h={120} />
        <Skeleton h={420} r={24} />
      </div>
    );

  const c = data.course;
  const doneSet = new Set(Object.keys(data.done));
  const p = progress(c, doneSet);
  const next = nextUnit(c, doneSet);
  const weeks = weeksToFinish(p.totalPeriods - p.donePeriods, pace);
  const st = data.enrollment?.status;
  const shown = all || c.units.length <= 12 ? c.units : c.units.slice(0, 10);

  const toggle = async (unitId: string, done: boolean) => {
    // 乐观更新：先在本地打勾，失败再撤回
    mutate<CourseDetail>(key, (old) => {
      if (!old) return old;
      const d = { ...old.done };
      if (done) d[unitId] = Date.now();
      else delete d[unitId];
      return { ...old, done: d, enrollment: old.enrollment ?? { status: "active", startedAt: Date.now() } };
    });
    try {
      const r = await api<{ next: { title: string } | null; progress: { doneUnits: number; units: number } }>(`${key}/units/${unitId}`, { method: "PUT", body: { done } });
      if (done && !r.next) toast(`${c.title} 全部学完了`);
      refreshLearning();
    } catch (e) {
      toast((e as Error).message, "error");
      void reload();
    }
  };

  const setStatus = async (status: "active" | "paused") => {
    if (status === "paused" && !(await confirm({ title: "暂停这门课？", body: "暂停后首页不再显示它的下一步，进度都会保留，随时可以继续。", ok: "暂停" }))) return;
    try {
      await api(`${key}/enrollment`, { method: "PUT", body: { status } });
      toast(status === "active" ? (st === "paused" ? "继续学这门课" : "选上了") : "已暂停");
      refreshLearning();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <div className="page">
      <BackLink />
      <div className="split">
        <header className="split-main stack" style={{ gap: 12 }}>
          <span className="course-code">
            {courseCode(c)} · {c.license.split("；")[0]}
          </span>
          <h1 className="h1" style={{ viewTransitionName: "course-title" }}>
            {c.title}
          </h1>
          {c.titleEn && (
            <p className="small sub">
              {c.titleEn} · {c.university}
            </p>
          )}
          <p className="pretty" style={{ fontSize: 16, lineHeight: "27px", marginTop: 4 }}>
            {c.summary}
          </p>
          {c.why && (
            <div className="why-box" style={{ marginTop: 6 }}>
              <Icon name="star" style={{ color: "var(--accent-text)", flexShrink: 0, marginTop: 2 }} />
              <span className="stack" style={{ gap: 2 }}>
                <span className="small" style={{ fontWeight: 600, color: "var(--accent-text)" }}>
                  为什么学
                </span>
                <span style={{ fontSize: 15, lineHeight: "24px" }}>{c.why}</span>
              </span>
            </div>
          )}
          <div className="grid-cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", gap: 12, marginTop: 4 }}>
            <InfoTile icon="video" title="视频" text={c.access.video} />
            <InfoTile icon="code" title="作业" text={c.access.homework} />
          </div>
          <div className="row wrap" style={{ gap: 6 }}>
            <span className="tag">{DIFFICULTY[c.difficulty]}</span>
            <span className="tag">{ACCESS_LABEL[c.access.level]}</span>
            <span className="tag">先修：{c.prerequisites}</span>
            <span className="tag">语言：{c.language}</span>
          </div>
        </header>

        <section className="split-side card stack" aria-label="我的进度" style={{ gap: 18, padding: 22, borderRadius: 24 }}>
          <div className="row" style={{ gap: 18 }}>
            <Ring ratio={p.ratio} label={`已完成 ${Math.round(p.ratio * 100)}%`}>
              <text x="48" y="54" textAnchor="middle" className="ring-text">
                {Math.round(p.ratio * 100)}%
              </text>
            </Ring>
            <span className="stack" style={{ gap: 4 }}>
              <span style={{ fontSize: 15, lineHeight: "22px", fontWeight: 600 }}>
                已学 {p.doneUnits} / {p.units} 单元
              </span>
              <span className="small sub num">
                {p.donePeriods} / {p.totalPeriods} 课时 · 约 {periodsToHours(p.totalPeriods)} 小时
              </span>
            </span>
          </div>
          {st !== "done" && (
            <div className="stack" style={{ gap: 8 }}>
              <span className="small sub">每周能学几课时</span>
              <Seg
                label="每周能学几课时"
                flat
                value={pace}
                onChange={(v) => {
                  setPace(v);
                  savePace(slug, v);
                }}
                options={[4, 6, 8, 10].map((v) => ({ value: v, label: <span className="num">{v}</span> }))}
              />
              {weeks !== null && <span style={{ fontSize: 14, lineHeight: "20px" }}>照这个速度，还要 {weeks} 周学完</span>}
            </div>
          )}
          {data.peers.length > 0 && (
            <div className="row" style={{ paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <span className="avatars" aria-hidden="true">
                {data.peers.slice(0, 3).map((n, i) => (
                  <span key={n + i} style={{ background: AV_COLORS[i % AV_COLORS.length] }}>
                    {n.slice(0, 1)}
                  </span>
                ))}
              </span>
              <span className="small sub">
                {data.peers.slice(0, 2).join("、")}
                {data.peers.length > 2 ? ` 等 ${data.peers.length} 人` : ""}也在学
              </span>
            </div>
          )}
          {!st || st === "dropped" ? (
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setStatus("active")}>
              选这门课
            </button>
          ) : st === "paused" ? (
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setStatus("active")}>
              继续学
            </button>
          ) : st === "active" ? (
            <button type="button" className="btn btn-quiet" onClick={() => setStatus("paused")}>
              先暂停这门课
            </button>
          ) : (
            <span className="tag tag-ok" style={{ alignSelf: "flex-start" }}>
              <Icon name="check" size={14} stroke={2.2} />
              学完了
            </span>
          )}
        </section>
      </div>

      <section className="section" aria-labelledby="units-h">
        <div className="section-head">
          <h2 id="units-h" className="h2">
            单元
          </h2>
          <span className="small sub">点圆圈标记完成，会记进热力图的“站内学习”</span>
        </div>
        <ol className="card card-flush unit-list" style={{ borderRadius: 24 }}>
          {shown.map((u) => {
            const done = doneSet.has(u.id);
            const isNext = next?.id === u.id;
            return (
              <li key={u.id} className={`unit${done ? " is-done" : ""}${isNext ? " is-next" : ""}`}>
                <button
                  type="button"
                  className={`check-btn${isNext ? " next" : ""}`}
                  aria-pressed={done}
                  aria-label={`${done ? "取消完成" : "标记完成"}：${u.title}`}
                  onClick={() => toggle(u.id, !done)}
                >
                  {done && <Icon name="check" size={18} stroke={2.4} />}
                </button>
                <span className="unit-body">
                  <span className="row wrap" style={{ gap: 8 }}>
                    <span className="unit-title">{u.title}</span>
                    {isNext && <span className="tag tag-solid">下一步</span>}
                  </span>
                  <span className="small sub">
                    {UNIT_KIND_LABEL[u.kind]} · {u.periods} 课时{u.note ? ` · ${u.note}` : ""}
                  </span>
                </span>
                <span className="row wrap" style={{ gap: 6 }}>
                  {u.links.map((l) => (
                    <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="ext-link">
                      {l.label}
                      <Icon name="external" size={12} stroke={2.2} />
                    </a>
                  ))}
                </span>
              </li>
            );
          })}
        </ol>
        {c.units.length > 12 && (
          <button type="button" className="btn btn-ghost" style={{ alignSelf: "center", borderRadius: 22 }} onClick={() => setAll(!all)}>
            {all ? "收起" : `展开剩下的 ${c.units.length - 10} 个单元`}
          </button>
        )}
      </section>

      {c.resources.length > 0 && (
        <section className="section" aria-labelledby="res-h">
          <h2 id="res-h" className="h3">
            资料
          </h2>
          <div className="row wrap" style={{ gap: 8 }}>
            {c.resources.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="ext-link">
                {l.label}
                <Icon name="external" size={12} stroke={2.2} />
              </a>
            ))}
          </div>
          <p className="xsmall sub">课程内容版权：{c.license}</p>
        </section>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/courses" className="row sub" style={{ alignSelf: "flex-start", minHeight: 44, gap: 6, fontSize: 14 }}>
      <Icon name="arrowLeft" size={16} stroke={2} />
      全部课程
    </Link>
  );
}

function InfoTile({ icon, title, text }: { icon: "video" | "code"; title: string; text: string }) {
  return (
    <div className="card row" style={{ padding: "14px 16px", borderRadius: 16, alignItems: "flex-start", gap: 12 }}>
      <Icon name={icon} style={{ color: "var(--sub)", flexShrink: 0, marginTop: 2 }} />
      <span className="stack" style={{ gap: 2 }}>
        <span className="small" style={{ fontWeight: 600 }}>
          {title}
        </span>
        <span className="small sub">{text}</span>
      </span>
    </div>
  );
}

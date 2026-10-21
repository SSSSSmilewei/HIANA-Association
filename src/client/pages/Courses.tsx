import { useState } from "react";
import { ACCESS_LABEL, AREAS, type AreaId, periodsToHours } from "../../shared/courses";
import { api, useApi } from "../api";
import { DIFFICULTY, courseCode, refreshLearning } from "../courseMeta";
import { Link, navigate } from "../router";
import type { CourseSummary } from "../types";
import { Bar, Empty, ErrorBox, Seg, SkeletonCards, useTitle, useToast } from "../ui";

export function CoursesPage() {
  useTitle("课程");
  const { data, error, reload } = useApi<CourseSummary[]>("/api/courses");
  const [area, setArea] = useState<AreaId | "all">("all");
  const keep = (c: CourseSummary) => area === "all" || c.area === area;
  const required = (data ?? []).filter((c) => c.required && keep(c));
  const optional = (data ?? []).filter((c) => !c.required && keep(c));

  return (
    <div className="page">
      <header className="page-head">
        <div className="stack" style={{ gap: 8 }}>
          <span className="eyebrow">{data ? `${data.length} 门课 · 都是公开课，中文导读由协会写` : " "}</span>
          <h1 className="h1">课程</h1>
          <p className="lead">先学三门必修：Missing Semester 打基础，Git 学会交作业，然后跟主线 CS50x。其余的按兴趣选，选了的课会出现在首页“接下来”里。</p>
        </div>
      </header>

      <Seg
        label="按方向筛选"
        className="seg-scroll"
        value={area}
        onChange={setArea}
        options={[{ value: "all" as const, label: "全部" }, ...AREAS.map((a) => ({ value: a.id, label: a.name }))]}
      />

      {error && !data ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : !data ? (
        <SkeletonCards n={6} h={280} />
      ) : (
        <>
          {required.length > 0 && (
            <section className="section" aria-labelledby="req-h">
              <h2 id="req-h" className="h2 row" style={{ gap: 10, fontSize: 18 }}>
                必修<span className="small sub" style={{ fontWeight: 400 }}>按这个顺序学</span>
              </h2>
              <div className="grid-cards">
                {required.map((c, i) => (
                  <CourseCard key={c.slug} c={c} i={i} step={(data.filter((x) => x.required).indexOf(c) + 1).toString().padStart(2, "0")} />
                ))}
              </div>
            </section>
          )}
          <section className="section" aria-labelledby="opt-h">
            {optional.length > 0 ? (
              <>
                <h2 id="opt-h" className="h2 row" style={{ gap: 10, fontSize: 18 }}>
                  选修<span className="small sub" style={{ fontWeight: 400 }}>学完 CS50x 前两周再选更合适</span>
                </h2>
                <div className="grid-cards">
                  {optional.map((c, i) => (
                    <CourseCard key={c.slug} c={c} i={i + required.length} />
                  ))}
                </div>
              </>
            ) : (
              required.length === 0 && (
                <div className="card">
                  <Empty title="这个方向还没有课">{AREAS.find((a) => a.id === area)?.blurb}。想学什么，可以在公告区跟会长提。</Empty>
                </div>
              )
            )}
          </section>
        </>
      )}
    </div>
  );
}

function CourseCard({ c, i, step }: { c: CourseSummary; i: number; step?: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const st = c.enrollment?.status;
  const enrolled = st === "active" || st === "done";
  const enroll = async () => {
    setBusy(true);
    try {
      await api(`/api/courses/${c.slug}/enrollment`, { method: "PUT", body: { status: "active" } });
      toast(`选上了：${c.title}`);
      refreshLearning();
      navigate(`/courses/${c.slug}`);
    } catch (e) {
      toast((e as Error).message, "error");
      setBusy(false);
    }
  };
  return (
    <article className="card course-card rise" style={{ "--i": i } as React.CSSProperties} data-vt-host>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="course-code">{courseCode(c)}</span>
        {step ? (
          <span className="course-code" style={{ color: "var(--accent-text)" }}>
            {step}
          </span>
        ) : (
          c.learners > 0 && <span className="xsmall sub">{c.learners} 人在学</span>
        )}
      </div>
      <Link to={`/courses/${c.slug}`} vt="course-title" className="course-title">
        <span data-vt>{c.title}</span>
      </Link>
      <p className="small sub pretty" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {c.summary}
      </p>
      <div className="row wrap" style={{ gap: 6, marginTop: "auto" }}>
        <span className="tag">
          {c.progress.totalPeriods} 课时 · 约 {periodsToHours(c.progress.totalPeriods)} 小时
        </span>
        <span className="tag">{DIFFICULTY[c.difficulty]}</span>
        <span className="tag">{ACCESS_LABEL[c.access.level]}</span>
      </div>
      <div className="course-foot">
        {enrolled || st === "paused" ? (
          <>
            <span className="grow stack" style={{ gap: 6 }}>
              <span className="xsmall sub">
                {st === "done" ? "学完了" : st === "paused" ? "暂停中" : "已学"} {c.progress.doneUnits} / {c.progress.units} 单元
              </span>
              <Bar ratio={c.progress.ratio} label={`${c.title} 进度`} />
            </span>
            <Link to={`/courses/${c.slug}`} className="btn btn-soft">
              {st === "done" ? "回顾" : "继续"}
            </Link>
          </>
        ) : (
          <>
            <span className="grow small sub">先修：{c.prerequisites}</span>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={enroll}>
              选这门课
            </button>
          </>
        )}
      </div>
    </article>
  );
}

import { useMemo } from "react";
import type { CheckinState, HeatmapPayload, Me } from "../../shared/api";
import { addDays, clip, overview } from "../../shared/heatmap";
import { useApi } from "../api";
import { HeatmapGrid } from "../components/Heatmap";
import { CURRENT_WEEK, MAIN_TRACK } from "../content";
import { Link } from "../router";

export function HomePage({ me }: { me: Me }) {
  const hm = useApi<HeatmapPayload>("/api/heatmap");
  const ck = useApi<CheckinState>("/api/checkin");
  const grid = useMemo(() => (hm.data ? overview(hm.data.series, hm.data.today, 17) : null), [hm.data]);
  const week = MAIN_TRACK.weeks[CURRENT_WEEK];
  const recent = hm.data
    ? new Set(hm.data.series.flatMap((s) => (s.error ? [] : Object.keys(clip(s.days, addDays(hm.data!.today, -6), hm.data!.today))))).size
    : null;

  return (
    <main className="wrap page-pad stack-xl">
      <section className="two-col">
        <div className="stack-m">
          <p className="muted">{me.member ? `${me.member.name}，` : ""}这周的主线是：</p>
          <h1 className="hero-title">
            {MAIN_TRACK.name} 第 {CURRENT_WEEK} 周：{week.title}
          </h1>
          <p className="lede">{week.summary}</p>
          <div className="route" aria-label={`${MAIN_TRACK.name} 路线进度`}>
            <div className="route-bar">
              {MAIN_TRACK.weeks.map((w, i) => (
                <span key={w.title} className={i < CURRENT_WEEK ? "done" : i === CURRENT_WEEK ? "cur" : ""} title={`第 ${i} 周：${w.title}`} />
              ))}
            </div>
            <div className="row-between xsmall muted">
              <span>{CURRENT_WEEK > 0 ? `第 ${CURRENT_WEEK - 1} 周已过` : "刚开始"}</span>
              <span>
                你在第 {CURRENT_WEEK} 周，共 {MAIN_TRACK.weeks.length} 周
              </span>
            </div>
          </div>
          <div className="row-wrap">
            <a className="btn btn-red" href={week.lectureCn} target="_blank" rel="noreferrer">
              看讲座：B 站
            </a>
            <a className="btn btn-outline" href={week.official} target="_blank" rel="noreferrer">
              官方课程页
            </a>
          </div>
        </div>

        <aside className="stack-m">
          <div className="panel stack-s">
            <div className="row-between">
              <h2 className="h3">今晚晚自习</h2>
              {ck.data && <span className="xsmall muted">{ck.data.window.replace("-", " 到 ")}</span>}
            </div>
            {ck.data?.checkedAt ? <p className="ok-text">今晚已打卡。</p> : <p className="small">到了以后打卡，记录会交给会长。</p>}
            <Link to="/checkin" className="btn btn-outline-red">
              {ck.data?.checkedAt ? "查看打卡" : "晚自习打卡"}
            </Link>
          </div>
          <div className="stack-s">
            <div className="row-between">
              <h2 className="h3">最近 17 周</h2>
              <Link to="/heatmap" className="small">
                完整热力图
              </Link>
            </div>
            {grid ? <HeatmapGrid grid={grid} cell={11} label="最近 17 周学习热力图" /> : <p className="muted small">正在加载…</p>}
            {recent !== null && <p className="xsmall muted">最近 7 天有 {recent} 天有学习记录。</p>}
          </div>
        </aside>
      </section>

      <section className="stack-s" aria-labelledby="tasks">
        <h2 id="tasks" className="h2">
          本周任务
        </h2>
        <ol className="tasks">
          {week.tasks.map((t, i) => (
            <li key={t.title}>
              <span className="task-num">{i + 1}</span>
              <div>
                <b>{t.title}</b>
                <p className="muted small">{t.detail}</p>
              </div>
              {t.href ? (
                <a href={t.href} target="_blank" rel="noreferrer" className="small">
                  打开
                </a>
              ) : (
                <span />
              )}
            </li>
          ))}
        </ol>
        <p className="xsmall muted">课程内容改写自哈佛 CS50x，遵循 CC BY-NC-SA 4.0，仅供协会学习使用。</p>
      </section>
    </main>
  );
}

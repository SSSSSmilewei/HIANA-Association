import { useState } from "react";
import { ASSOCIATION } from "../../shared/association";
import { useApi } from "../api";
import { Icon } from "../icons";
import { Link, useQuery } from "../router";
import { ErrorBox, Skeleton, useTitle } from "../ui";

/**
 * 给学校看的签到表（晚自习请假的凭据）：按人汇总，再按日期列出每次签到的时间、照片和手写签名，
 * 最后列出每个晚自习日没签到的人。浏览器“打印”就能打印或存成 PDF（打印时只留表格）。
 */

interface ReportRecord {
  day: string;
  kind: "evening" | "venue";
  studentNo: string;
  name: string;
  className: string;
  inAt: number;
  outAt: number | null;
  status: "open" | "closed" | "auto_closed";
  minutes: number;
  inPhoto: string | null;
  outPhoto: string | null;
  sign: string | null;
}

interface Report {
  from: string;
  to: string;
  kind: "evening" | "venue" | null;
  rule: { days: number[]; window: [string, string] };
  records: ReportRecord[];
  people: { studentNo: string; name: string; className: string; evening: number; venue: number; minutes: number }[];
  absent: { day: string; names: string[] }[];
}

const KIND = { evening: "晚自习", venue: "大创场地" };
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

function clock(ms: number) {
  return new Date(ms + 8 * 3_600_000).toISOString().slice(11, 16);
}
function dayLabel(d: string) {
  return `${Number(d.slice(5, 7))} 月 ${Number(d.slice(8, 10))} 日（周${WEEK[new Date(`${d}T00:00:00Z`).getUTCDay()]}）`;
}
function hours(min: number) {
  return min ? `${(min / 60).toFixed(1)} 小时` : "—";
}

export function ReportPage() {
  const from = useQuery("from") ?? "";
  const to = useQuery("to") ?? "";
  const kind = useQuery("kind") ?? "";
  const qs = new URLSearchParams({ ...(from && { from }), ...(to && { to }), ...(kind && { kind }) }).toString();
  const { data, error, reload } = useApi<Report>(`/api/admin/attendance/report${qs ? `?${qs}` : ""}`);
  const [photos, setPhotos] = useState(true);
  const [signs, setSigns] = useState(true);
  const title = data?.kind ? `${KIND[data.kind]}签到表` : "签到表";
  useTitle(title);

  if (error && !data)
    return (
      <div className="page">
        <ErrorBox error={error} onRetry={reload} />
      </div>
    );
  if (!data)
    return (
      <div className="page">
        <Skeleton h={40} w="40%" />
        <Skeleton h={400} />
      </div>
    );

  const days = [...new Set(data.records.map((r) => r.day))].sort();
  const people = data.people.filter((p) => p.evening + p.venue > 0).concat(data.people.filter((p) => p.evening + p.venue === 0));

  return (
    <div className="page report-page">
      <div className="row wrap no-print" style={{ gap: 12, justifyContent: "space-between" }}>
        <Link to="/admin" className="back-link">
          <Icon name="arrowLeft" size={16} stroke={2} />
          今日签到
        </Link>
        <div className="row wrap" style={{ gap: 16 }}>
          <label className="row small" style={{ gap: 6 }}>
            <input type="checkbox" checked={photos} onChange={(e) => setPhotos(e.target.checked)} />
            带照片
          </label>
          <label className="row small" style={{ gap: 6 }}>
            <input type="checkbox" checked={signs} onChange={(e) => setSigns(e.target.checked)} />
            带签名
          </label>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            打印 / 存成 PDF
          </button>
        </div>
      </div>

      <article className="report">
        <header className="report-head">
          <h1>
            {ASSOCIATION.name}（海纳协会）{title}
          </h1>
          <p>
            {dayLabel(data.from)} 至 {dayLabel(data.to)}
            {data.kind !== "venue" && ` · 晚自习：每周${data.rule.days.map((d) => WEEK[d % 7]).join("、")} ${data.rule.window[0]}–${data.rule.window[1]}`}
          </p>
          <p>签到、签退都在现场拍照；签到时本人手写签名。时长按签到到签退计算（晚自习忘记签退算到结束时刻）。</p>
        </header>

        <section>
          <h2>汇总</h2>
          <table className="report-table">
            <thead>
              <tr>
                <th>学号</th>
                <th>姓名</th>
                <th>班级</th>
                {data.kind !== "venue" && <th>晚自习</th>}
                {data.kind !== "evening" && <th>场地</th>}
                <th>累计时长</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.studentNo}>
                  <td className="num">{p.studentNo}</td>
                  <td>{p.name}</td>
                  <td>{p.className}</td>
                  {data.kind !== "venue" && <td className="num">{p.evening} 次</td>}
                  {data.kind !== "evening" && <td className="num">{p.venue} 次</td>}
                  <td className="num">{hours(p.minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {days.map((d) => (
          <section key={d} className="report-day">
            <h2>{dayLabel(d)}</h2>
            <table className="report-table">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>学号</th>
                  {!data.kind && <th>场景</th>}
                  <th>签到</th>
                  <th>签退</th>
                  <th>时长</th>
                  {photos && <th>签到照片</th>}
                  {photos && <th>签退照片</th>}
                  {signs && <th>签名</th>}
                </tr>
              </thead>
              <tbody>
                {data.records
                  .filter((r) => r.day === d)
                  .map((r) => (
                    <tr key={`${r.studentNo}-${r.inAt}`}>
                      <td>{r.name}</td>
                      <td className="num">{r.studentNo}</td>
                      {!data.kind && <td>{KIND[r.kind]}</td>}
                      <td className="num">{clock(r.inAt)}</td>
                      <td className="num">{r.status === "closed" && r.outAt ? clock(r.outAt) : r.status === "open" ? "进行中" : "未签退"}</td>
                      <td className="num">{r.minutes} 分钟</td>
                      {photos && <td>{r.inPhoto ? <img className="report-photo" src={`/api/files/${r.inPhoto}`} alt={`${r.name} 签到照片`} /> : "—"}</td>}
                      {photos && <td>{r.outPhoto ? <img className="report-photo" src={`/api/files/${r.outPhoto}`} alt={`${r.name} 签退照片`} /> : "—"}</td>}
                      {signs && <td>{r.sign ? <img className="report-sign" src={`/api/files/${r.sign}`} alt={`${r.name} 的签名`} /> : "—"}</td>}
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        ))}
        {!days.length && <p>这段时间没有签到记录。</p>}

        {data.absent.length > 0 && (
          <section>
            <h2>晚自习未签到</h2>
            <table className="report-table">
              <tbody>
                {data.absent.map((a) => (
                  <tr key={a.day}>
                    <td style={{ whiteSpace: "nowrap" }}>{dayLabel(a.day)}</td>
                    <td>{a.names.length ? a.names.join("、") : "全部签到"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <footer className="report-foot">
          <span>负责人签字：</span>
          <span>日期：</span>
          <span className="small">导出时间 {new Date().toLocaleString("zh-CN", { hour12: false })}</span>
        </footer>
      </article>
    </div>
  );
}

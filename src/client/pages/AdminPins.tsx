import { relativeTime, useApi } from "../api";
import type { Pin } from "../components/Pins";
import { Link } from "../router";
import { Empty, ErrorBox, SkeletonCards, useTitle } from "../ui";

/** 管理后台：蓝色钉子收件箱。没解决的在前，点进去跳到讲义上的那颗钉子。 */
export function AdminPinsPage() {
  useTitle("蓝色钉子");
  const { data, error, reload } = useApi<(Pin & { courseTitle: string; itemTitle: string })[]>("/api/admin/pins");
  return (
    <div className="page">
      <header className="page-head">
        <div className="stack" style={{ gap: 6 }}>
          <h1 className="h1">蓝色钉子</h1>
          <p className="sub">成员钉在讲义上的问题。没解决的排在前面，点进去在原处回复。</p>
        </div>
      </header>
      {error && !data ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : !data ? (
        <SkeletonCards n={3} h={90} />
      ) : !data.length ? (
        <div className="card">
          <Empty title="还没有人钉问题" />
        </div>
      ) : (
        <ul className="card card-flush pin-list">
          {data.map((p) => (
            <li key={p.id}>
              <Link to={`/courses/${p.course}/learn/${p.page}?pin=${p.id}`} className="pin-row">
                <span className={`pin-badge ${p.status === "resolved" ? "resolved" : p.answered ? "answered" : "open"}`}>{p.messages.length}</span>
                <span className="pin-row-main">
                  <span className="small sub">
                    {p.courseTitle} · {p.itemTitle}
                    {p.anchorLabel ? ` · ${p.anchorLabel}` : ""}
                  </span>
                  <span className="clamp-2">{p.messages[0]?.body}</span>
                  <span className="small sub">
                    {p.author} · {relativeTime(p.createdAt)}
                  </span>
                </span>
                <span className="pin-row-meta small sub num">
                  {p.status === "resolved" ? "已解决" : p.answered ? "有人回了" : "等回复"}
                  {p.votes > 0 && ` · ${p.votes} 人也想问`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

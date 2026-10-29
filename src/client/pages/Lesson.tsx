import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ITEM_KIND_LABEL } from "../../shared/light";
import type { Item } from "../../shared/package";
import { Prose, Toc, type TocItem } from "../components/Prose";
import { useCourse } from "../courseData";
import { Icon } from "../icons";
import { loadPage, locate } from "../library";
import { PracticeList } from "../practice/Practice";
import { Link } from "../router";
import { Empty, ErrorBox, Skeleton, useTitle } from "../ui";

/** 条目页：/courses/:slug/learn/:page（:page 是页面 id；没有页面的条目用条目 id） */
export function LessonPage({ slug, page }: { slug: string; page: string }) {
  const { pkg, pkgError, state, toggle, solve, reload } = useCourse(slug);
  const at = pkg ? locate(pkg, page) : undefined;
  const item = at?.item;
  const pageTitle = item?.pages.find((p) => p.id === at?.pageId)?.title;
  useTitle(item ? (pageTitle && pageTitle !== item.title ? `${item.title} · ${pageTitle}` : item.title) : "讲义");
  const [toc, setToc] = useState<TocItem[]>([]);
  const tabs = useRef<HTMLElement>(null);
  useEffect(() => {
    tabs.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [page]);
  const onToc = useCallback((t: TocItem[]) => setToc(t), []);
  const source = useMemo(() => (pkg && at?.pageId ? () => loadPage(slug, pkg, at.pageId as string) : null), [pkg, slug, at?.pageId]);

  if (pkgError)
    return (
      <div className="page">
        <ErrorBox error={pkgError} onRetry={reload} />
      </div>
    );
  if (!pkg)
    return (
      <div className="page" aria-busy="true">
        <Skeleton h={20} w={240} />
        <Skeleton h={36} w="60%" />
        <Skeleton h={400} />
      </div>
    );
  if (!item || !at)
    return (
      <div className="page">
        <Empty title="没有这一页" />
      </div>
    );

  const module = pkg.modules.find((m) => m.items.includes(item));
  const flat = pkg.modules.flatMap((m) => m.items.flatMap((it) => (it.pages.length ? it.pages.map((p) => ({ item: it, id: p.id, title: p.title })) : [{ item: it, id: it.id, title: it.title }])));
  const idx = flat.findIndex((x) => x.id === page);
  const prev = flat[idx - 1];
  const next = flat[idx + 1];
  const done = !!state?.done[item.id];
  const solved = new Set(state?.solved[item.id] ?? []);
  const lastPage = !item.pages.length || at.pageId === item.pages[item.pages.length - 1].id;

  return (
    <div className="page lesson-page">
      <nav className="crumbs small" aria-label="位置">
        <Link to={`/courses/${slug}?tab=content`}>{pkg.title}</Link>
        {module && pkg.modules.length > 1 && (
          <>
            <span aria-hidden="true">/</span>
            <span className="sub">{module.title}</span>
          </>
        )}
      </nav>

      <header className="lesson-head">
        <span className="small sub">
          <span className={`kind kind-${item.kind}`}>{ITEM_KIND_LABEL[item.kind]}</span>
          <span className="num"> · {item.periods} 课时</span>
        </span>
        <h1 className="h1">{item.title}</h1>
      </header>

      {item.pages.length > 1 && (
        <nav ref={tabs} className="page-tabs" aria-label="这一项的页面">
          {item.pages.map((p) => (
            <Link key={p.id} to={`/courses/${slug}/learn/${p.id}`} aria-current={p.id === page ? "page" : undefined}>
              {p.title}
            </Link>
          ))}
        </nav>
      )}

      <div className="lesson">
        <div className="lesson-body stack" style={{ gap: 40 }}>
          {source && (
            <article key={page}>
              <Prose source={source} onToc={onToc} dropTitle />
            </article>
          )}
          <Resources item={item} />
          {item.practice.length > 0 && lastPage && (
            <section id="practice" aria-labelledby="practice-h" className="stack" style={{ gap: 16 }}>
              <div className="section-head">
                <h2 id="practice-h" className="h2">
                  练手
                </h2>
                <span className="small sub num">
                  做对 {item.practice.filter((q) => solved.has(q.id)).length} / {item.practice.length}
                </span>
              </div>
              <PracticeList items={item.practice} solved={solved} onSolved={(qid) => solve(item.id, qid)} draftKey={`${slug}/${item.id}`} />
            </section>
          )}
        </div>
        <aside className="lesson-side">
          <Toc items={toc} />
        </aside>
      </div>

      <footer className="lesson-foot">
        <button type="button" className={`btn ${done ? "btn-soft" : "btn-primary"}`} onClick={() => toggle(item.id, !done)}>
          <Icon name="check" size={16} stroke={2.2} />
          {done ? "已完成" : "标记完成"}
        </button>
        {item.practice.length > 0 && !lastPage && (
          <Link to={`/courses/${slug}/learn/${item.pages[item.pages.length - 1].id}#practice`} className="btn btn-quiet">
            去练手（{item.practice.length} 题）
          </Link>
        )}
      </footer>

      <nav className="pager" aria-label="翻页">
        {prev ? (
          <Link to={`/courses/${slug}/learn/${prev.id}`} className="pager-link">
            <span className="small sub">上一页</span>
            <span className="ellipsis">{prev.item === item ? prev.title : prev.item.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={`/courses/${slug}/learn/${next.id}`} className="pager-link pager-next">
            <span className="small sub">下一页</span>
            <span className="ellipsis">{next.item === item ? next.title : next.item.title}</span>
          </Link>
        ) : (
          <Link to={`/courses/${slug}?tab=content`} className="pager-link pager-next">
            <span className="small sub">最后一页</span>
            <span className="ellipsis">回到课程</span>
          </Link>
        )}
      </nav>
      {pkg.license && <p className="small sub">{pkg.license}</p>}
    </div>
  );
}

/** 视频、参考链接、正式提交地址 */
function Resources({ item }: { item: Item }) {
  if (!item.videos.length && !item.links.length && !item.submit) return null;
  return (
    <section className="res-box" aria-label="视频和链接">
      {item.videos.length > 0 && (
        <div className="res-row">
          <span className="res-label">
            <Icon name="video" size={16} />
            视频
          </span>
          <span className="row wrap" style={{ gap: 8 }}>
            {item.videos.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="ext-link">
                {l.label}
                <Icon name="external" size={12} stroke={2.2} />
              </a>
            ))}
          </span>
        </div>
      )}
      {item.links.length > 0 && (
        <div className="res-row">
          <span className="res-label">
            <Icon name="external" size={16} />
            链接
          </span>
          <span className="row wrap" style={{ gap: 8 }}>
            {item.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="ext-link">
                {l.label}
                <Icon name="external" size={12} stroke={2.2} />
              </a>
            ))}
          </span>
        </div>
      )}
      {item.submit && (
        <div className="res-row">
          <span className="res-label">
            <Icon name="flag" size={16} />
            正式提交
          </span>
          <span className="stack" style={{ gap: 4 }}>
            <a href={item.submit.url} target="_blank" rel="noreferrer" className="ext-link">
              {item.submit.label}
              <Icon name="external" size={12} stroke={2.2} />
            </a>
            <span className="small sub">这里的练手题只是热身，作业按原课程的要求在那边完成和提交。</span>
          </span>
        </div>
      )}
    </section>
  );
}

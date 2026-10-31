import { useMemo } from "react";
import { type Block, type BlockNode, type BlockSummary, type CourseProgress, blockPeriods, blockRatio, kindOf, nextCourse, nodeRatio } from "../../shared/blocks";
import { periodsToHours } from "../../shared/courses";
import { useApi } from "../api";
import { Prose } from "../components/Prose";
import { Icon } from "../icons";
import { Link } from "../router";
import { useMe } from "../session";
import { BackLink } from "./Course";
import type { CourseSummary } from "../types";
import { ErrorBox, Skeleton, SkeletonCards, useTitle } from "../ui";

/**
 * 知识块：一个方向的思维导图（格式见 shared/blocks.ts）。
 * 宽屏横向展开成导图，手机上是竖着的大纲树。进度来自 /api/courses（游客没有进度）。
 */

export const BLOCKS_INDEX = "/data/blocks/index.json";

function hoursText(periods: number): string {
  return periods ? `约 ${periodsToHours(periods)} 小时` : "";
}

/** 每门课的完成度：学完 = 1，在学按条目进度，没选 = 0 */
function useCourseProgress(): { progress: CourseProgress } {
  const { data } = useApi<CourseSummary[]>("/api/courses");
  return useMemo(() => {
    const map = data ? new Map(data.map((c) => [c.slug, c])) : null;
    const progress: CourseProgress = (slug) => {
      const c = map?.get(slug);
      if (!c?.enrollment) return 0;
      if (c.enrollment.status === "done") return 1;
      if (c.enrollment.status === "dropped") return 0;
      return c.progress.items > 0 ? c.progress.ratio : 0;
    };
    return { progress };
  }, [data]);
}

/** 课程页、首页上的知识块卡片 */
export function BlockCards({ limit }: { limit?: number }) {
  const { data, error, reload } = useApi<BlockSummary[]>(BLOCKS_INDEX);
  const { progress } = useCourseProgress();
  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <SkeletonCards n={4} h={120} />;
  return (
    <div className="grid-cards block-cards">
      {data.slice(0, limit).map((b) => {
        const started = b.courses.some((s) => progress(s) > 0);
        return (
          <Link key={b.slug} to={`/blocks/${b.slug}`} className="card course-card block-card">
            <span className="course-code">
              <span className="ellipsis">{b.audience}</span>
              {started && <span className="tag tag-accent">在学</span>}
            </span>
            <span className="course-title">{b.title}</span>
            <p className="small sub pretty clamp-2">{b.summary}</p>
            <span className="course-foot small sub">
              <span className="num">{b.courses.length} 门课</span>
              {b.periods > 0 && <span className="num">{hoursText(b.periods)}起</span>}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function BlockPage({ slug }: { slug: string }) {
  const { data: block, error, reload } = useApi<Block>(`/data/blocks/${slug}.json`);
  const { data: all } = useApi<BlockSummary[]>(BLOCKS_INDEX);
  const { progress } = useCourseProgress();
  const { me } = useMe();
  useTitle(block?.title ?? "知识块");

  if (error && !block) return <div className="page">{error.status === 404 ? <ErrorBox error={new Error("没有这个知识块")} /> : <ErrorBox error={error} onRetry={reload} />}</div>;
  if (!block)
    return (
      <div className="page">
        <Skeleton h={40} w="40%" />
        <Skeleton h={320} />
      </div>
    );

  const total = blockPeriods(block);
  const ratio = blockRatio(block, progress);
  const next = nextCourse(block, progress);
  const signedIn = !!me.role;
  const nextBlocks = (block.next ?? []).map((s) => all?.find((b) => b.slug === s)).filter((b): b is BlockSummary => !!b);

  return (
    <div className="page block-page">
      <header className="page-head block-head">
        <BackLink />
        <div className="stack" style={{ gap: 6 }}>
          <h1 className="h1">{block.title}</h1>
          <p className="sub pretty">{block.summary}</p>
          <div className="row wrap small sub" style={{ gap: "4px 16px" }}>
            {block.audience && <span>适合：{block.audience}</span>}
            {total > 0 && <span className="num">必学部分{hoursText(total)}起</span>}
          </div>
        </div>
      </header>

      {signedIn && ratio > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          <span className="small sub num">完成 {Math.round(ratio * 100)}%</span>
          <span className="bar">
            <i style={{ width: `${ratio * 100}%` }} />
          </span>
        </div>
      )}

      {next?.course && (
        <Link to={`/courses/${next.course}`} className="card block-next">
          <span className="small sub">{ratio > 0 ? "接下来" : "从这里开始"}</span>
          <span className="block-next-title">{next.courseTitle ?? next.course}</span>
          {next.note && <span className="small sub">{next.note}</span>}
          <Icon name="arrowRight" size={18} />
        </Link>
      )}

      {block.intro && <Prose source={block.intro} />}

      <section className="section" aria-label="路线">
        <div className="mindmap" role="tree" aria-label={block.title}>
          <div className="mm-root">
            <span className="mm-root-title">{block.title.replace(/知识块$/, "")}</span>
          </div>
          <ul className="mm-children" role="group">
            {block.nodes.map((n, i) => (
              <MapNode key={i} n={n} progress={progress} />
            ))}
          </ul>
        </div>
      </section>

      {nextBlocks.length > 0 && (
        <section className="section" aria-labelledby="next-h">
          <h2 id="next-h" className="h2">
            学完以后
          </h2>
          <div className="row wrap" style={{ gap: 8 }}>
            {nextBlocks.map((b) => (
              <Link key={b.slug} to={`/blocks/${b.slug}`} className="chip">
                {b.title}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MapNode({ n, progress }: { n: BlockNode; progress: CourseProgress }) {
  const kind = kindOf(n);
  const r = nodeRatio(n, progress);
  const done = r !== null && r >= 1;
  const cls = `mm-node mm-${kind}${n.optional ? " is-optional" : ""}${done ? " is-done" : r ? " is-started" : ""}`;

  if (kind === "link" && n.link) {
    const external = /^https?:/.test(n.link.url);
    return (
      <li className="mm-item" role="treeitem" aria-selected={false}>
        <a className={cls} href={n.link.url} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
          <span className="mm-title">{n.link.label}</span>
          <Icon name="external" size={14} />
        </a>
      </li>
    );
  }

  if (kind === "course") {
    return (
      <li className="mm-item" role="treeitem" aria-selected={false}>
        <Link to={`/courses/${n.course}`} className={cls}>
          <span className="mm-title">{n.courseTitle ?? n.course}</span>
          {n.note && <span className="mm-note">{n.note}</span>}
          {n.itemTitles && (
            <span className="mm-note">
              重点：{n.itemTitles.slice(0, 3).join("、")}
              {n.itemTitles.length > 3 ? ` 等 ${n.itemTitles.length} 项` : ""}
            </span>
          )}
          <span className="mm-meta small sub">
            {done ? <span className="tag tag-ok">学完</span> : r ? <span className="tag tag-accent">在学 {Math.round(r * 100)}%</span> : null}
            {n.optional && <span className="tag">选学</span>}
            {n.periods ? <span className="num">{hoursText(n.periods)}</span> : null}
          </span>
        </Link>
      </li>
    );
  }

  const kids = n.children ?? [];
  return (
    <li className="mm-item" role="treeitem" aria-selected={false} aria-expanded>
      <div className={cls}>
        <span className="mm-title">{n.title}</span>
        {n.note && <span className="mm-note">{n.note}</span>}
        <span className="mm-meta small sub">
          {n.pick && <span className="tag tag-accent">{kids.length} 选 {n.pick}</span>}
          {n.optional && <span className="tag">选学</span>}
          {done && <span className="tag tag-ok">完成</span>}
        </span>
      </div>
      <ul className="mm-children" role="group">
        {kids.map((c, i) => (
          <MapNode key={i} n={c} progress={progress} />
        ))}
      </ul>
    </li>
  );
}

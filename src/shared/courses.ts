import type { CourseMeta, MetaItem } from "./light";

export type { CourseMeta, MetaItem, MetaLink, MetaModule } from "./light";

/**
 * 课程目录。课程源文件在 content/courses/<slug>/（hiana-course@1 课程包，见 shared/package.ts），
 * 构建时生成轻量目录 content/catalog.json（shared/light.ts），只打包进 Worker（worker/catalog.ts），
 * 网页从 /api/courses 取目录。管理员发布的课程包存在数据库，Worker 把它们接在目录后面。
 *
 * 一节 = 45 分钟。条目的 periods 是预计节数。进度按条目记。
 */

/** 分类在目录里的顺序；没列出的分类排在后面，按首次出现的顺序 */
export const CATEGORY_ORDER = ["CSDIY"];

export function categoriesOf(courses: { category: string }[]): string[] {
  const seen: string[] = [];
  for (const c of courses) if (!seen.includes(c.category)) seen.push(c.category);
  return [...CATEGORY_ORDER.filter((x) => seen.includes(x)), ...seen.filter((x) => !CATEGORY_ORDER.includes(x))];
}

export function itemsOf(c: Pick<CourseMeta, "modules">): MetaItem[] {
  return c.modules.flatMap((m) => m.items);
}

/** 有站内条目的课：可以按条目记进度 */
export function isHosted(c: Pick<CourseMeta, "modules">): boolean {
  return c.modules.some((m) => m.items.length > 0);
}

/** 讲义页正文（Markdown）的静态地址 */
export function pagePath(slug: string, page: string): string {
  return `/learn/${slug}/${page}.md`;
}

/** 某一页属于哪个条目 */
export function itemOfPage(c: Pick<CourseMeta, "modules">, page: string): MetaItem | undefined {
  return itemsOf(c).find((it) => it.pages.some((p) => p.id === page));
}

export function totalPeriods(c: Pick<CourseMeta, "modules">): number {
  return itemsOf(c).reduce((n, it) => n + it.periods, 0);
}

/** 节数换成“约 N 小时”。 */
export function periodsToHours(periods: number): number {
  return Math.round((periods * 45) / 60);
}

/** 下一个没完成的条目；全部完成或没有条目返回 null。 */
export function nextItem(c: Pick<CourseMeta, "modules">, done: Set<string>): MetaItem | null {
  return itemsOf(c).find((it) => !done.has(it.id)) ?? null;
}

export interface Progress {
  doneItems: number;
  items: number;
  donePeriods: number;
  totalPeriods: number;
  ratio: number;
}

export function progress(c: Pick<CourseMeta, "modules">, done: Set<string>): Progress {
  const all = itemsOf(c);
  const doneItems = all.filter((it) => done.has(it.id));
  const total = totalPeriods(c);
  const donePeriods = doneItems.reduce((n, it) => n + it.periods, 0);
  return { doneItems: doneItems.length, items: all.length, donePeriods, totalPeriods: total, ratio: total ? donePeriods / total : 0 };
}

/** 剩余节数 ÷ 每周节数，向上取整成周数；每周节数为 0 时返回 null。 */
export function weeksToFinish(remainingPeriods: number, periodsPerWeek: number): number | null {
  if (periodsPerWeek <= 0) return null;
  return Math.ceil(remainingPeriods / periodsPerWeek);
}

/**
 * 给 CourseTable 里课表用的卡片：没学完的条目，一行一张，带预计节数。
 * CourseTable 里点“+”，课程名填 group，把 lines 整段粘贴进去就是一张张卡片。
 */
export function planCards(c: Pick<CourseMeta, "title" | "modules">, done: Set<string>): { group: string; lines: string[] } {
  const group = c.title.split(/[：:（(]/)[0].trim() || c.title;
  const lines = itemsOf(c)
    .filter((it) => !done.has(it.id) && !it.optional)
    .map((it) => `${it.title}（${it.periods} 节）`);
  return { group, lines };
}

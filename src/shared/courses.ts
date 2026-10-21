import cs50p from "../../content/courses/cs50p.json";
import cs50x from "../../content/courses/cs50x.json";
import cs61a from "../../content/courses/cs61a.json";
import git from "../../content/courses/git.json";
import missing from "../../content/courses/missing-semester.json";
import mit1801 from "../../content/courses/mit-1801.json";

/**
 * 课程目录（技术方案“导学”一节）：知识块 → 课程 → 单元。
 * 每门课一个文件，放在 content/courses/<slug>.json，构建时打包进网页和 Worker。
 * 加一门课 = 加一个 JSON 文件 + 在下面 ALL 里登记；tests/courses.test.ts 会检查格式。
 *
 * 一节 = 45 分钟。单元的 periods 是预计节数，课程总节数是它们的和。
 */

export type UnitKind = "lecture" | "pset" | "project" | "reading" | "practice";
export type AreaId = "tools" | "programming" | "math" | "systems";

export interface Link {
  label: string;
  url: string;
}

export interface Unit {
  id: string;
  title: string;
  kind: UnitKind;
  periods: number;
  links: Link[];
  note?: string;
}

export interface Course {
  slug: string;
  title: string;
  titleEn?: string;
  university: string;
  area: AreaId;
  tags: string[];
  difficulty: number; // 1–5
  required: boolean; // 协会推荐必修
  language: string;
  prerequisites: string;
  summary: string;
  why?: string;
  access: { video: string; homework: string; level: "good" | "partial" | "hard" };
  license: string;
  resources: Link[];
  units: Unit[];
}

export const AREAS: { id: AreaId; name: string; blurb: string }[] = [
  { id: "tools", name: "开发者素养", blurb: "命令行、Git、编辑器和 Agent，每天都要用的工具" },
  { id: "programming", name: "编程入门", blurb: "从第一行代码到能自己做项目" },
  { id: "math", name: "数学基础", blurb: "和学校的数学课配合着学" },
  { id: "systems", name: "计算机系统", blurb: "计算机到底是怎么运行的（还在整理）" },
];

export const UNIT_KIND_LABEL: Record<UnitKind, string> = {
  lecture: "讲座",
  pset: "习题",
  project: "项目",
  reading: "阅读",
  practice: "练习",
};

export const ACCESS_LABEL: Record<Course["access"]["level"], string> = {
  good: "国内能顺利学",
  partial: "部分环节要软路由",
  hard: "需要软路由",
};

export const COURSES: Course[] = [missing, git, cs50x, cs50p, cs61a, mit1801] as Course[];

export function getCourse(slug: string): Course | undefined {
  return COURSES.find((c) => c.slug === slug);
}

export function totalPeriods(c: Course): number {
  return c.units.reduce((n, u) => n + u.periods, 0);
}

/** 节数换成“约 N 小时”的说法。 */
export function periodsToHours(periods: number): number {
  return Math.round((periods * 45) / 60);
}

/** 下一个没完成的单元；全部完成返回 null。 */
export function nextUnit(c: Course, done: Set<string>): Unit | null {
  return c.units.find((u) => !done.has(u.id)) ?? null;
}

export function progress(c: Course, done: Set<string>) {
  const doneUnits = c.units.filter((u) => done.has(u.id));
  const total = totalPeriods(c);
  const donePeriods = doneUnits.reduce((n, u) => n + u.periods, 0);
  return { doneUnits: doneUnits.length, units: c.units.length, donePeriods, totalPeriods: total, ratio: total ? donePeriods / total : 0 };
}

/**
 * 预计完成日期：剩余节数 ÷ 每周节数。返回需要的周数（向上取整）；每周节数为 0 时返回 null。
 * 例：剩 60 节，每周排 6 节 → 10 周。
 */
export function weeksToFinish(remainingPeriods: number, periodsPerWeek: number): number | null {
  if (periodsPerWeek <= 0) return null;
  return Math.ceil(remainingPeriods / periodsPerWeek);
}

/** 校验一份课程包，返回问题列表（空 = 合格）。 */
export function validateCourse(c: Course): string[] {
  const issues: string[] = [];
  if (!/^[a-z0-9-]{2,40}$/.test(c.slug)) issues.push(`slug 格式不对：${c.slug}`);
  if (!c.title) issues.push("缺少 title");
  if (!AREAS.some((a) => a.id === c.area)) issues.push(`未知的知识块：${c.area}`);
  if (!(c.difficulty >= 1 && c.difficulty <= 5)) issues.push("difficulty 应在 1 到 5 之间");
  if (!c.license) issues.push("缺少 license");
  const ids = new Set<string>();
  for (const u of c.units) {
    if (!/^[a-z0-9-]{1,40}$/.test(u.id)) issues.push(`单元 id 格式不对：${u.id}`);
    if (ids.has(u.id)) issues.push(`单元 id 重复：${u.id}`);
    ids.add(u.id);
    if (!(u.periods > 0 && u.periods <= 40)) issues.push(`单元 ${u.id} 的节数不合理：${u.periods}`);
    if (!UNIT_KIND_LABEL[u.kind]) issues.push(`单元 ${u.id} 的类型不对：${u.kind}`);
    for (const l of u.links) if (!/^https:\/\//.test(l.url)) issues.push(`单元 ${u.id} 的链接不是 https：${l.url}`);
  }
  for (const l of c.resources) if (!/^https:\/\//.test(l.url)) issues.push(`资源链接不是 https：${l.url}`);
  if (c.units.length === 0) issues.push("没有单元");
  return issues;
}

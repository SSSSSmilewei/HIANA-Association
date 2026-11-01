/**
 * 知识块（hiana-block@1）：一个方向的“思维导图”，把很多门课按阶段收在一起，例如新手、考研、人工智能、嵌入式。
 * 知识块只引用课程（slug），不复制内容；一门课可以出现在好几个知识块里。
 *
 *   知识块
 *   ├─ 基本信息：标题、一句话、适合谁、介绍（Markdown）
 *   ├─ nodes[]   节点，三种：
 *   │    ├─ 分组  { title, children[], pick?: 几门里选几门, optional?: 选学 }
 *   │    ├─ 课程  { course: slug, items?: 重点看的条目, note?: 一句话 }
 *   │    └─ 链接  { link: { label, url } }（书、网站这类站外资源）
 *   └─ next[]    学完以后可以去的知识块
 *
 * 源文件在 content/blocks/<slug>.json，顺序在 content/blocks/order.json。
 * 构建时补上每个课程节点的课程名和课时（scripts/blocks.mjs），网页直接用，不用再查课程目录。
 * 这个文件不 import 任何东西：构建脚本（Node）直接加载它，网页引用它也不会带上 zod。
 */

export const BLOCK_FORMAT = "hiana-block@1";

export interface BlockLink {
  label: string;
  url: string;
}

export interface BlockNode {
  title?: string;
  note?: string;
  course?: string;
  /** 只看这门课里的这几个条目（id） */
  items?: string[];
  link?: BlockLink;
  children?: BlockNode[];
  /** 子节点里选几个就算完成这一组 */
  pick?: number;
  /** 选学：不算进总课时和完成度 */
  optional?: boolean;
  // 以下由构建补上
  courseTitle?: string;
  itemTitles?: string[];
  /** 预计课时（45 分钟一节）；课程没有站内条目时按 hours 估，估不出来是 0 */
  periods?: number;
}

export interface Block {
  format: typeof BLOCK_FORMAT;
  slug: string;
  title: string;
  summary: string;
  audience?: string;
  intro?: string;
  nodes: BlockNode[];
  next?: string[];
}

/** 列表页用的轻量形态 */
export interface BlockSummary {
  slug: string;
  title: string;
  summary: string;
  audience?: string;
  courses: string[];
  periods: number;
}

export type NodeKind = "group" | "course" | "link";

export function kindOf(n: BlockNode): NodeKind {
  if (n.course) return "course";
  if (n.link) return "link";
  return "group";
}

/** 所有引用到的课程（按出现顺序，不重复） */
export function blockCourses(nodes: BlockNode[]): string[] {
  const out: string[] = [];
  const walk = (ns: BlockNode[]) => {
    for (const n of ns) {
      if (n.course && !out.includes(n.course)) out.push(n.course);
      if (n.children) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

/** “50 小时”“50-70 小时”“100h+” → 小时数（取第一个数）；“因人而异”→ 0 */
export function hoursOf(text: string): number {
  const m = /(\d+(?:\.\d+)?)/.exec(text || "");
  if (!m) return 0;
  const n = Number(m[1]);
  return /周|week/i.test(text) ? 0 : n;
}

export const periodsFromHours = (h: number) => Math.round((h * 60) / 45);

/**
 * 一个节点的预计课时：课程节点用构建时补上的 periods；分组把必学的子节点加起来，
 * pick N 只算课时最少的 N 个；选学不算。
 */
export function nodePeriods(n: BlockNode): number {
  if (n.optional) return 0;
  return requiredPeriods(n);
}

function requiredPeriods(n: BlockNode): number {
  const k = kindOf(n);
  if (k === "course") return n.periods ?? 0;
  if (k === "link") return 0;
  const kids = (n.children ?? []).filter((c) => !c.optional).map(requiredPeriods);
  if (n.pick) return kids.sort((a, b) => a - b).slice(0, n.pick).reduce((a, b) => a + b, 0);
  return kids.reduce((a, b) => a + b, 0);
}

export function blockPeriods(b: Pick<Block, "nodes">): number {
  return b.nodes.reduce((a, n) => a + nodePeriods(n), 0);
}

/** 每门课的进度：0–1；学完是 1 */
export type CourseProgress = (slug: string) => number;

/** 节点完成度 0–1。分组：必学子节点的平均；pick N 取完成度最高的 N 个。链接节点不计。 */
export function nodeRatio(n: BlockNode, p: CourseProgress): number | null {
  const k = kindOf(n);
  if (k === "course") return p(n.course as string);
  if (k === "link") return null;
  const kids = (n.children ?? []).filter((c) => !c.optional).map((c) => nodeRatio(c, p)).filter((x): x is number => x !== null);
  if (!kids.length) return null;
  const used = n.pick ? kids.sort((a, b) => b - a).slice(0, n.pick) : kids;
  const want = n.pick ? Math.min(n.pick, kids.length) : kids.length;
  return used.reduce((a, b) => a + b, 0) / want;
}

export function blockRatio(b: Pick<Block, "nodes">, p: CourseProgress): number {
  const r = nodeRatio({ children: b.nodes }, p);
  return r ?? 0;
}

/**
 * 下一步：按顺序找第一个没学完的必学课程。
 * pick 分组里已经开始学的课优先，否则取第一门。
 */
export function nextCourse(b: Pick<Block, "nodes">, p: CourseProgress): BlockNode | null {
  const find = (n: BlockNode): BlockNode | null => {
    const k = kindOf(n);
    if (n.optional) return null;
    if (k === "course") return p(n.course as string) < 1 ? n : null;
    if (k === "link") return null;
    const kids = n.children ?? [];
    if (n.pick) {
      const r = nodeRatio(n, p);
      if (r !== null && r >= 1) return null;
      const started = kids.filter((c) => !c.optional && (nodeRatio(c, p) ?? 0) > 0);
      for (const c of [...started, ...kids]) {
        const x = find(c);
        if (x) return x;
      }
      return null;
    }
    for (const c of kids) {
      const x = find(c);
      if (x) return x;
    }
    return null;
  };
  return find({ children: b.nodes });
}

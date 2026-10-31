import { z } from "zod/v4";
import { FORMAT, ITEM_KINDS, LINK_KINDS } from "./light";

export { FORMAT, ITEM_KINDS, ITEM_KIND_LABEL, LINK_KINDS, LINK_KIND_LABEL } from "./light";

/**
 * 课程包格式 hiana-course@1：一门课的全部内容放在一个 JSON 里，可以导入、导出、发布。
 *
 * 结构参照常见公开课网站（CS50 的周次、MIT OCW 的 Syllabus / Lecture Notes / Assignments、
 * Coursera 的 Module → 视频 / 阅读 / 测验 / 作业、CS61A 的 Lecture / Lab / Homework / Project）：
 *
 *   课程
 *   ├─ 基本信息：标题、原名、分类、学校、先修、语言、难度、学时、许可
 *   ├─ intro.community   中文介绍（爱好者写的，例如 csdiy）
 *   ├─ intro.official    官方介绍的中文翻译
 *   ├─ links             官网、视频、教材、作业、实验、论坛、仓库……
 *   └─ modules[]         模块（周、章、主题）；group 再分一层（例如 MIT 18.01 的“单元”）
 *        └─ items[]      条目：讲义 / 讨论课 / 阅读 / 视频 / 作业 / 实验 / 项目 / 测验 / 考试
 *             ├─ pages[]     站内正文（Markdown），第一页是主页面
 *             ├─ videos[] / links[] / submit
 *             └─ practice[]  站内练手：选择、填空、代码（Python / SQL / JavaScript，浏览器里判题）
 *
 * 仓库里的课：content/courses/<slug>/course.json，正文放在同目录的 <页 id>.md（body 留空）。
 * 导出的课程包把正文写进 body，一个文件就是完整的一门课。
 */

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]{1,47}$/, "只能用小写字母、数字和连字符，2–48 个字符");
const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,47}$/, "只能用小写字母、数字和连字符");
const url = z.string().regex(/^(https?:\/\/|\/)\S+$/, "要是 https:// 开头的网址或站内路径");
const md = z.string().max(400_000);

export const Link = z.object({
  kind: z.enum(LINK_KINDS).default("other"),
  label: z.string().min(1).max(80),
  url,
});

export const Page = z.object({
  id,
  title: z.string().min(1).max(80),
  /** 导出 / 导入时的正文；仓库里的课正文在 .md 文件里 */
  body: md.optional(),
});

const practiceBase = {
  id,
  title: z.string().max(80).optional(),
  /** 出处：official = 从官方作业 / 习题改编；review = 自编的复习题 */
  origin: z.enum(["official", "review"]).optional(),
  prompt: md.min(1),
  explain: md.optional(),
};

export const Choice = z.object({
  ...practiceBase,
  type: z.literal("choice"),
  options: z.array(md).min(2).max(10),
  /** 单选写下标，多选写下标数组 */
  answer: z.union([z.number().int().min(0), z.array(z.number().int().min(0)).min(1)]),
});

export const Blank = z.object({
  ...practiceBase,
  type: z.literal("text"),
  /** 可接受的写法；比较时忽略首尾空白、大小写，连续空白算一个 */
  answer: z.array(z.string().min(1)).min(1),
});

export const CodeTest = z.object({
  name: z.string().max(80),
  stdin: z.string().default(""),
  stdout: z.string().default(""),
});

export const Code = z.object({
  ...practiceBase,
  type: z.literal("code"),
  lang: z.enum(["python", "sql", "javascript"]),
  starter: z.string().default(""),
  /** python / javascript：标准输入 → 标准输出 */
  tests: z.array(CodeTest).default([]),
  /** sql：建表和示例数据；判题时把学员的查询结果和 solution 的结果比较 */
  setup: z.string().optional(),
  ordered: z.boolean().optional(),
  solution: z.string().optional(),
  hint: md.optional(),
});

export const Practice = z.discriminatedUnion("type", [Choice, Blank, Code]);

export const Item = z.object({
  id,
  kind: z.enum(ITEM_KINDS),
  title: z.string().min(1).max(100),
  /** 预计课时（一节 45 分钟） */
  periods: z.number().int().min(1).max(60).default(2),
  /** 选学（例如 CS50 的 Section、Shorts） */
  optional: z.boolean().optional(),
  pages: z.array(Page).default([]),
  videos: z.array(Link).default([]),
  links: z.array(Link).default([]),
  /** 作业的正式提交地址（GitHub、submit50…） */
  submit: Link.optional(),
  practice: z.array(Practice).default([]),
});

export const Module = z.object({
  id,
  title: z.string().min(1).max(100),
  /** 模块上面一层的分组；相邻模块写同一个 group 就归到一起 */
  group: z.string().max(100).optional(),
  summary: z.string().max(400).optional(),
  items: z.array(Item).default([]),
});

export const Intro = z.object({
  community: md.optional(),
  communitySource: Link.optional(),
  official: md.optional(),
  officialSource: Link.optional(),
});

export const CoursePackage = z
  .object({
    format: z.literal(FORMAT),
    slug,
    title: z.string().min(1).max(100),
    titleEn: z.string().max(160).optional(),
    category: z.string().max(40).default("其他"),
    provider: z.string().max(80).default(""),
    instructors: z.array(z.string().max(60)).default([]),
    language: z.string().max(80).default(""),
    prerequisites: z.string().max(200).default(""),
    difficulty: z.number().int().min(0).max(5).default(0),
    hours: z.string().max(40).default(""),
    summary: z.string().max(300).default(""),
    tags: z.array(z.string().max(30)).default([]),
    license: z.string().max(300).default(""),
    intro: Intro.default({}),
    links: z.array(Link).default([]),
    modules: z.array(Module).default([]),
  })
  .superRefine((c, ctx) => {
    const seen = new Set<string>();
    const pages = new Set<string>();
    for (const m of c.modules)
      for (const it of m.items) {
        if (seen.has(it.id)) ctx.addIssue({ code: "custom", message: `条目 id 重复：${it.id}` });
        seen.add(it.id);
        const qs = new Set<string>();
        for (const p of it.pages) {
          if (pages.has(p.id)) ctx.addIssue({ code: "custom", message: `页面 id 重复：${p.id}` });
          pages.add(p.id);
        }
        for (const q of it.practice) {
          if (qs.has(q.id)) ctx.addIssue({ code: "custom", message: `${it.id} 里练习 id 重复：${q.id}` });
          qs.add(q.id);
          if (q.type === "choice") {
            const a = Array.isArray(q.answer) ? q.answer : [q.answer];
            if (a.some((x) => x >= q.options.length)) ctx.addIssue({ code: "custom", message: `${it.id}/${q.id}：答案下标超出选项` });
          }
          if (q.type === "code" && q.lang === "sql" && !(q.setup && q.solution)) ctx.addIssue({ code: "custom", message: `${it.id}/${q.id}：SQL 题要有 setup 和 solution` });
          if (q.type === "code" && q.lang !== "sql" && q.tests.length === 0) ctx.addIssue({ code: "custom", message: `${it.id}/${q.id}：代码题要有测试` });
        }
      }
  });

export type Link = z.infer<typeof Link>;
export type Page = z.infer<typeof Page>;
export type Practice = z.infer<typeof Practice>;
export type CodePractice = z.infer<typeof Code>;
export type Item = z.infer<typeof Item>;
export type Module = z.infer<typeof Module>;
export type CoursePackage = z.infer<typeof CoursePackage>;
export type ItemKind = (typeof ITEM_KINDS)[number];

/** 校验并补全默认值；失败时返回中文错误列表 */
export function parsePackage(raw: unknown): { ok: true; pkg: CoursePackage } | { ok: false; errors: string[] } {
  const r = CoursePackage.safeParse(raw);
  if (r.success) return { ok: true, pkg: r.data };
  return { ok: false, errors: r.error.issues.slice(0, 20).map((i) => `${i.path.join(".") || "课程"}：${i.message}`) };
}

export function packageJsonSchema() {
  return { $id: "https://study.shanmoew-denied.win/schema/course-v1.json", title: "hiana-course@1 课程包", ...z.toJSONSchema(CoursePackage, { io: "input" }) };
}

export function itemsOf(c: { modules: { items: Item[] }[] }): Item[] {
  return c.modules.flatMap((m) => m.items);
}

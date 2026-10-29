/**
 * 课程目录里每门课的轻量形态：列表、进度、首页“接下来”只用这些字段，不含介绍、正文和练习题本身。
 * 构建脚本（scripts/courses.mjs，Node 直接加载这个 .ts）和 Worker 发布课程包时都用 light() 生成，两边一致。
 * 这个文件不要 import 别的模块，也不要用 enum、namespace 这类 Node 去不掉的 TS 语法。
 * 课程包的常量也放这里：网页引用它们不会把 zod 打进首屏。
 */

export const FORMAT = "hiana-course@1";

export const LINK_KINDS = ["website", "video", "notes", "slides", "textbook", "assignments", "labs", "exams", "forum", "repo", "translation", "other"] as const;
export const LINK_KIND_LABEL: Record<(typeof LINK_KINDS)[number], string> = {
  website: "课程网站",
  video: "视频",
  notes: "讲义",
  slides: "幻灯片",
  textbook: "教材",
  assignments: "作业",
  labs: "实验",
  exams: "考试",
  forum: "讨论区",
  repo: "代码仓库",
  translation: "中文资料",
  other: "其他",
};

export const ITEM_KINDS = ["lecture", "reading", "video", "assignment", "lab", "project", "quiz", "exam"] as const;
export const ITEM_KIND_LABEL: Record<(typeof ITEM_KINDS)[number], string> = {
  lecture: "讲义",
  reading: "阅读",
  video: "视频",
  assignment: "作业",
  lab: "实验",
  project: "项目",
  quiz: "测验",
  exam: "考试",
};

export interface MetaLink {
  kind: string;
  label: string;
  url: string;
}

export interface MetaItem {
  id: string;
  kind: string;
  title: string;
  periods: number;
  pages: { id: string; title: string }[];
  /** 练手题数量 */
  practice: number;
}

export interface MetaModule {
  id: string;
  title: string;
  items: MetaItem[];
}

export interface CourseMeta {
  slug: string;
  title: string;
  titleEn?: string;
  category: string;
  provider: string;
  language: string;
  prerequisites: string;
  difficulty: number;
  hours: string;
  summary: string;
  license: string;
  links: MetaLink[];
  modules: MetaModule[];
  /** builtin = 仓库自带；published = 管理员发布的课程包 */
  origin?: "builtin" | "published";
}

// biome-ignore lint/suspicious/noExplicitAny: 输入是课程包 JSON，构建脚本里没有类型
type Raw = any;

export function light(c: Raw): CourseMeta {
  return {
    slug: c.slug,
    title: c.title,
    titleEn: c.titleEn || undefined,
    category: c.category || "其他",
    provider: c.provider || "",
    language: c.language || "",
    prerequisites: c.prerequisites || "",
    difficulty: c.difficulty || 0,
    hours: c.hours || "",
    summary: c.summary || "",
    license: c.license || "",
    links: c.links ?? [],
    modules: (c.modules ?? []).map((m: Raw) => ({
      id: m.id,
      title: m.title,
      items: (m.items ?? []).map((it: Raw) => ({
        id: it.id,
        kind: it.kind,
        title: it.title,
        periods: it.periods ?? 2,
        pages: (it.pages ?? []).map((p: Raw) => ({ id: p.id, title: p.title })),
        practice: (it.practice ?? []).length,
      })),
    })),
  };
}

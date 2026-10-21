import { invalidate } from "./api";

/** 课程卡片上的小标签：学校 · 课号。 */
const UNI: Record<string, string> = { 哈佛大学: "HARVARD", MIT: "MIT", "UC Berkeley": "BERKELEY", 协会自编: "HIANA" };
const SHORT: Record<string, string> = {
  "missing-semester": "MISSING SEMESTER",
  git: "GIT",
  cs50x: "CS50x",
  cs50p: "CS50P",
  cs61a: "CS61A",
  "mit-1801": "18.01",
};

export function courseCode(c: { slug: string; university: string }): string {
  return `${UNI[c.university] ?? c.university} · ${SHORT[c.slug] ?? c.slug.toUpperCase()}`;
}

export function courseShort(c: { slug: string; title: string }): string {
  const s = SHORT[c.slug];
  if (!s) return c.title;
  return s === "MISSING SEMESTER" ? "Missing Semester" : s === "GIT" ? "Git" : s;
}

export const DIFFICULTY = ["", "入门", "中等", "较难", "难", "很难"];

/** 学习进度变了以后，相关页面一起刷新。 */
export function refreshLearning() {
  invalidate("/api/learning", "/api/courses", "/api/heatmap");
}

import catalog from "../../content/catalog.json";
import type { CourseMeta } from "../shared/courses";
import { light } from "../shared/light";
import type { CoursePackage } from "../shared/package";

/**
 * 课程目录 = 仓库自带的课（content/catalog.json）+ 管理员发布的课程包（course_packages 表）。
 * 发布的课程包整包存 JSON（含正文），目录只用轻量的 meta 列。
 */

/** D1 单个值上限约 2MB，留点余量 */
export const MAX_PACKAGE_BYTES = 1_900_000;

export const BUILTIN: CourseMeta[] = (catalog as CourseMeta[]).map((c) => ({ ...c, origin: "builtin" as const }));

const BUILTIN_SLUGS = new Set(BUILTIN.map((c) => c.slug));

export function isBuiltin(slug: string): boolean {
  return BUILTIN_SLUGS.has(slug);
}

export async function allCourses(db: D1Database): Promise<CourseMeta[]> {
  const rows = await db.prepare("SELECT meta FROM course_packages ORDER BY updated_at").all<{ meta: string }>();
  return [...BUILTIN, ...rows.results.map((r) => ({ ...(JSON.parse(r.meta) as CourseMeta), origin: "published" as const }))];
}

export async function getCourse(db: D1Database, slug: string): Promise<CourseMeta | undefined> {
  const b = BUILTIN.find((c) => c.slug === slug);
  if (b) return b;
  const row = await db.prepare("SELECT meta FROM course_packages WHERE slug = ?").bind(slug).first<{ meta: string }>();
  return row ? { ...(JSON.parse(row.meta) as CourseMeta), origin: "published" } : undefined;
}

export async function getPackageJson(db: D1Database, slug: string): Promise<string | null> {
  const row = await db.prepare("SELECT json FROM course_packages WHERE slug = ?").bind(slug).first<{ json: string }>();
  return row?.json ?? null;
}

export async function savePackage(db: D1Database, pkg: CoursePackage, by: string, now = Date.now()) {
  await db
    .prepare(
      `INSERT INTO course_packages (slug, json, meta, published_by, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET json = excluded.json, meta = excluded.meta, published_by = excluded.published_by, updated_at = excluded.updated_at`,
    )
    .bind(pkg.slug, JSON.stringify(pkg), JSON.stringify(light(pkg)), by, now)
    .run();
}

export async function deletePackage(db: D1Database, slug: string): Promise<boolean> {
  const r = await db.prepare("DELETE FROM course_packages WHERE slug = ?").bind(slug).run();
  return (r.meta.changes ?? 0) > 0;
}

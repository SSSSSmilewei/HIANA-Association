import { z } from "zod";
import { COURSES, getCourse, nextUnit, progress } from "../../shared/courses";
import { cnDate } from "../../shared/heatmap";
import { recordActivity } from "../activity";
import { HttpError, type Router, json } from "../http";
import { memberId } from "./common";

/**
 * 选课与单元进度（技术方案“导学”一节）。课程内容来自 content/courses，选课和完成记录存数据库。
 */

interface EnrollRow {
  course_slug: string;
  status: "active" | "paused" | "done" | "dropped";
  started_at: number;
  target_day: string | null;
}

async function myState(db: D1Database, uid: string) {
  const [enrolls, units] = await Promise.all([
    db.prepare("SELECT course_slug, status, started_at, target_day FROM enrollments WHERE user_id = ?").bind(uid).all<EnrollRow>(),
    db.prepare("SELECT course_slug, unit_id, done_at FROM unit_progress WHERE user_id = ?").bind(uid).all<{ course_slug: string; unit_id: string; done_at: number }>(),
  ]);
  const done = new Map<string, Map<string, number>>();
  for (const u of units.results) {
    const m = done.get(u.course_slug) ?? new Map<string, number>();
    m.set(u.unit_id, u.done_at);
    done.set(u.course_slug, m);
  }
  return { enrolls: enrolls.results, done };
}

async function learnerCounts(db: D1Database) {
  const rows = await db
    .prepare("SELECT course_slug, COUNT(*) AS n FROM enrollments e JOIN users u ON u.id = e.user_id WHERE e.status = 'active' AND u.status = 'active' GROUP BY course_slug")
    .all<{ course_slug: string; n: number }>();
  return new Map(rows.results.map((r) => [r.course_slug, r.n]));
}

export function learningRoutes(api: Router) {
  /** 课程目录：每门课的简介、总节数、正在学的人数、我的状态。课程单元详情走 /api/courses/:slug。 */
  api.get("/api/courses", async (c) => {
    const uid = memberId(c);
    const [{ enrolls, done }, counts] = await Promise.all([myState(c.env.DB, uid), learnerCounts(c.env.DB)]);
    return json(
      COURSES.map((course) => {
        const e = enrolls.find((x) => x.course_slug === course.slug);
        const d = new Set(done.get(course.slug)?.keys() ?? []);
        const { units, ...rest } = course;
        return { ...rest, unitCount: units.length, learners: counts.get(course.slug) ?? 0, enrollment: e ? { status: e.status, startedAt: e.started_at } : null, progress: progress(course, d) };
      }),
    );
  });

  api.get("/api/courses/:slug", async (c) => {
    const uid = memberId(c);
    const course = getCourse(c.params.slug);
    if (!course) throw new HttpError(404, "没有这门课");
    const [{ enrolls, done }, peers] = await Promise.all([
      myState(c.env.DB, uid),
      c.env.DB.prepare(
        "SELECT u.name FROM enrollments e JOIN users u ON u.id = e.user_id WHERE e.course_slug = ? AND e.status = 'active' AND u.status = 'active' AND u.id != ? ORDER BY e.started_at LIMIT 12",
      )
        .bind(course.slug, uid)
        .all<{ name: string }>(),
    ]);
    const e = enrolls.find((x) => x.course_slug === course.slug);
    const doneMap = done.get(course.slug) ?? new Map<string, number>();
    return json({
      course,
      enrollment: e ? { status: e.status, startedAt: e.started_at } : null,
      done: Object.fromEntries(doneMap),
      progress: progress(course, new Set(doneMap.keys())),
      peers: peers.results.map((p) => p.name),
    });
  });

  /** 选课 / 暂停 / 退课。 */
  api.put("/api/courses/:slug/enrollment", async (c) => {
    const uid = memberId(c);
    const course = getCourse(c.params.slug);
    if (!course) throw new HttpError(404, "没有这门课");
    const { status } = z.object({ status: z.enum(["active", "paused", "dropped"]) }).parse(await c.body());
    const now = Date.now();
    const existed = await c.env.DB.prepare("SELECT status FROM enrollments WHERE user_id = ? AND course_slug = ?").bind(uid, course.slug).first<{ status: string }>();
    await c.env.DB.prepare(
      `INSERT INTO enrollments (user_id, course_slug, status, started_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, course_slug) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
    )
      .bind(uid, course.slug, status, now, now)
      .run();
    if (status === "active" && existed?.status !== "active") await recordActivity(c.env.DB, uid, "enroll", course.slug, now);
    return json({ ok: true, status });
  });

  /** 标记单元完成或取消。 */
  api.put("/api/courses/:slug/units/:unit", async (c) => {
    const uid = memberId(c);
    const course = getCourse(c.params.slug);
    const unit = course?.units.find((u) => u.id === c.params.unit);
    if (!course || !unit) throw new HttpError(404, "没有这个单元");
    const { done } = z.object({ done: z.boolean() }).parse(await c.body());
    const now = Date.now();
    if (done) {
      const res = await c.env.DB.prepare("INSERT OR IGNORE INTO unit_progress (user_id, course_slug, unit_id, done_at) VALUES (?, ?, ?, ?)")
        .bind(uid, course.slug, unit.id, now)
        .run();
      if (res.meta.changes) await recordActivity(c.env.DB, uid, "unit", `${course.slug}/${unit.id}`, now);
      // 完成单元时，没选过的课自动选上
      await c.env.DB.prepare(
        "INSERT OR IGNORE INTO enrollments (user_id, course_slug, status, started_at, updated_at) VALUES (?, ?, 'active', ?, ?)",
      )
        .bind(uid, course.slug, now, now)
        .run();
    } else {
      await c.env.DB.prepare("DELETE FROM unit_progress WHERE user_id = ? AND course_slug = ? AND unit_id = ?").bind(uid, course.slug, unit.id).run();
    }
    const doneSet = new Set(
      (await c.env.DB.prepare("SELECT unit_id FROM unit_progress WHERE user_id = ? AND course_slug = ?").bind(uid, course.slug).all<{ unit_id: string }>()).results.map((r) => r.unit_id),
    );
    const p = progress(course, doneSet);
    if (p.doneUnits === p.units) {
      await c.env.DB.prepare("UPDATE enrollments SET status = 'done', updated_at = ? WHERE user_id = ? AND course_slug = ?").bind(now, uid, course.slug).run();
    } else {
      // 学完后又取消了某个单元：改回“在学”，首页重新出现下一步
      await c.env.DB.prepare("UPDATE enrollments SET status = 'active', updated_at = ? WHERE user_id = ? AND course_slug = ? AND status = 'done'").bind(now, uid, course.slug).run();
    }
    return json({ ok: true, progress: p, next: nextUnit(course, doneSet) });
  });

  /** 首页“接下来”：每门在学课程的下一个单元。 */
  api.get("/api/learning/next", async (c) => {
    const uid = memberId(c);
    const { enrolls, done } = await myState(c.env.DB, uid);
    const today = cnDate(Date.now());
    const items = enrolls
      .filter((e) => e.status === "active")
      // 按课程目录的顺序：必修在前（Missing Semester → Git → CS50x），选修在后
      .sort((a, b) => COURSES.findIndex((c) => c.slug === a.course_slug) - COURSES.findIndex((c) => c.slug === b.course_slug))
      .flatMap((e) => {
        const course = getCourse(e.course_slug);
        if (!course) return [];
        const d = new Set(done.get(course.slug)?.keys() ?? []);
        const next = nextUnit(course, d);
        return [{ slug: course.slug, title: course.title, area: course.area, next, progress: progress(course, d) }];
      });
    return json({ today, items });
  });
}

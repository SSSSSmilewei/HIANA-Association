import { z } from "zod";
import { type CourseMeta, itemsOf, nextItem, progress } from "../../shared/courses";
import { cnDate } from "../../shared/heatmap";
import { parsePackage } from "../../shared/package";
import { recordActivity, recordActivityOnce } from "../activity";
import { MAX_PACKAGE_BYTES, allCourses, deletePackage, getCourse, getPackageJson, isBuiltin, savePackage } from "../catalog";
import { type Ctx, HttpError, type Router, json } from "../http";
import { memberId, requireAdmin, seesNames, viewerId } from "./common";

/**
 * 选课、条目进度、练手题记录，以及管理员发布课程包。
 * 课程目录见 worker/catalog.ts。进度按条目记（表名沿用 unit_progress，unit_id 就是条目 id）。
 * 没有站内条目的课（只有介绍和链接），学完由本人标记（status = done）。
 */

interface EnrollRow {
  course_slug: string;
  status: "active" | "paused" | "done" | "dropped";
  started_at: number;
  target_day: string | null;
}

async function myState(db: D1Database, uid: string | null) {
  if (!uid) return { enrolls: [] as EnrollRow[], done: new Map<string, Map<string, number>>() };
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

/** 旧版 App（1.x）认 units / doneUnits / unitCount，发新版之前先一起返回 */
function compat(p: ReturnType<typeof progress>) {
  return { ...p, doneUnits: p.doneItems, units: p.items };
}
function legacyUnits(course: CourseMeta) {
  return itemsOf(course).map((it) => ({ id: it.id, title: it.title, kind: it.kind === "assignment" ? "pset" : it.kind, periods: it.periods, pages: it.pages, links: [] }));
}

export function learningRoutes(api: Router) {
  /** 课程目录：每门课的基本信息、条目数、正在学的人数、我的状态。模块和条目走 /api/courses/:slug。游客也能看（没有“我的状态”）。 */
  api.get("/api/courses", async (c) => {
    const uid = viewerId(c);
    const [{ enrolls, done }, counts, courses] = await Promise.all([myState(c.env.DB, uid), learnerCounts(c.env.DB), allCourses(c.env.DB)]);
    return json(
      courses.map((course) => {
        const e = enrolls.find((x) => x.course_slug === course.slug);
        const d = new Set(done.get(course.slug)?.keys() ?? []);
        const { modules, links, ...rest } = course;
        return {
          ...rest,
          itemCount: itemsOf(course).length,
          unitCount: itemsOf(course).length,
          learners: counts.get(course.slug) ?? 0,
          enrollment: e ? { status: e.status, startedAt: e.started_at } : null,
          progress: compat(progress(course, d)),
        };
      }),
    );
  });

  /** 课程详情。游客也能看；游客和校外账号看不到“一起在学的人”（那是成员的真名）。 */
  api.get("/api/courses/:slug", async (c) => {
    const uid = viewerId(c);
    const course = await getCourse(c.env.DB, c.params.slug);
    if (!course) throw new HttpError(404, "没有这门课");
    const [{ enrolls, done }, peers, solved] = await Promise.all([
      myState(c.env.DB, uid),
      uid && seesNames(c)
        ? c.env.DB.prepare(
            "SELECT u.name FROM enrollments e JOIN users u ON u.id = e.user_id WHERE e.course_slug = ? AND e.status = 'active' AND u.status = 'active' AND u.id != ? ORDER BY e.started_at LIMIT 12",
          )
            .bind(course.slug, uid)
            .all<{ name: string }>()
        : { results: [] as { name: string }[] },
      uid
        ? c.env.DB.prepare("SELECT item_id, question_id FROM practice_solved WHERE user_id = ? AND course_slug = ?")
            .bind(uid, course.slug)
            .all<{ item_id: string; question_id: string }>()
        : { results: [] as { item_id: string; question_id: string }[] },
    ]);
    const solvedBy: Record<string, string[]> = {};
    for (const r of solved.results) (solvedBy[r.item_id] ??= []).push(r.question_id);
    const e = enrolls.find((x) => x.course_slug === course.slug);
    const doneMap = done.get(course.slug) ?? new Map<string, number>();
    return json({
      course: { ...course, units: legacyUnits(course) },
      enrollment: e ? { status: e.status, startedAt: e.started_at } : null,
      done: Object.fromEntries(doneMap),
      progress: compat(progress(course, new Set(doneMap.keys()))),
      peers: peers.results.map((p) => p.name),
      solved: solvedBy,
    });
  });

  /** 选课 / 暂停 / 退课。 */
  api.put("/api/courses/:slug/enrollment", async (c) => {
    const uid = memberId(c);
    const course = await getCourse(c.env.DB, c.params.slug);
    if (!course) throw new HttpError(404, "没有这门课");
    const { status } = z.object({ status: z.enum(["active", "paused", "dropped", "done"]) }).parse(await c.body());
    if (status === "done" && itemsOf(course).length > 0) throw new HttpError(400, "这门课按条目记进度，学完最后一个条目会自动标记");
    const now = Date.now();
    const existed = await c.env.DB.prepare("SELECT status FROM enrollments WHERE user_id = ? AND course_slug = ?").bind(uid, course.slug).first<{ status: string }>();
    await c.env.DB.prepare(
      `INSERT INTO enrollments (user_id, course_slug, status, started_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, course_slug) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
    )
      .bind(uid, course.slug, status, now, now)
      .run();
    if (status === "active" && existed?.status !== "active") await recordActivity(c.env.DB, uid, "enroll", course.slug, now);
    if (status === "done" && existed?.status !== "done") await recordActivity(c.env.DB, uid, "unit", `${course.slug}/done`, now);
    return json({ ok: true, status });
  });

  /** 标记条目完成或取消。/units/ 是旧路径，旧版 App 还在用。 */
  const markItem = async (c: Ctx, itemId: string) => {
    const uid = memberId(c);
    const course = await getCourse(c.env.DB, c.params.slug);
    const item = course && itemsOf(course).find((it) => it.id === itemId);
    if (!course || !item) throw new HttpError(404, "没有这个条目");
    const { done } = z.object({ done: z.boolean() }).parse(await c.body());
    const now = Date.now();
    if (done) {
      const res = await c.env.DB.prepare("INSERT OR IGNORE INTO unit_progress (user_id, course_slug, unit_id, done_at) VALUES (?, ?, ?, ?)")
        .bind(uid, course.slug, item.id, now)
        .run();
      if (res.meta.changes) await recordActivity(c.env.DB, uid, "unit", `${course.slug}/${item.id}`, now);
      // 完成条目时，没选过的课自动选上
      await c.env.DB.prepare(
        "INSERT OR IGNORE INTO enrollments (user_id, course_slug, status, started_at, updated_at) VALUES (?, ?, 'active', ?, ?)",
      )
        .bind(uid, course.slug, now, now)
        .run();
    } else {
      await c.env.DB.prepare("DELETE FROM unit_progress WHERE user_id = ? AND course_slug = ? AND unit_id = ?").bind(uid, course.slug, item.id).run();
    }
    const doneSet = new Set(
      (await c.env.DB.prepare("SELECT unit_id FROM unit_progress WHERE user_id = ? AND course_slug = ?").bind(uid, course.slug).all<{ unit_id: string }>()).results.map((r) => r.unit_id),
    );
    const p = progress(course, doneSet);
    if (p.doneItems === p.items) {
      await c.env.DB.prepare("UPDATE enrollments SET status = 'done', updated_at = ? WHERE user_id = ? AND course_slug = ?").bind(now, uid, course.slug).run();
    } else {
      // 学完后又取消了某个条目：改回“在学”，首页重新出现下一步
      await c.env.DB.prepare("UPDATE enrollments SET status = 'active', updated_at = ? WHERE user_id = ? AND course_slug = ? AND status = 'done'").bind(now, uid, course.slug).run();
    }
    return json({ ok: true, progress: compat(p), next: nextItem(course, doneSet) });
  };
  api.put("/api/courses/:slug/items/:item", (c) => markItem(c, c.params.item));
  api.put("/api/courses/:slug/units/:unit", (c) => markItem(c, c.params.unit));

  /** 练手题做对了：记一条（同一题每天只算一次学习记录）。判题在浏览器里。 */
  api.put("/api/courses/:slug/practice/:item/:question", async (c) => {
    const uid = memberId(c);
    const course = await getCourse(c.env.DB, c.params.slug);
    const item = course && itemsOf(course).find((it) => it.id === c.params.item);
    if (!course || !item || item.practice === 0) throw new HttpError(404, "没有这道题");
    const qid = c.params.question;
    if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(qid)) throw new HttpError(400, "题目 id 不对");
    const now = Date.now();
    await c.env.DB.prepare("INSERT OR IGNORE INTO practice_solved (user_id, course_slug, item_id, question_id, solved_at) VALUES (?, ?, ?, ?, ?)")
      .bind(uid, course.slug, item.id, qid, now)
      .run();
    await recordActivityOnce(c.env.DB, uid, "exercise", `${course.slug}/${item.id}/${qid}`, now);
    return json({ ok: true });
  });

  /** 发布的课程包原文（含正文），课程页和“导出”用。仓库自带的课走静态文件 /packages/<slug>.json。 */
  api.get("/api/packages/:slug", async (c) => {
    const text = await getPackageJson(c.env.DB, c.params.slug);
    if (!text) throw new HttpError(404, "没有这个课程包");
    return new Response(text, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-cache" } });
  });

  /** 管理员发布课程包：校验格式，同 slug 覆盖。不能覆盖仓库自带的课。 */
  api.put("/api/admin/packages", async (c) => {
    const { userId } = requireAdmin(c);
    const raw = await c.body();
    if (JSON.stringify(raw).length > MAX_PACKAGE_BYTES) throw new HttpError(413, "课程包太大（上限约 1.9MB），把图片换成外链或拆成几门课");
    const r = parsePackage(raw);
    if (!r.ok) return json({ error: "课程包格式不对", errors: r.errors }, 400);
    if (isBuiltin(r.pkg.slug)) throw new HttpError(409, `slug「${r.pkg.slug}」是站内自带的课，换一个`);
    await savePackage(c.env.DB, r.pkg, userId);
    return json({ ok: true, slug: r.pkg.slug });
  });

  api.delete("/api/admin/packages/:slug", async (c) => {
    requireAdmin(c);
    if (!(await deletePackage(c.env.DB, c.params.slug))) throw new HttpError(404, "没有这个课程包");
    return json({ ok: true });
  });

  /** 首页“接下来”：每门在学课程的下一个条目。 */
  api.get("/api/learning/next", async (c) => {
    const uid = memberId(c);
    const [{ enrolls, done }, courses] = await Promise.all([myState(c.env.DB, uid), allCourses(c.env.DB)]);
    const today = cnDate(Date.now());
    const bySlug = new Map<string, CourseMeta>(courses.map((x) => [x.slug, x]));
    const order = new Map(courses.map((x, i) => [x.slug, i]));
    const items = enrolls
      .filter((e) => e.status === "active" && bySlug.has(e.course_slug))
      // 按课程目录的顺序
      .sort((a, b) => (order.get(a.course_slug) ?? 0) - (order.get(b.course_slug) ?? 0))
      .map((e) => {
        const course = bySlug.get(e.course_slug) as CourseMeta;
        const d = new Set(done.get(course.slug)?.keys() ?? []);
        return { slug: course.slug, title: course.title, provider: course.provider, university: course.provider, hosted: itemsOf(course).length > 0, next: nextItem(course, d), progress: compat(progress(course, d)) };
      });
    return json({ today, items });
  });
}

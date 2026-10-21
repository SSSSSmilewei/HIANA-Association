import { describe, expect, test } from "bun:test";
import { memoryD1 } from "../scripts/local-d1";
import { COURSES, nextUnit, progress, totalPeriods, validateCourse, weeksToFinish } from "../src/shared/courses";
import { teachingWeek } from "../src/worker/api/members";
import type { Env } from "../src/worker/env";
import worker from "../src/worker/index";

function setup() {
  const env = {
    DB: memoryD1(),
    ASSETS: { fetch: async () => new Response("index") },
    SESSION_SECRET: "test-session-secret-0123456789abcdef",
    ADMIN_PASSWORD: "hiana-admin",
  } as unknown as Env;
  const jars = new Map<string, string>();
  async function call(who: string, method: string, path: string, body?: unknown) {
    const headers: Record<string, string> = {};
    if (jars.has(who)) headers.cookie = jars.get(who) as string;
    if (body !== undefined) headers["content-type"] = "application/json";
    const res = await worker.fetch(new Request(`http://localhost${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env);
    const set = res.headers.get("set-cookie");
    if (set) jars.set(who, set.split(";")[0]);
    const text = await res.text();
    let data: any = text;
    try {
      data = JSON.parse(text);
    } catch {
      /* 非 JSON */
    }
    return { status: res.status, data };
  }
  /** 导入并激活一个成员，返回能用的身份名。 */
  async function member(who: string, no: string, name: string) {
    if (!jars.has("boot")) await call("boot", "POST", "/api/auth/admin", { password: "hiana-admin" });
    const imp = await call("boot", "POST", "/api/admin/members/import", { text: `${no}\t${name}\t计科2501` });
    await call(who, "POST", "/api/auth/activate", { code: imp.data.created[0].passcode });
    await call(who, "POST", "/api/auth/password", { password: `${no}-pass`, confirm: `${no}-pass` });
    const list = await call("boot", "GET", "/api/admin/members");
    return list.data.find((m: { studentNo: string }) => m.studentNo === no).id as string;
  }
  return { call, member };
}

describe("课程包", () => {
  test("每一门课都通过格式检查，slug 不重复", () => {
    const slugs = new Set<string>();
    for (const c of COURSES) {
      expect({ slug: c.slug, issues: validateCourse(c) }).toEqual({ slug: c.slug, issues: [] });
      expect(slugs.has(c.slug)).toBe(false);
      slugs.add(c.slug);
    }
    expect(COURSES.filter((c) => c.required).map((c) => c.slug)).toEqual(["missing-semester", "git", "cs50x"]);
  });

  test("进度、下一步和预计周数", () => {
    const git = COURSES.find((c) => c.slug === "git")!;
    const done = new Set([git.units[0].id]);
    expect(nextUnit(git, done)?.id).toBe(git.units[1].id);
    const p = progress(git, done);
    expect(p.totalPeriods).toBe(totalPeriods(git));
    expect(p.donePeriods).toBe(git.units[0].periods);
    expect(weeksToFinish(60, 6)).toBe(10);
    expect(weeksToFinish(61, 6)).toBe(11);
    expect(weeksToFinish(10, 0)).toBeNull();
    expect(nextUnit(git, new Set(git.units.map((u) => u.id)))).toBeNull();
  });

  test("教学周", () => {
    expect(teachingWeek("2026-09-07", "2026-09-07")).toBe(1);
    expect(teachingWeek("2026-09-07", "2026-10-21")).toBe(7);
    expect(teachingWeek("2026-09-07", "2026-09-01")).toBeNull();
    expect(teachingWeek(null, "2026-10-21")).toBeNull();
  });
});

describe("选课接口", () => {
  test("选课、完成单元、首页下一步、同学在学", async () => {
    const { call, member } = setup();
    await member("lin", "2025010101", "林同学");
    await member("chen", "2025010102", "陈同学");

    const list = await call("lin", "GET", "/api/courses");
    expect(list.data.length).toBe(COURSES.length);
    expect(list.data[0].units).toBeUndefined(); // 目录不带单元，详情才带

    expect((await call("lin", "GET", "/api/learning/next")).data.items).toEqual([]);
    expect((await call("lin", "PUT", "/api/courses/git/enrollment", { status: "active" })).data.ok).toBe(true);
    await call("chen", "PUT", "/api/courses/git/enrollment", { status: "active" });

    const next = await call("lin", "GET", "/api/learning/next");
    expect(next.data.items[0]).toMatchObject({ slug: "git", next: { id: "concept" } });

    const done = await call("lin", "PUT", "/api/courses/git/units/concept", { done: true });
    expect(done.data.next.id).toBe("lgb-basic");
    expect(done.data.progress.doneUnits).toBe(1);

    const detail = await call("lin", "GET", "/api/courses/git");
    expect(detail.data.done.concept).toBeGreaterThan(0);
    expect(detail.data.peers).toEqual(["陈同学"]);
    expect((await call("lin", "GET", "/api/courses")).data.find((c: { slug: string }) => c.slug === "git").learners).toBe(2);

    // 取消完成
    await call("lin", "PUT", "/api/courses/git/units/concept", { done: false });
    expect((await call("lin", "GET", "/api/learning/next")).data.items[0].next.id).toBe("concept");

    // 全部完成后自动标记为学完
    const git = COURSES.find((c) => c.slug === "git")!;
    for (const u of git.units) await call("lin", "PUT", `/api/courses/git/units/${u.id}`, { done: true });
    expect((await call("lin", "GET", "/api/courses/git")).data.enrollment.status).toBe("done");
    expect((await call("lin", "GET", "/api/learning/next")).data.items).toEqual([]);

    // 完成单元会记进热力图的“站内学习”
    const hm = await call("lin", "GET", "/api/heatmap");
    const study = hm.data.series.find((s: { source: string }) => s.source === "site:study");
    expect(Object.values(study.days as Record<string, number>).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(git.units.length);

    expect((await call("lin", "GET", "/api/courses/nope")).status).toBe(404);
    expect((await call("lin", "PUT", "/api/courses/git/units/nope", { done: true })).status).toBe(404);
  });
});

describe("公告与比赛卡", () => {
  test("管理员发布，成员报名组队，删除后不再显示", async () => {
    const { call, member } = setup();
    await member("lin", "2025010101", "林同学");
    expect((await call("lin", "POST", "/api/admin/notices", { kind: "notice", title: "x" })).status).toBe(403);

    const pub = await call("boot", "POST", "/api/admin/notices", {
      kind: "competition",
      title: "睿抗机器人开发者大赛",
      body: "视觉赛道，3 人一队",
      docUrl: "https://www.raicom.com.cn/",
      groupInfo: "QQ 群 123456",
      deadline: "2026-12-01",
      tags: ["AI", "视觉"],
    });
    expect(pub.status).toBe(200);
    await call("boot", "POST", "/api/admin/notices", { kind: "notice", title: "周四晚自习换教室", pinned: true });
    expect((await call("boot", "POST", "/api/admin/notices", { kind: "notice", title: "" })).status).toBe(400);

    let list = await call("lin", "GET", "/api/notices");
    expect(list.data.map((n: { title: string }) => n.title)).toEqual(["周四晚自习换教室", "睿抗机器人开发者大赛"]);

    await call("lin", "PUT", `/api/notices/${pub.data.id}/entry`, { team: "视觉一队", contact: "QQ 10001" });
    list = await call("lin", "GET", "/api/notices");
    const comp = list.data.find((n: { kind: string }) => n.kind === "competition");
    expect(comp).toMatchObject({ joined: true, tags: ["AI", "视觉"], entries: [{ name: "林同学", team: "视觉一队" }] });

    await call("lin", "DELETE", `/api/notices/${pub.data.id}/entry`);
    expect((await call("lin", "GET", "/api/notices")).data.find((n: { kind: string }) => n.kind === "competition").joined).toBe(false);

    await call("boot", "DELETE", `/api/admin/notices/${pub.data.id}`);
    expect((await call("lin", "GET", "/api/notices")).data).toHaveLength(1);
  });
});

describe("管理员角色", () => {
  test("把成员设为管理员后，用自己的学号和密码就能进后台；不能取消自己", async () => {
    const { call, member } = setup();
    const teacherId = await member("teacher", "t2026zhang", "张老师");
    expect((await call("teacher", "GET", "/api/admin/members")).status).toBe(403);
    expect((await call("boot", "POST", `/api/admin/members/${teacherId}/role`, { role: "admin" })).status).toBe(200);
    expect((await call("teacher", "GET", "/api/auth/me")).data.isAdmin).toBe(true);
    expect((await call("teacher", "GET", "/api/admin/members")).status).toBe(200);
    const self = await call("teacher", "POST", `/api/admin/members/${teacherId}/role`, { role: "member" });
    expect(self.status).toBe(400);
    expect((await call("teacher", "POST", `/api/admin/members/${teacherId}/status`, { status: "archived" })).status).toBe(400);

    // 管理员不进“没动静”名单
    expect((await call("teacher", "GET", "/api/admin/idle")).data).toEqual([]);

    // 开学日期 → 教学周
    expect((await call("teacher", "PUT", "/api/admin/settings", { semester_start: "2026-09-07" })).status).toBe(200);
    expect((await call("teacher", "GET", "/api/calendar")).data.semesterStart).toBe("2026-09-07");
  });
});

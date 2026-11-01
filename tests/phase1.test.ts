import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { memoryD1 } from "../scripts/local-d1";
import { readBlocks, enrichBlock } from "../scripts/blocks.mjs";
import { readCourses } from "../scripts/courses.mjs";
import { blockJsonSchema, parseBlock } from "../src/shared/blockSchema";
import { blockCourses, blockPeriods, blockRatio, hoursOf, nextCourse, nodeRatio } from "../src/shared/blocks";
import { itemOfPage, itemsOf, nextItem, planCards, progress, totalPeriods, weeksToFinish } from "../src/shared/courses";
import { light } from "../src/shared/light";
import { packageJsonSchema, parsePackage } from "../src/shared/package";
import { BUILTIN } from "../src/worker/catalog";
import { teachingWeek } from "../src/worker/api/members";
import type { Env } from "../src/worker/env";
import worker from "../src/worker/index";

function setup() {
  const env = {
    DB: memoryD1(),
    ASSETS: { fetch: async () => new Response("index") },
    SESSION_SECRET: "test-session-secret-0123456789abcdef",
    FIRST_ADMIN_CODE: "first-admin-secret",
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
  /** 用邀请码注册一个成员，返回成员 id。第一次调用时先注册管理员 boot。 */
  async function member(who: string, no: string, name: string) {
    if (!jars.has("boot"))
      await call("boot", "POST", "/api/auth/register", { studentNo: "254030411", name: "会长", password: "boss-pass-1", confirm: "boss-pass-1", invite: "first-admin-secret" });
    const inv = await call("boot", "POST", "/api/admin/invites", { count: 1 });
    await call(who, "POST", "/api/auth/register", { studentNo: no, name, className: "计科2501", password: `${no}-pass`, confirm: `${no}-pass`, invite: inv.data.codes[0] });
    const list = await call("boot", "GET", "/api/admin/members");
    return list.data.find((m: { studentNo: string }) => m.studentNo === no).id as string;
  }
  return { call, member, env };
}

const PACKAGES = readCourses(".");
const COURSES = BUILTIN;

describe("课程包", () => {
  test("每一门课都通过 hiana-course@1 校验，slug 不重复，目录和课程包一致", () => {
    const slugs = new Set<string>();
    for (const raw of PACKAGES) {
      const r = parsePackage(raw);
      expect({ slug: raw.slug, errors: r.ok ? [] : r.errors }).toEqual({ slug: raw.slug, errors: [] });
      expect(slugs.has(raw.slug)).toBe(false);
      slugs.add(raw.slug);
    }
    expect(COURSES.map((c) => c.slug)).toEqual(PACKAGES.map((c: { slug: string }) => c.slug));
    expect(COURSES.map(({ origin, ...c }) => JSON.parse(JSON.stringify(c)))).toEqual(PACKAGES.map((c: unknown) => JSON.parse(JSON.stringify(light(c)))));
    // CSDIY 的一切排第一，接着是站内全文的课
    expect(COURSES.slice(0, 4).map((c) => c.slug)).toEqual(["csdiy", "missing-semester", "missing-semester-2020", "cs50x"]);
    expect(COURSES.length).toBeGreaterThan(100);
  });

  test("CSDIY 的一切：前言、使用指南、学习规划、必学工具在一门课里", () => {
    const c = COURSES.find((x) => x.slug === "csdiy")!;
    expect(c.title).toBe("CSDIY 的一切");
    const ids = itemsOf(c).map((it) => it.id);
    for (const id of ["preface", "how-to-use", "cs-roadmap", "git", "vim"]) expect(ids).toContain(id);
    // 必学工具不再是单独的课
    expect(COURSES.some((x) => x.slug === "git")).toBe(false);
  });

  test("每一页正文都有对应的文件", () => {
    for (const c of COURSES)
      for (const it of itemsOf(c)) for (const pg of it.pages) expect({ page: `${c.slug}/${pg.id}`, ok: existsSync(`content/courses/${c.slug}/${pg.id}.md`) }).toEqual({ page: `${c.slug}/${pg.id}`, ok: true });
  });

  test("JSON Schema 是最新的", () => {
    const want = JSON.parse(readFileSync("content/schema/course-v1.json", "utf8"));
    expect(JSON.parse(JSON.stringify(packageJsonSchema()))).toEqual(want);
  });

  test("格式错误给出中文提示", () => {
    const bad = parsePackage({
      format: "hiana-course@1",
      slug: "Bad Slug",
      title: "x",
      modules: [{ id: "m", title: "m", items: [{ id: "a", kind: "lecture", title: "a", practice: [{ id: "q", type: "choice", prompt: "p", options: ["1", "2"], answer: 5 }] }, { id: "a", kind: "lab", title: "b" }] }],
    });
    expect(bad.ok).toBe(false);
    const errs = bad.ok ? [] : bad.errors.join("\n");
    expect(errs).toContain("slug");
    expect(errs).toContain("条目 id 重复");
    expect(errs).toContain("答案下标超出选项");
  });

  test("进度、下一步和预计周数", () => {
    const ms = COURSES.find((c) => c.slug === "missing-semester")!;
    const items = itemsOf(ms);
    const done = new Set([items[0].id]);
    expect(nextItem(ms, done)?.id).toBe(items[1].id);
    const p = progress(ms, done);
    expect(p.totalPeriods).toBe(totalPeriods(ms));
    expect(p.donePeriods).toBe(items[0].periods);
    expect(itemOfPage(ms, items[1].pages[0].id)?.id).toBe(items[1].id);
    expect(weeksToFinish(60, 6)).toBe(10);
    expect(weeksToFinish(61, 6)).toBe(11);
    expect(weeksToFinish(10, 0)).toBeNull();
    expect(nextItem(ms, new Set(items.map((u) => u.id)))).toBeNull();
  });

  test("里课表卡片：没学完的条目一行一张，带节数", () => {
    const cs = COURSES.find((c) => c.slug === "cs50x")!;
    const items = itemsOf(cs);
    const { group, lines } = planCards(cs, new Set([items[0].id]));
    expect(group).toBe("CS50x");
    expect(lines).toHaveLength(items.length - 1);
    expect(lines[0]).toBe(`${items[1].title}（${items[1].periods} 节）`);
  });

  test("教学周", () => {
    expect(teachingWeek("2026-09-07", "2026-09-07")).toBe(1);
    expect(teachingWeek("2026-09-07", "2026-10-21")).toBe(7);
    expect(teachingWeek("2026-09-07", "2026-09-01")).toBeNull();
    expect(teachingWeek(null, "2026-10-21")).toBeNull();
  });
});

describe("知识块", () => {
  const BLOCKS = readBlocks(".");

  test("每个知识块都通过 hiana-block@1 校验，引用的课和条目都存在", () => {
    expect(BLOCKS.map((b: { slug: string }) => b.slug)).toEqual(["newbie", "ai", "embedded", "kaoyan"]);
    for (const raw of BLOCKS) {
      const r = parseBlock(raw);
      expect({ slug: raw.slug, errors: r.ok ? [] : r.errors }).toEqual({ slug: raw.slug, errors: [] });
      const { problems } = enrichBlock(raw, COURSES);
      expect(problems).toEqual([]);
    }
  });

  test("JSON Schema 是最新的", () => {
    const want = JSON.parse(readFileSync("content/schema/block-v1.json", "utf8"));
    expect(JSON.parse(JSON.stringify(blockJsonSchema()))).toEqual(want);
  });

  test("格式错误给出中文提示", () => {
    const bad = parseBlock({ format: "hiana-block@1", slug: "x-y", title: "t", nodes: [{ course: "cs50x", link: { label: "a", url: "https://a" } }, { title: "g", pick: 3, children: [{ course: "a" }] }] });
    expect(bad.ok).toBe(false);
    const errs = bad.ok ? [] : bad.errors.join("\n");
    expect(errs).toContain("只能是一种");
    expect(errs).toContain("pick");
  });

  test("课时、完成度、下一步", () => {
    expect(hoursOf("50-70 小时")).toBe(50);
    expect(hoursOf("100h+")).toBe(100);
    expect(hoursOf("因人而异")).toBe(0);
    const block = {
      nodes: [
        { course: "a", periods: 10 },
        { title: "选一门", pick: 1, children: [ { course: "b", periods: 30 }, { course: "c", periods: 20 } ] },
        { title: "选学", optional: true, children: [ { course: "d", periods: 99 } ] },
      ],
    };
    expect(blockPeriods(block)).toBe(30);
    expect(blockCourses(block.nodes)).toEqual(["a", "b", "c", "d"]);
    const p = (m: Record<string, number>) => (s: string) => m[s] ?? 0;
    expect(nextCourse(block, p({}))?.course).toBe("a");
    expect(nextCourse(block, p({ a: 1 }))?.course).toBe("b");
    // pick 组里已经开始学的课优先
    expect(nextCourse(block, p({ a: 1, c: 0.5 }))?.course).toBe("c");
    expect(nextCourse(block, p({ a: 1, c: 1 }))).toBeNull();
    expect(blockRatio(block, p({ a: 1, c: 1 }))).toBe(1);
    expect(nodeRatio(block.nodes[1], p({ b: 0.5 }))).toBe(0.5);
  });
});

describe("选课接口", () => {
  test("选课、完成单元、首页下一步、同学在学", async () => {
    const { call, member } = setup();
    await member("lin", "250101001", "林同学");
    await member("chen", "250101002", "陈同学");
    const ms = COURSES.find((c) => c.slug === "missing-semester")!;
    const units = itemsOf(ms);
    const [u1, u2] = units;

    const list = await call("lin", "GET", "/api/courses");
    expect(list.data.length).toBe(COURSES.length);
    expect(list.data[0].modules).toBeUndefined(); // 目录不带条目，详情才带

    expect((await call("lin", "GET", "/api/learning/next")).data.items).toEqual([]);
    expect((await call("lin", "PUT", "/api/courses/missing-semester/enrollment", { status: "active" })).data.ok).toBe(true);
    await call("chen", "PUT", "/api/courses/missing-semester/enrollment", { status: "active" });

    const next = await call("lin", "GET", "/api/learning/next");
    expect(next.data.items[0]).toMatchObject({ slug: "missing-semester", hosted: true, next: { id: u1.id } });

    const done = await call("lin", "PUT", `/api/courses/missing-semester/items/${u1.id}`, { done: true });
    expect(done.data.next.id).toBe(u2.id);
    expect(done.data.progress.doneItems).toBe(1);
    expect(done.data.progress.doneUnits).toBe(1); // 旧版 App

    const detail = await call("lin", "GET", "/api/courses/missing-semester");
    expect(detail.data.done[u1.id]).toBeGreaterThan(0);
    expect(detail.data.peers).toEqual(["陈同学"]);
    expect((await call("lin", "GET", "/api/courses")).data.find((c: { slug: string }) => c.slug === "missing-semester").learners).toBe(2);

    // 取消完成
    await call("lin", "PUT", `/api/courses/missing-semester/units/${u1.id}`, { done: false }); // 旧路径还能用
    expect((await call("lin", "GET", "/api/learning/next")).data.items[0].next.id).toBe(u1.id);

    // 全部完成后自动标记为学完
    for (const u of units) await call("lin", "PUT", `/api/courses/missing-semester/items/${u.id}`, { done: true });
    expect((await call("lin", "GET", "/api/courses/missing-semester")).data.enrollment.status).toBe("done");
    expect((await call("lin", "GET", "/api/learning/next")).data.items).toEqual([]);
    // 按单元记进度的课不能手动标记学完
    expect((await call("lin", "PUT", "/api/courses/missing-semester/enrollment", { status: "done" })).status).toBe(400);

    // 完成单元会记进热力图的“站内学习”
    const hm = await call("lin", "GET", "/api/heatmap");
    const study = hm.data.series.find((s: { source: string }) => s.source === "site:study");
    expect(Object.values(study.days as Record<string, number>).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(units.length);

    expect((await call("lin", "GET", "/api/courses/nope")).status).toBe(404);
    expect((await call("lin", "PUT", "/api/courses/missing-semester/items/nope", { done: true })).status).toBe(404);
  });

  test("只有链接的课：加入、手动标记学完", async () => {
    const { call, member } = setup();
    await member("lin", "250101001", "林同学");
    expect((await call("lin", "PUT", "/api/courses/cs61a/enrollment", { status: "active" })).data.ok).toBe(true);
    const next = await call("lin", "GET", "/api/learning/next");
    expect(next.data.items[0]).toMatchObject({ slug: "cs61a", hosted: false, next: null });
    expect((await call("lin", "PUT", "/api/courses/cs61a/enrollment", { status: "done" })).data.status).toBe("done");
    expect((await call("lin", "GET", "/api/courses/cs61a")).data.enrollment.status).toBe("done");
    expect((await call("lin", "GET", "/api/learning/next")).data.items).toEqual([]);
  });
});

describe("课程包发布与练手", () => {
  const pkg = {
    format: "hiana-course@1",
    slug: "my-course",
    title: "自己出的一门课",
    category: "自制",
    modules: [
      {
        id: "m1",
        title: "第一章",
        items: [
          { id: "a", kind: "lecture", title: "第一讲", pages: [{ id: "a1", title: "讲义", body: "# 你好" }], practice: [{ id: "q1", type: "text", prompt: "1+1", answer: ["2"] }] },
          { id: "b", kind: "lab", title: "实验一" },
        ],
      },
    ],
  };

  test("管理员发布、成员学习和做题、撤下", async () => {
    const { call, member } = setup();
    await member("lin", "250101001", "林同学");
    expect((await call("lin", "PUT", "/api/admin/packages", pkg)).status).toBe(403);
    // 不能占用站内自带的课
    expect((await call("boot", "PUT", "/api/admin/packages", { ...pkg, slug: "cs50x" })).status).toBe(409);
    const bad = await call("boot", "PUT", "/api/admin/packages", { ...pkg, slug: "X" });
    expect(bad.status).toBe(400);
    expect(bad.data.errors.length).toBeGreaterThan(0);
    expect((await call("boot", "PUT", "/api/admin/packages", pkg)).data).toEqual({ ok: true, slug: "my-course" });

    const list = await call("lin", "GET", "/api/courses");
    expect(list.data.at(-1)).toMatchObject({ slug: "my-course", origin: "published", itemCount: 2 });
    const full = await call("guest", "GET", "/api/packages/my-course");
    expect(full.data.modules[0].items[0].pages[0].body).toBe("# 你好");

    expect((await call("lin", "PUT", "/api/courses/my-course/practice/a/q1", {})).data.ok).toBe(true);
    expect((await call("lin", "PUT", "/api/courses/my-course/practice/b/q1", {})).status).toBe(404); // b 没有练手题
    await call("lin", "PUT", "/api/courses/my-course/items/a", { done: true });
    const detail = await call("lin", "GET", "/api/courses/my-course");
    expect(detail.data.solved).toEqual({ a: ["q1"] });
    expect(detail.data.progress).toMatchObject({ doneItems: 1, items: 2 });
    expect((await call("lin", "GET", "/api/learning/next")).data.items[0]).toMatchObject({ slug: "my-course", next: { id: "b" } });

    // 同 slug 再发布就是更新
    await call("boot", "PUT", "/api/admin/packages", { ...pkg, title: "改了名字" });
    expect((await call("lin", "GET", "/api/courses/my-course")).data.course.title).toBe("改了名字");

    expect((await call("boot", "DELETE", "/api/admin/packages/my-course")).data.ok).toBe(true);
    expect((await call("lin", "GET", "/api/courses/my-course")).status).toBe(404);
    expect((await call("lin", "GET", "/api/learning/next")).data.items).toEqual([]);
  });
});

describe("蓝色钉子", () => {
  test("游客能看，登录才能钉和回复；我也想问、已解决、撤回；校外账号看不到校内成员真名", async () => {
    const { call, member } = setup();
    await member("lin", "250101001", "林同学");
    await member("chen", "250101002", "陈同学");
    const pin = { course: "cs50x", page: "notes-1", anchorKey: "h-c/p3", anchorLabel: "C 第 3 段", xPct: 0.4, yPct: 0.5, snippet: "printf 是", body: "这里为什么要 \\n？" };
    expect((await call("guest", "POST", "/api/pins", pin)).status).toBe(401);
    expect((await call("lin", "POST", "/api/pins", { ...pin, page: "nope" })).status).toBe(404);
    expect((await call("lin", "POST", "/api/pins", { ...pin, course: "local-x" })).status).toBe(400);
    const made = await call("lin", "POST", "/api/pins", pin);
    expect(made.data).toMatchObject({ item: "w1-lecture", anchorKey: "h-c/p3", mine: true, answered: false, author: "你", status: "open" });
    const id = made.data.id;

    // 游客能看，但看不到名字
    const guest = await call("guest", "GET", "/api/pins?course=cs50x&page=notes-1");
    expect(guest.data).toHaveLength(1);
    expect(guest.data[0].author).toBe("协会成员");
    expect(guest.data[0].messages[0].body).toBe(pin.body);
    expect((await call("chen", "GET", "/api/pins?course=cs50x&page=notes-1")).data[0].author).toBe("林同学");

    // 别人回复后算“有人回了”，提问的人就不能撤回了
    const replied = await call("chen", "POST", `/api/pins/${id}/messages`, { body: "换行符" });
    expect(replied.data.answered).toBe(true);
    expect(replied.data.messages[1]).toMatchObject({ author: "你", mine: true });
    expect((await call("lin", "DELETE", `/api/pins/${id}`)).status).toBe(409);

    // 我也想问：再点取消
    expect((await call("chen", "POST", `/api/pins/${id}/vote`, {})).data).toMatchObject({ votes: 1, voted: true });
    expect((await call("chen", "POST", `/api/pins/${id}/vote`, {})).data).toMatchObject({ votes: 0, voted: false });

    // 已解决：只有提问的人和管理员
    expect((await call("chen", "POST", `/api/pins/${id}/resolve`, { resolved: true })).status).toBe(403);
    expect((await call("lin", "POST", `/api/pins/${id}/resolve`, { resolved: true })).data.status).toBe("resolved");

    // 管理后台能看到，管理员能删
    const admin = await call("boot", "GET", "/api/admin/pins");
    expect(admin.data[0]).toMatchObject({ id, courseTitle: "CS50x：哈佛计算机科学导论" });
    expect((await call("boot", "DELETE", `/api/pins/${id}`)).data.ok).toBe(true);
    expect((await call("guest", "GET", "/api/pins?course=cs50x&page=notes-1")).data).toEqual([]);

    // 没人回复前可以撤回
    const mine = await call("lin", "POST", "/api/pins", pin);
    expect((await call("chen", "DELETE", `/api/pins/${mine.data.id}`)).status).toBe(403);
    expect((await call("lin", "DELETE", `/api/pins/${mine.data.id}`)).data.ok).toBe(true);
  });
});

describe("蓝色钉子 · AI 回答", () => {
  test("没接 AI 时提示；接上后回答留在讨论里，标明是 AI，有次数上限", async () => {
    const { call, member, env } = setup();
    await member("lin", "250101001", "林同学");
    const made = await call("lin", "POST", "/api/pins", { course: "cs50x", page: "notes-1", anchorKey: "k", xPct: 0, yPct: 0, snippet: "回想一下", body: "编译器是什么？" });
    expect((await call("lin", "GET", "/api/ai/status")).data.enabled).toBe(false);
    expect((await call("lin", "POST", `/api/pins/${made.data.id}/ai`, {})).status).toBe(503);

    (env as unknown as Record<string, string>).AI_API_KEY = "test-key";
    const realFetch = globalThis.fetch;
    let prompt = "";
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      prompt = JSON.parse(String(init.body)).messages[1].content;
      return new Response(JSON.stringify({ choices: [{ message: { content: "编译器把源代码翻译成机器码。" }, finish_reason: "stop" }] }), { headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    try {
      expect((await call("guest", "POST", `/api/pins/${made.data.id}/ai`, {})).status).toBe(401);
      const r = await call("lin", "POST", `/api/pins/${made.data.id}/ai`, {});
      expect(r.status).toBe(200);
      expect(r.data.messages.at(-1)).toMatchObject({ agent: true, author: "AI 助手", body: "编译器把源代码翻译成机器码。" });
      expect(r.data.answered).toBe(true);
      expect(prompt).toContain("CS50x");
      expect(prompt).toContain("编译器是什么？");
      await call("lin", "POST", `/api/pins/${made.data.id}/ai`, {});
      await call("lin", "POST", `/api/pins/${made.data.id}/ai`, {});
      expect((await call("lin", "POST", `/api/pins/${made.data.id}/ai`, {})).status).toBe(429);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

describe("校内 / 校外账号", () => {
  test("校外账号：用户名或邮箱登录，邀请码分类型，不能签到，看不到真名，能报名比赛，能当管理员", async () => {
    const { call, member } = setup();
    await member("lin", "250101001", "林同学");
    await call("lin", "PUT", "/api/courses/cs50x/enrollment", { status: "active" });

    const campusInv = (await call("boot", "POST", "/api/admin/invites", { count: 1 })).data.codes[0];
    const extInv = (await call("boot", "POST", "/api/admin/invites", { count: 1, kind: "external" })).data.codes[0];
    const ext = { kind: "external", username: "Alice_01", email: "Alice@Example.com", org: "某某大学", name: "爱丽丝", password: "alice-pass-1", confirm: "alice-pass-1" };

    // 邀请码类型不对：明确提示
    const wrong = await call("alice", "POST", "/api/auth/register", { ...ext, invite: campusInv });
    expect(wrong.status).toBe(400);
    expect(wrong.data.error).toContain("校内");
    expect((await call("x", "POST", "/api/auth/register", { kind: "campus", studentNo: "250101009", name: "某", password: "pass-2026-y", confirm: "pass-2026-y", invite: extInv })).data.error).toContain("校外");
    // 用户名格式
    expect((await call("alice", "POST", "/api/auth/register", { ...ext, username: "12345", invite: extInv })).status).toBe(400);

    const reg = await call("alice", "POST", "/api/auth/register", { ...ext, invite: extInv });
    expect(reg.status).toBe(200);
    expect(reg.data.member).toMatchObject({ kind: "external", studentNo: "", username: "alice_01", email: "alice@example.com", org: "某某大学", name: "爱丽丝" });

    // 用户名、邮箱都能登录（不分大小写）；学号形式找不到校外账号
    expect((await call("a2", "POST", "/api/auth/member", { account: "ALICE_01", password: "alice-pass-1" })).status).toBe(200);
    expect((await call("a3", "POST", "/api/auth/member", { account: "alice@example.com", password: "alice-pass-1" })).status).toBe(200);
    expect((await call("a4", "POST", "/api/auth/member", { account: "alice_01", password: "wrong-pass" })).status).toBe(401);
    // 旧版 App 传 studentNo 也能登录校内账号
    expect((await call("lin2", "POST", "/api/auth/member", { studentNo: "250101001", password: "250101001-pass" })).status).toBe(200);

    // 用户名重复
    const extInv2 = (await call("boot", "POST", "/api/admin/invites", { count: 1, kind: "external" })).data.codes[0];
    expect((await call("b", "POST", "/api/auth/register", { ...ext, email: "", invite: extInv2 })).status).toBe(409);

    // 不能签到
    expect((await call("alice", "GET", "/api/attendance")).status).toBe(403);
    expect((await call("alice", "POST", "/api/attendance/in", { kind: "venue", photo: "x" })).status).toBe(403);

    // 看不到真名
    expect((await call("alice", "GET", "/api/courses/cs50x")).data.peers).toEqual([]);
    expect((await call("lin", "PUT", "/api/courses/cs50x/enrollment", { status: "active" })).status).toBe(200);
    const comp = await call("boot", "POST", "/api/admin/notices", { kind: "competition", title: "蓝桥杯", deadline: "2099-01-01" });
    await call("lin", "PUT", `/api/notices/${comp.data.id}/entry`, { team: "一队", contact: "QQ 1" });
    // 能报名比赛，只看到自己那一条
    expect((await call("alice", "PUT", `/api/notices/${comp.data.id}/entry`, { team: "二队" })).status).toBe(200);
    const seen = (await call("alice", "GET", "/api/notices")).data.find((n: { id: string }) => n.id === comp.data.id);
    expect(seen).toMatchObject({ author: null, entryCount: 2, joined: true, entries: [{ name: "爱丽丝", team: "二队" }] });
    // 校内成员看得到全部
    expect((await call("lin", "GET", "/api/notices")).data.find((n: { id: string }) => n.id === comp.data.id).entries).toHaveLength(2);

    // 学课程、记进度照常
    expect((await call("alice", "PUT", "/api/courses/missing-semester/items/course-shell", { done: true })).status).toBe(200);

    // 后台成员列表；校外账号不进“没动静”名单
    const list = (await call("boot", "GET", "/api/admin/members")).data;
    const a = list.find((m: { kind: string }) => m.kind === "external");
    expect(a).toMatchObject({ studentNo: "", username: "alice_01", org: "某某大学" });
    expect((await call("boot", "GET", "/api/admin/idle")).data.some((m: { id: string }) => m.id === a.id)).toBe(false);

    // 能设为管理员；管理员看得到真名
    await call("boot", "POST", `/api/admin/members/${a.id}/role`, { role: "admin" });
    expect((await call("alice", "GET", "/api/notices")).data.find((n: { id: string }) => n.id === comp.data.id).entries).toHaveLength(2);

    // 重置码：用用户名重置
    const rc = (await call("boot", "POST", `/api/admin/members/${a.id}/reset`)).data;
    const code = rc.code ?? rc.resetCode;
    expect(typeof code).toBe("string");
    expect((await call("alice", "POST", "/api/auth/reset", { account: "alice_01", code, password: "alice-pass-2", confirm: "alice-pass-2" })).status).toBe(200);
    expect((await call("a5", "POST", "/api/auth/member", { account: "alice@example.com", password: "alice-pass-2" })).status).toBe(200);
  });
});

describe("公告与比赛卡", () => {
  test("管理员发布，成员报名组队，删除后不再显示", async () => {
    const { call, member } = setup();
    await member("lin", "250101001", "林同学");
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
    const teacherId = await member("teacher", "260000001", "张老师");
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

describe("晨思夜思", () => {
  test("同一天同一时段覆盖，热力图只记一次；不能写未来", async () => {
    const { call, member } = setup();
    await member("lin", "250101001", "林同学");
    const today = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
    expect((await call("lin", "PUT", `/api/reflections/${today}/morning`, { text: "先学完 CS50x 第 2 周讲座", source: "course-table" })).status).toBe(200);
    expect((await call("lin", "PUT", `/api/reflections/${today}/morning`, { text: "改一下：先做习题集 1" })).status).toBe(200);
    await call("lin", "PUT", `/api/reflections/${today}/evening`, { text: "讲座看完了" });
    expect((await call("lin", "PUT", `/api/reflections/2099-01-01/evening`, { text: "x" })).status).toBe(400);
    expect((await call("lin", "PUT", `/api/reflections/${today}/noon`, { text: "x" })).status).toBe(400);
    expect((await call("lin", "PUT", `/api/reflections/${today}/evening`, { text: "  " })).status).toBe(400);

    const list = await call("lin", "GET", "/api/reflections");
    expect(list.data).toHaveLength(2);
    expect(list.data.find((r: { slot: string }) => r.slot === "morning").text).toBe("改一下：先做习题集 1");

    const hm = await call("lin", "GET", "/api/heatmap");
    const s = hm.data.series.find((x: { source: string }) => x.source === "site:reflection");
    expect(s.days[today]).toBe(2);
    expect((await call("nobody", "GET", "/api/reflections")).status).toBe(401);
  });
});

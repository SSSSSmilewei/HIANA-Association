import { describe, expect, test } from "bun:test";
import { memoryD1 } from "../scripts/local-d1";
import type { Env } from "../src/worker/env";
import worker from "../src/worker/index";

/** 一张最小的 JPEG（只用来过文件头检查） */
const JPEG_B64 = btoa(String.fromCharCode(0xff, 0xd8, 0xff, 0xe0, ...new Array(200).fill(0), 0xff, 0xd9));

/** 用内存数据库把整个 Worker 跑起来，像浏览器一样带着 Cookie 调接口。 */
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
    const res = await worker.fetch(
      new Request(`http://localhost${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }),
      env,
    );
    const set = res.headers.get("set-cookie");
    if (set) jars.set(who, set.split(";")[0]);
    const text = await res.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      /* CSV 等非 JSON */
    }
    return { status: res.status, data: data as Record<string, any>, headers: res.headers };
  }
  return { env, call };
}

describe("接口", () => {
  test("未登录访问受保护接口", async () => {
    const { call } = setup();
    expect((await call("x", "GET", "/api/heatmap")).status).toBe(401);
    expect((await call("x", "GET", "/api/admin/members")).status).toBe(401);
    expect((await call("x", "GET", "/api/nope")).status).toBe(404);
    expect((await call("x", "GET", "/api/auth/me")).data).toEqual({ role: null });
  });

  test("首个管理员、邀请码注册、登录、改密码", async () => {
    const { call } = setup();
    const reg = (who: string, body: Record<string, unknown>) => call(who, "POST", "/api/auth/register", { password: "pass-2026-x", confirm: "pass-2026-x", ...body });

    // 还没有管理员：指定学号要用 FIRST_ADMIN_CODE 才能注册成管理员；学号不对、码不对都不行
    expect((await reg("x", { studentNo: "254030411", name: "会长" })).data.error).toContain("邀请码");
    expect((await reg("x", { studentNo: "254030411", name: "会长", invite: "wrong" })).status).toBe(400);
    expect((await reg("x", { studentNo: "254030412", name: "别人", invite: "first-admin-secret" })).status).toBe(400);
    const boss = await reg("admin", { studentNo: "254030411", name: "会长", invite: "first-admin-secret" });
    expect(boss.status).toBe(200);
    expect(boss.data).toMatchObject({ role: "member", isAdmin: true, member: { studentNo: "254030411", name: "会长" } });
    expect((await call("admin", "GET", "/api/admin/members")).status).toBe(200);
    // 有了管理员之后，这个码就没用了
    expect((await reg("y", { studentNo: "254030499", name: "某人", invite: "first-admin-secret" })).status).toBe(400);

    // 管理员生成邀请码
    expect((await call("admin", "POST", "/api/admin/invites", { count: 0 })).status).toBe(400);
    const inv = await call("admin", "POST", "/api/admin/invites", { count: 3, days: 7, note: "招新" });
    expect(inv.data.codes).toHaveLength(3);
    const [linCode, chenCode, spare] = inv.data.codes as string[];

    // 注册的各种检查
    expect((await reg("lin", { studentNo: "25010100", name: "林同学", invite: linCode })).data.error).toContain("9 位");
    expect((await reg("lin", { studentNo: "2501010011", name: "林同学", invite: linCode })).data.error).toContain("9 位");
    expect((await reg("lin", { studentNo: "25010100a", name: "林同学", invite: linCode })).data.error).toContain("9 位");
    expect((await reg("lin", { studentNo: "250101001", name: "   ", invite: linCode })).data.error).toContain("姓名");
    expect((await reg("lin", { studentNo: "250101001", name: "林\u0007同学", invite: linCode })).data.error).toContain("不能显示");
    expect((await reg("lin", { studentNo: "250101001", name: "林同学", invite: linCode, confirm: "nope" })).data.error).toContain("不一样");
    expect((await reg("lin", { studentNo: "250101001", name: "林同学", invite: linCode, password: "short", confirm: "short" })).data.error).toContain("8");
    expect((await reg("lin", { studentNo: "250101001", name: "林同学", invite: "aaaa-bbbb-cccc" })).data.error).toContain("邀请码");
    expect((await reg("lin", { studentNo: "250101001", name: "林同学" })).data.error).toContain("邀请码");

    const lin = await reg("lin", { studentNo: "250101001", name: "林同学", className: "计科2501", invite: linCode.toUpperCase() });
    expect(lin.status).toBe(200);
    expect(lin.data).toMatchObject({ isAdmin: false, member: { name: "林同学", className: "计科2501", displayName: null } });
    expect((await call("lin", "GET", "/api/auth/me")).data).toMatchObject({ role: "member", member: { studentNo: "250101001" } });

    // 一个码只能用一次；同一个学号不能注册两次
    expect((await reg("z", { studentNo: "250101009", name: "赵同学", invite: linCode })).data.error).toContain("用过");
    expect((await reg("z", { studentNo: "250101001", name: "冒名", invite: chenCode })).status).toBe(409);
    expect((await reg("chen", { studentNo: "250101002", name: "陈同学", className: "计科2501", invite: chenCode })).status).toBe(200);

    // 作废没用过的码；用过的不能作废
    const list = await call("admin", "GET", "/api/admin/invites");
    expect(list.data.map((i: { state: string }) => i.state).sort()).toEqual(["unused", "used", "used"]);
    const spareRow = list.data.find((i: { state: string }) => i.state === "unused");
    expect(spareRow.hint).toBe(spare.slice(-4));
    expect((await call("admin", "DELETE", `/api/admin/invites/${spareRow.id}`)).status).toBe(200);
    expect((await call("admin", "DELETE", `/api/admin/invites/${spareRow.id}`)).status).toBe(400);
    expect((await reg("w", { studentNo: "250101003", name: "王同学", invite: spare })).data.error).toContain("邀请码");

    // 管理员关掉注册后，有码也不能注册
    const more = await call("admin", "POST", "/api/admin/invites", { count: 1 });
    expect((await call("admin", "PUT", "/api/admin/settings", { registration_open: "0" })).status).toBe(200);
    expect((await call("w", "GET", "/api/auth/options")).data.registrationOpen).toBe(false);
    expect((await reg("w", { studentNo: "250101003", name: "王同学", invite: more.data.codes[0] })).status).toBe(403);
    await call("admin", "PUT", "/api/admin/settings", { registration_open: "1" });

    // 学号 + 密码登录，可以在几台设备上登录
    expect((await call("lin-phone", "POST", "/api/auth/member", { studentNo: "250101001", password: "wrong-pass" })).status).toBe(401);
    expect((await call("lin-phone", "POST", "/api/auth/member", { studentNo: "250101001", password: "pass-2026-x" })).status).toBe(200);

    // 改密码要先输当前密码；改完后其他设备退出登录，当前设备继续可用
    expect((await call("lin", "POST", "/api/auth/password", { current: "", password: "new-pass-2026", confirm: "new-pass-2026" })).data.error).toContain("当前密码");
    expect((await call("lin", "POST", "/api/auth/password", { current: "pass-2026-x", password: "new-pass-2026", confirm: "new-pass-2026" })).status).toBe(200);
    expect((await call("lin", "GET", "/api/auth/me")).data.role).toBe("member");
    expect((await call("lin-phone", "GET", "/api/auth/me")).data.role).toBeNull();
    expect((await call("x2", "POST", "/api/auth/member", { studentNo: "250101001", password: "pass-2026-x" })).status).toBe(401);
    expect((await call("x2", "POST", "/api/auth/member", { studentNo: "250101001", password: "new-pass-2026" })).status).toBe(200);

    // 以前的“会长”接口已经没有了
    expect((await call("x", "POST", "/api/auth/admin", { password: "anything" })).status).toBe(404);
    expect((await call("x", "POST", "/api/auth/activate", { code: "anything" })).status).toBe(404);
  });

  test("成员看热力图、打卡，管理员导出表格、重置密码、停用", async () => {
    const { call, env } = setup();
    await call("admin", "POST", "/api/auth/register", { studentNo: "254030411", name: "会长", password: "boss-pass-1", confirm: "boss-pass-1", invite: "first-admin-secret" });
    const inv = await call("admin", "POST", "/api/admin/invites", { count: 2 });
    for (const [who, no, name, code] of [
      ["lin", "250101001", "林同学", inv.data.codes[0]],
      ["chen", "250101002", "陈同学", inv.data.codes[1]],
    ])
      await call(who, "POST", "/api/auth/register", { studentNo: no, name, className: "计科2501", password: "pass-2026-x", confirm: "pass-2026-x", invite: code });

    // 成员不能访问后台
    expect((await call("lin", "GET", "/api/admin/members")).status).toBe(403);

    const hm = await call("lin", "GET", "/api/heatmap");
    expect(hm.status).toBe(200);
    expect(hm.data.series.map((s: { source: string }) => s.source)).toEqual(["site:attendance", "site:reflection", "site:study"]);
    expect(hm.data.providers.find((p: { id: string }) => p.id === "maimemo").needsUserSecret).toContain("开放 API");

    // 绑定一个待实测的平台被拒绝，提示清楚
    const bad = await call("lin", "POST", "/api/heatmap/bindings", { source: "gitee", handle: "lin" });
    expect(bad.status).toBe(400);
    expect(bad.data.error).toContain("暂不支持");

    // 签到：把晚自习设成每天全天，避免测试受当前时间影响；打开现场口令
    expect((await call("admin", "PUT", "/api/admin/attendance/settings", { days: "1,2,3,4,5,6,7", window: "00:00-23:59", requireCode: true })).status).toBe(200);
    const today = await call("admin", "GET", "/api/admin/attendance/today");
    expect(today.data.code).toMatch(/^\d{4}$/);
    const photo = JPEG_B64;
    expect((await call("lin", "POST", "/api/attendance/in", { kind: "evening", photo, code: today.data.code === "0000" ? "1111" : "0000" })).status).toBe(400);
    expect((await call("lin", "POST", "/api/attendance/in", { kind: "evening", photo: "x".repeat(200), code: today.data.code })).status).toBe(400);
    const ok = await call("lin", "POST", "/api/attendance/in", { kind: "evening", photo, code: today.data.code });
    expect(ok.data.ok).toBe(true);
    const again = await call("lin", "POST", "/api/attendance/in", { kind: "venue", photo });
    expect(again.status).toBe(409);
    const state = await call("lin", "GET", "/api/attendance");
    expect(state.data.current).toMatchObject({ kind: "evening", inAt: ok.data.inAt });
    expect((await call("lin", "POST", "/api/attendance/out", { photo })).data.ok).toBe(true);
    expect((await call("lin", "GET", "/api/attendance")).data.current).toBeNull();

    // 照片：本人和管理员能看，别人不能
    const adminToday = await call("admin", "GET", "/api/admin/attendance/today");
    expect(adminToday.data.records).toHaveLength(1);
    const photoKey = adminToday.data.records[0].inPhoto as string;
    const img = await call("admin", "GET", `/api/files/${photoKey}`);
    expect(img.status).toBe(200);
    expect(img.headers.get("content-type")).toBe("image/jpeg");
    expect((await call("lin", "GET", `/api/files/${photoKey}`)).status).toBe(200);

    // 签到出现在热力图“签到”那一行（签到 + 签退两条）
    const after = await call("lin", "GET", "/api/heatmap");
    expect(Object.values(after.data.series[0].days)).toEqual([2]);

    const csv = await call("admin", "GET", `/api/admin/attendance.csv?from=${state.data.today}&to=${state.data.today}`);
    expect(csv.headers.get("content-type")).toContain("text/csv");
    expect(String(csv.data)).toContain("250101001,林同学,计科2501");
    expect(String(csv.data)).toContain("已签退");

    // 没动静名单里只有陈同学
    const idle = await call("admin", "GET", "/api/admin/idle?days=7");
    expect(idle.data.map((m: { name: string }) => m.name)).toEqual(["陈同学"]);

    // 忘记密码：管理员生成重置码，旧密码和已登录的设备都失效；用学号 + 重置码设新密码
    const members = await call("admin", "GET", "/api/admin/members");
    const lin = members.data.find((m: { name: string }) => m.name === "林同学");
    expect(lin.hasPassword).toBe(true);
    const reset = await call("admin", "POST", `/api/admin/members/${lin.id}/reset`, {});
    expect(reset.data.code).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
    expect((await call("lin", "GET", "/api/auth/me")).data.role).toBeNull();
    expect((await call("x3", "POST", "/api/auth/member", { studentNo: "250101001", password: "pass-2026-x" })).status).toBe(401);
    expect((await call("x3", "POST", "/api/auth/reset", { studentNo: "250101002", code: reset.data.code, password: "reset-pass-1", confirm: "reset-pass-1" })).status).toBe(400);
    expect((await call("lin", "POST", "/api/auth/reset", { studentNo: "250101001", code: reset.data.code, password: "reset-pass-1", confirm: "reset-pass-1" })).status).toBe(200);
    expect((await call("lin", "GET", "/api/auth/me")).data.role).toBe("member");
    // 重置码只能用一次
    expect((await call("x3", "POST", "/api/auth/reset", { studentNo: "250101001", code: reset.data.code, password: "reset-pass-2", confirm: "reset-pass-2" })).status).toBe(400);

    // 停用后不能登录，已登录的会话也失效
    await call("admin", "POST", `/api/admin/members/${lin.id}/status`, { status: "archived" });
    expect((await call("lin", "GET", "/api/auth/me")).data.role).toBeNull();

    void env;
  });

  test("游客能看课程、公告、日历，看不到真名和联系方式，不能做需要账号的事", async () => {
    const { call, env } = setup();
    await call("admin", "POST", "/api/auth/register", { studentNo: "254030411", name: "会长", password: "boss-pass-1", confirm: "boss-pass-1", invite: "first-admin-secret" });
    const inv = await call("admin", "POST", "/api/admin/invites", { count: 1 });
    await call("lin", "POST", "/api/auth/register", { studentNo: "250101001", name: "林同学", password: "pass-2026-x", confirm: "pass-2026-x", invite: inv.data.codes[0] });
    const comp = await call("admin", "POST", "/api/admin/notices", { kind: "competition", title: "蓝桥杯", deadline: "2099-01-01" });
    await call("lin", "PUT", `/api/notices/${comp.data.id}/entry`, { team: "一队", contact: "微信 lin123" });
    await call("lin", "PUT", "/api/courses/cs61a/enrollment", { status: "active" });

    const users = async () => (await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first<{ n: number }>())?.n;
    const before = await users();

    const courses = await call("guest", "GET", "/api/courses");
    expect(courses.status).toBe(200);
    expect(courses.data.find((c: { slug: string }) => c.slug === "cs61a")).toMatchObject({ learners: 1, enrollment: null });
    const course = await call("guest", "GET", "/api/courses/cs61a");
    expect(course.status).toBe(200);
    expect(course.data.peers).toEqual([]);
    const notices = await call("guest", "GET", "/api/notices");
    expect(notices.status).toBe(200);
    expect(notices.data[0]).toMatchObject({ title: "蓝桥杯", entries: [], entryCount: 1, author: null, joined: false });
    expect(JSON.stringify(notices.data)).not.toContain("lin123");
    expect((await call("guest", "GET", "/api/calendar")).status).toBe(200);
    expect((await call("guest", "GET", "/api/auth/options")).data.registrationOpen).toBe(true);

    // 登录后能看到名单
    expect((await call("lin", "GET", "/api/notices")).data[0].entries[0]).toMatchObject({ name: "林同学", contact: "微信 lin123" });

    // 需要账号的接口
    expect((await call("guest", "PUT", "/api/courses/cs61a/enrollment", { status: "active" })).status).toBe(401);
    expect((await call("guest", "PUT", `/api/notices/${comp.data.id}/entry`, {})).status).toBe(401);
    expect((await call("guest", "GET", "/api/learning/next")).status).toBe(401);
    expect((await call("guest", "GET", "/api/attendance")).status).toBe(401);
    expect((await call("guest", "POST", "/api/me/visit")).status).toBe(401);
    expect((await call("guest", "PUT", "/api/me/display-name", { displayName: "x" })).status).toBe(401);
    // 游客不在数据库里留任何账号
    expect(await users()).toBe(before);
  });

  test("显示名：只改自己的，校验长度和字符，空字符串恢复真名", async () => {
    const { call, env } = setup();
    await call("admin", "POST", "/api/auth/register", { studentNo: "254030411", name: "会长", password: "boss-pass-1", confirm: "boss-pass-1", invite: "first-admin-secret" });
    const inv = await call("admin", "POST", "/api/admin/invites", { count: 1 });
    await call("lin", "POST", "/api/auth/register", { studentNo: "250101001", name: "林同学", password: "pass-2026-x", confirm: "pass-2026-x", invite: inv.data.codes[0] });
    const set = (displayName: string) => call("lin", "PUT", "/api/me/display-name", { displayName });

    expect((await set("  小林  ")).data).toEqual({ displayName: "小林" });
    expect((await call("lin", "GET", "/api/auth/me")).data.member).toMatchObject({ name: "林同学", displayName: "小林" });
    expect((await set("   ")).status).toBe(400);
    expect((await set("\u3000\u3000")).status).toBe(400);
    expect((await set("a".repeat(21))).status).toBe(400);
    expect((await set("一".repeat(20))).status).toBe(200);
    expect((await set("🙂".repeat(20))).status).toBe(200); // 按字符数，不按 UTF-16 长度
    expect((await set("林\n同学")).status).toBe(400);
    expect((await set("林\u200b同学")).status).toBe(400);
    expect((await set("林\u202e同学")).status).toBe(400);
    // 原样保存，转义交给前端（React 默认转义）
    expect((await set("<b>x</b>")).data.displayName).toBe("<b>x</b>");
    expect((await set("")).data).toEqual({ displayName: null });
    // 真名没有被改过
    const row = await env.DB.prepare("SELECT name, display_name FROM users WHERE student_no = '250101001'").first();
    expect(row).toEqual({ name: "林同学", display_name: null });
    // 其他地方继续用真名：管理员看到的成员名单里还是真名
    await set("小林");
    expect((await call("admin", "GET", "/api/admin/members")).data.find((m: { studentNo: string }) => m.studentNo === "250101001").name).toBe("林同学");
  });

  test("上次访问：先返回旧值，再更新；一小时内不重复写库", async () => {
    const { call, env } = setup();
    await call("admin", "POST", "/api/auth/register", { studentNo: "254030411", name: "会长", password: "boss-pass-1", confirm: "boss-pass-1", invite: "first-admin-secret" });
    const first = await call("admin", "POST", "/api/me/visit");
    expect(first.data.lastSeenAt).toBeNull();
    const second = await call("admin", "POST", "/api/me/visit");
    expect(typeof second.data.lastSeenAt).toBe("number");
    // 把上次访问改到 8 天前：返回 8 天前，然后更新成现在
    const old = Date.now() - 8 * 86_400_000;
    await env.DB.prepare("UPDATE users SET last_seen_at = ?").bind(old).run();
    expect((await call("admin", "POST", "/api/me/visit")).data.lastSeenAt).toBe(old);
    const now1 = (await env.DB.prepare("SELECT last_seen_at AS t FROM users").first<{ t: number }>())?.t as number;
    expect(now1).toBeGreaterThan(old);
    // 半小时前写过：不再写
    const recent = Date.now() - 30 * 60_000;
    await env.DB.prepare("UPDATE users SET last_seen_at = ?").bind(recent).run();
    expect((await call("admin", "POST", "/api/me/visit")).data.lastSeenAt).toBe(recent);
    expect((await env.DB.prepare("SELECT last_seen_at AS t FROM users").first<{ t: number }>())?.t).toBe(recent);
  });

  test("错误的打卡时间段格式被拒绝", async () => {
    const { call } = setup();
    await call("admin", "POST", "/api/auth/register", { studentNo: "254030411", name: "会长", password: "boss-pass-1", confirm: "boss-pass-1", invite: "first-admin-secret" });
    const r = await call("admin", "PUT", "/api/admin/attendance/settings", { days: "1,2,4", window: "22:00-18:00", requireCode: false });
    expect(r.status).toBe(400);
  });

  test("请求体不是 JSON", async () => {
    const { env } = setup();
    const res = await worker.fetch(new Request("http://localhost/api/auth/member", { method: "POST", body: "{oops" }), env);
    expect(res.status).toBe(400);
  });

  test("非 /api 路径交给静态资源", async () => {
    const { env } = setup();
    expect(await (await worker.fetch(new Request("http://localhost/profile"), env)).text()).toBe("index");
  });
});

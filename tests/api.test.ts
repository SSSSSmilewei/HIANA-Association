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
    ADMIN_PASSWORD: "hiana-admin",
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

  test("会长导入名单，成员用口令登录、看热力图、打卡，会长导出表格", async () => {
    const { call, env } = setup();
    expect((await call("admin", "POST", "/api/auth/admin", { password: "wrong" })).status).toBe(401);
    expect((await call("admin", "POST", "/api/auth/admin", { password: "hiana-admin" })).status).toBe(200);

    const imp = await call("admin", "POST", "/api/admin/members/import", { text: "2025010101\t林同学\t计科2501\n2025010102\t陈同学\t计科2501" });
    expect(imp.status).toBe(200);
    expect(imp.data.created).toHaveLength(2);
    const linCode = imp.data.created[0].passcode as string;

    // 第一次：用口令激活，必须先设密码
    expect((await call("lin", "POST", "/api/auth/activate", { code: "aaaa-bbbb-cccc" })).status).toBe(401);
    const act = await call("lin", "POST", "/api/auth/activate", { code: linCode });
    expect(act.data).toMatchObject({ needsPassword: true, member: { name: "林同学" } });
    expect((await call("lin", "GET", "/api/auth/me")).data.needsPassword).toBe(true);
    expect((await call("lin", "POST", "/api/auth/password", { password: "abcd1234", confirm: "abcd1235" })).data.error).toContain("不一样");
    expect((await call("lin", "POST", "/api/auth/password", { password: "short", confirm: "short" })).data.error).toContain("8");
    expect((await call("lin", "POST", "/api/auth/password", { password: "lin-pass-2026", confirm: "lin-pass-2026" })).status).toBe(200);
    expect((await call("lin", "GET", "/api/auth/me")).data).toMatchObject({ needsPassword: false, member: { studentNo: "2025010101" } });

    // 口令用过就作废；以后用学号 + 密码登录，可以反复用
    expect((await call("lin-phone", "POST", "/api/auth/activate", { code: linCode })).status).toBe(401);
    expect((await call("lin-phone", "POST", "/api/auth/member", { studentNo: "2025010101", password: "wrong-pass" })).status).toBe(401);
    expect((await call("lin-phone", "POST", "/api/auth/member", { studentNo: "2025010101", password: "lin-pass-2026" })).status).toBe(200);
    expect((await call("lin-pad", "POST", "/api/auth/member", { studentNo: "2025010101", password: "lin-pass-2026" })).status).toBe(200);

    // 改密码要先输当前密码
    expect((await call("lin", "POST", "/api/auth/password", { password: "new-pass-2026", confirm: "new-pass-2026" })).data.error).toContain("当前密码");
    expect((await call("lin", "POST", "/api/auth/password", { current: "lin-pass-2026", password: "new-pass-2026", confirm: "new-pass-2026" })).status).toBe(200);
    expect((await call("x2", "POST", "/api/auth/member", { studentNo: "2025010101", password: "lin-pass-2026" })).status).toBe(401);
    expect((await call("x2", "POST", "/api/auth/member", { studentNo: "2025010101", password: "new-pass-2026" })).status).toBe(200);

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
    expect(String(csv.data)).toContain("2025010101,林同学,计科2501");
    expect(String(csv.data)).toContain("已签退");

    // 没动静名单里只有陈同学
    const idle = await call("admin", "GET", "/api/admin/idle?days=7");
    expect(idle.data.map((m: { name: string }) => m.name)).toEqual(["陈同学"]);

    // 忘记密码：会长重置，旧密码作废，用新口令重新激活
    const members = await call("admin", "GET", "/api/admin/members");
    const lin = members.data.find((m: { name: string }) => m.name === "林同学");
    expect(lin.hasPassword).toBe(true);
    const reset = await call("admin", "POST", `/api/admin/members/${lin.id}/reset`, {});
    expect((await call("x3", "POST", "/api/auth/member", { studentNo: "2025010101", password: "new-pass-2026" })).status).toBe(401);
    expect((await call("x3", "POST", "/api/auth/activate", { code: reset.data.passcode })).data.needsPassword).toBe(true);

    // 停用后不能登录，已登录的会话也失效
    await call("admin", "POST", `/api/admin/members/${lin.id}/status`, { status: "archived" });
    expect((await call("lin", "GET", "/api/auth/me")).data.role).toBeNull();

    void env;
  });

  test("错误的打卡时间段格式被拒绝", async () => {
    const { call } = setup();
    await call("admin", "POST", "/api/auth/admin", { password: "hiana-admin" });
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

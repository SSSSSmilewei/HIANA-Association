import { describe, expect, test } from "bun:test";
import { memoryD1 } from "../scripts/local-d1";
import type { Env } from "../src/worker/env";
import worker from "../src/worker/index";

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

    expect((await call("lin", "POST", "/api/auth/member", { code: "aaaa-bbbb-cccc" })).status).toBe(401);
    const login = await call("lin", "POST", "/api/auth/member", { code: linCode });
    expect(login.data.member.name).toBe("林同学");
    expect((await call("lin", "GET", "/api/auth/me")).data.member.studentNo).toBe("2025010101");

    // 成员不能访问后台
    expect((await call("lin", "GET", "/api/admin/members")).status).toBe(401);

    const hm = await call("lin", "GET", "/api/heatmap");
    expect(hm.status).toBe(200);
    expect(hm.data.series[0].source).toBe("site");
    expect(hm.data.providers.find((p: { id: string }) => p.id === "maimemo").needsUserSecret).toContain("开放 API");

    // 绑定一个待实测的平台被拒绝，提示清楚
    const bad = await call("lin", "POST", "/api/heatmap/bindings", { source: "gitee", handle: "lin" });
    expect(bad.status).toBe(400);
    expect(bad.data.error).toContain("暂不支持");

    // 打卡：把打卡时间段设成全天，避免测试受当前时间影响
    expect((await call("admin", "PUT", "/api/admin/checkin/settings", { window: "00:00-23:59", requireCode: true })).status).toBe(200);
    const today = await call("admin", "GET", "/api/admin/checkin/today");
    expect(today.data.code).toMatch(/^\d{4}$/);
    expect((await call("lin", "POST", "/api/checkin", { code: "0000" === today.data.code ? "1111" : "0000" })).status).toBe(400);
    const ok = await call("lin", "POST", "/api/checkin", { code: today.data.code });
    expect(ok.data.ok).toBe(true);
    const again = await call("lin", "POST", "/api/checkin", { code: today.data.code });
    expect(again.data.reason).toBe("already");
    expect((await call("lin", "GET", "/api/checkin")).data.checkedAt).toBe(ok.data.at);
    expect((await call("admin", "GET", "/api/admin/checkin/today")).data.count).toBe(1);

    // 打卡出现在热力图“协会平台”那一行
    const after = await call("lin", "GET", "/api/heatmap");
    expect(Object.values(after.data.series[0].days)).toEqual([1]);

    const csv = await call("admin", "GET", `/api/admin/checkins.csv?from=${ok.data.day}&to=${ok.data.day}`);
    expect(csv.headers.get("content-type")).toContain("text/csv");
    expect(String(csv.data)).toContain("2025010101,林同学,计科2501");

    // 没动静名单里只有陈同学
    const idle = await call("admin", "GET", "/api/admin/idle?days=7");
    expect(idle.data.map((m: { name: string }) => m.name)).toEqual(["陈同学"]);

    // 停用后口令失效
    const members = await call("admin", "GET", "/api/admin/members");
    const linId = members.data.find((m: { name: string }) => m.name === "林同学").id;
    await call("admin", "POST", `/api/admin/members/${linId}/status`, { status: "archived" });
    expect((await call("lin2", "POST", "/api/auth/member", { code: linCode })).status).toBe(401);
    expect((await call("lin", "GET", "/api/auth/me")).data.role).toBeNull();

    void env;
  });

  test("错误的打卡时间段格式被拒绝", async () => {
    const { call } = setup();
    await call("admin", "POST", "/api/auth/admin", { password: "hiana-admin" });
    const r = await call("admin", "PUT", "/api/admin/checkin/settings", { window: "22:00-18:00", requireCode: false });
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

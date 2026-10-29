import { describe, expect, test } from "bun:test";
import { memoryD1 } from "../scripts/local-d1";
import type { Env } from "../src/worker/env";
import worker from "../src/worker/index";

/** 手机 App 的接口：令牌登录、课程、版本检查。网页端行为不能变。 */
function setup() {
  const env = {
    DB: memoryD1(),
    ASSETS: { fetch: async () => new Response("index") },
    SESSION_SECRET: "test-session-secret-0123456789abcdef",
    FIRST_ADMIN_CODE: "first-admin-secret",
  } as unknown as Env;
  let adminCookie = "";
  async function call(method: string, path: string, opts: { body?: unknown; headers?: Record<string, string> } = {}) {
    const headers: Record<string, string> = { ...opts.headers };
    if (opts.body !== undefined) headers["content-type"] = "application/json";
    const res = await worker.fetch(
      new Request(`http://localhost${path}`, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) }),
      env,
    );
    const text = await res.text();
    let data: any = text;
    try {
      data = JSON.parse(text);
    } catch {
      /* 非 JSON */
    }
    return { status: res.status, data, setCookie: res.headers.get("set-cookie") };
  }
  async function admin(method: string, path: string, body?: unknown) {
    if (!adminCookie) {
      const r = await call("POST", "/api/auth/register", {
        body: { studentNo: "254030411", name: "会长", password: "boss-pass-1", confirm: "boss-pass-1", invite: "first-admin-secret" },
      });
      adminCookie = (r.setCookie ?? "").split(";")[0];
    }
    return call(method, path, { body, headers: { cookie: adminCookie } });
  }
  /** 管理员发一个邀请码，用它注册一个成员。 */
  async function register(studentNo: string, name: string, headers: Record<string, string> = {}) {
    const inv = await admin("POST", "/api/admin/invites", { count: 1 });
    return call("POST", "/api/auth/register", { body: { studentNo, name, password: "pass-2026-x", confirm: "pass-2026-x", invite: inv.data.codes[0] }, headers });
  }
  return { call, admin, register };
}

const APP = { "x-hiana-client": "app" };

describe("手机 App 接口", () => {
  test("注册和登录：带 App 头才返回令牌，令牌能访问受保护接口", async () => {
    const { call, register } = setup();
    const reg = await register("250101001", "林同学", APP);
    expect(reg.status).toBe(200);
    expect(typeof reg.data.token).toBe("string");

    const login = await call("POST", "/api/auth/member", { body: { studentNo: "250101001", password: "pass-2026-x" }, headers: APP });
    expect(typeof login.data.token).toBe("string");

    for (const token of [reg.data.token, login.data.token]) {
      const auth = { authorization: `Bearer ${token}` };
      expect((await call("GET", "/api/heatmap", { headers: auth })).status).toBe(200);
      expect((await call("GET", "/api/attendance", { headers: auth })).status).toBe(200);
      const courses = await call("GET", "/api/courses", { headers: auth });
      expect(courses.data.length).toBeGreaterThan(0);
    }
  });

  test("App 改密码后拿到新令牌，旧令牌失效", async () => {
    const { call, register } = setup();
    const reg = await register("250101004", "赵同学", APP);
    const old = { authorization: `Bearer ${reg.data.token}` };
    const r = await call("POST", "/api/auth/password", { body: { current: "pass-2026-x", password: "new-pass-2026", confirm: "new-pass-2026" }, headers: { ...APP, ...old } });
    expect(r.status).toBe(200);
    expect((await call("GET", "/api/heatmap", { headers: old })).status).toBe(401);
    expect((await call("GET", "/api/heatmap", { headers: { authorization: `Bearer ${r.data.token}` } })).status).toBe(200);
  });

  test("网页登录的返回体里没有令牌", async () => {
    const { register } = setup();
    const reg = await register("250101002", "陈同学");
    expect(reg.status).toBe(200);
    expect(reg.data.token).toBeUndefined();
    expect(reg.setCookie).toContain("hiana_s=");
  });

  test("伪造或缺失令牌返回 401", async () => {
    const { call } = setup();
    expect((await call("GET", "/api/heatmap", { headers: { authorization: "Bearer abc.def" } })).status).toBe(401);
    // 游客能看课程目录，但需要账号的接口不行
    expect((await call("GET", "/api/courses")).status).toBe(200);
    expect((await call("GET", "/api/attendance")).status).toBe(401);
  });

  test("账号被停用后，已发出的令牌立即失效", async () => {
    const { call, admin, register } = setup();
    const act = await register("250101003", "王同学", APP);
    const auth = { authorization: `Bearer ${act.data.token}` };
    expect((await call("GET", "/api/heatmap", { headers: auth })).status).toBe(200);

    const members = await admin("GET", "/api/admin/members");
    const id = members.data.find((m: { studentNo: string }) => m.studentNo === "250101003").id as string;
    await admin("POST", `/api/admin/members/${id}/status`, { status: "archived" });
    expect((await call("GET", "/api/heatmap", { headers: auth })).status).toBe(401);
  });

  test("版本检查不需要登录，有默认值", async () => {
    const { call } = setup();
    const v = await call("GET", "/api/app/version");
    expect(v.status).toBe(200);
    expect(v.data).toMatchObject({ latest: "1.0.0", min: "1.0.0", apkUrl: null });
  });
});

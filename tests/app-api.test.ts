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
    ADMIN_PASSWORD: "hiana-admin",
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
      const r = await call("POST", "/api/auth/admin", { body: { password: "hiana-admin" } });
      adminCookie = (r.setCookie ?? "").split(";")[0];
    }
    return call(method, path, { body, headers: { cookie: adminCookie } });
  }
  return { call, admin };
}

const APP = { "x-hiana-client": "app" };

describe("手机 App 接口", () => {
  test("口令激活：带 App 头才返回令牌，令牌能访问受保护接口", async () => {
    const { call, admin } = setup();
    const imp = await admin("POST", "/api/admin/members/import", { text: "2025010101\t林同学\t计科2501" });
    const code = imp.data.created[0].passcode as string;

    const act = await call("POST", "/api/auth/activate", { body: { code }, headers: APP });
    expect(act.status).toBe(200);
    expect(typeof act.data.token).toBe("string");

    const auth = { authorization: `Bearer ${act.data.token}` };
    expect((await call("GET", "/api/heatmap", { headers: auth })).status).toBe(200);
    expect((await call("GET", "/api/checkin", { headers: auth })).status).toBe(200);
    const course = await call("GET", "/api/course", { headers: auth });
    expect(course.data.currentWeek).toBeGreaterThanOrEqual(0);
    expect(course.data.track.weeks.length).toBeGreaterThan(0);
  });

  test("网页登录的返回体里没有令牌", async () => {
    const { call, admin } = setup();
    const imp = await admin("POST", "/api/admin/members/import", { text: "2025010102\t陈同学\t计科2501" });
    const act = await call("POST", "/api/auth/activate", { body: { code: imp.data.created[0].passcode } });
    expect(act.status).toBe(200);
    expect(act.data.token).toBeUndefined();
    expect(act.setCookie).toContain("hiana_s=");
  });

  test("伪造或缺失令牌返回 401", async () => {
    const { call } = setup();
    expect((await call("GET", "/api/heatmap", { headers: { authorization: "Bearer abc.def" } })).status).toBe(401);
    expect((await call("GET", "/api/course")).status).toBe(401);
  });

  test("账号被停用后，已发出的令牌立即失效", async () => {
    const { call, admin } = setup();
    const imp = await admin("POST", "/api/admin/members/import", { text: "2025010103\t王同学\t计科2501" });
    const act = await call("POST", "/api/auth/activate", { body: { code: imp.data.created[0].passcode }, headers: APP });
    const auth = { authorization: `Bearer ${act.data.token}` };
    expect((await call("GET", "/api/heatmap", { headers: auth })).status).toBe(200);

    const members = await admin("GET", "/api/admin/members");
    const id = members.data[0].id as string;
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

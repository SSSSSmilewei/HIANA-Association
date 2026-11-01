import { afterEach, describe, expect, test } from "bun:test";
import { memoryD1 } from "../scripts/local-d1";
import type { Env } from "../src/worker/env";
import worker from "../src/worker/index";

/** 管理员修改成员信息、注册必填班级、自己补填班级、安装包转发。 */
function setup() {
  const env = {
    DB: memoryD1(),
    ASSETS: { fetch: async () => new Response("index") },
    SESSION_SECRET: "test-session-secret-0123456789abcdef",
    FIRST_ADMIN_CODE: "first-admin-secret",
  } as unknown as Env;
  const APP = { "x-hiana-client": "app" };
  async function call(method: string, path: string, opts: { body?: unknown; token?: string } = {}) {
    const headers: Record<string, string> = { ...APP };
    if (opts.token) headers.authorization = `Bearer ${opts.token}`;
    if (opts.body !== undefined) headers["content-type"] = "application/json";
    const res = await worker.fetch(new Request(`http://localhost${path}`, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) }), env);
    const text = await res.text();
    let data: any = text;
    try {
      data = JSON.parse(text);
    } catch {
      /* 非 JSON */
    }
    return { status: res.status, data, headers: res.headers };
  }
  let adminToken = "";
  async function admin(method: string, path: string, body?: unknown) {
    if (!adminToken) {
      const r = await call("POST", "/api/auth/register", {
        body: { studentNo: "254030411", name: "会长", className: "计科2501", password: "boss-pass-1", confirm: "boss-pass-1", invite: "first-admin-secret" },
      });
      adminToken = r.data.token;
    }
    return call(method, path, { body, token: adminToken });
  }
  async function invite(kind: "campus" | "external" = "campus") {
    return (await admin("POST", "/api/admin/invites", { count: 1, kind })).data.codes[0] as string;
  }
  const pw = { password: "pass-2026-x", confirm: "pass-2026-x" };
  return { call, admin, invite, pw };
}

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("注册必填班级", () => {
  test("校内不填班级注册不了；校外不需要班级", async () => {
    const { call, invite, pw } = setup();
    const code = await invite();
    const r = await call("POST", "/api/auth/register", { body: { studentNo: "250101001", name: "林同学", invite: code, ...pw } });
    expect(r.status).toBe(400);
    expect(r.data.error).toContain("班级");
    const ok = await call("POST", "/api/auth/register", { body: { studentNo: "250101001", name: "林同学", className: "计科2501", invite: code, ...pw } });
    expect(ok.status).toBe(200);
    expect(ok.data.member.className).toBe("计科2501");

    const ext = await call("POST", "/api/auth/register", { body: { kind: "external", username: "alice", name: "爱丽丝", invite: await invite("external"), ...pw } });
    expect(ext.status).toBe(200);
  });

  test("自己补填班级；校外账号不行", async () => {
    const { call, invite, pw } = setup();
    const lin = await call("POST", "/api/auth/register", { body: { studentNo: "250101001", name: "林同学", className: "计科2501", invite: await invite(), ...pw } });
    const r = await call("PUT", "/api/me/class", { body: { className: " 软工2502 " }, token: lin.data.token });
    expect(r.data).toEqual({ className: "软工2502" });
    expect((await call("GET", "/api/auth/me", { token: lin.data.token })).data.member.className).toBe("软工2502");
    expect((await call("PUT", "/api/me/class", { body: { className: "" }, token: lin.data.token })).status).toBe(400);
    expect((await call("PUT", "/api/me/class", { body: { className: "x" } })).status).toBe(401);

    const ext = await call("POST", "/api/auth/register", { body: { kind: "external", username: "alice", name: "爱丽丝", invite: await invite("external"), ...pw } });
    expect((await call("PUT", "/api/me/class", { body: { className: "x" }, token: ext.data.token })).status).toBe(400);
  });
});

describe("管理员修改成员信息", () => {
  test("校内：改姓名、班级、学号；学号重复和格式不对会拒绝；改完用新学号登录", async () => {
    const { call, admin, invite, pw } = setup();
    const lin = await call("POST", "/api/auth/register", { body: { studentNo: "250101001", name: "林同学", className: "计科2501", invite: await invite(), ...pw } });
    const id = lin.data.member.id as string;
    const r = await admin("PUT", `/api/admin/members/${id}`, { name: "林小同", className: "", studentNo: "250101009" });
    expect(r.status).toBe(200);
    expect(r.data).toMatchObject({ name: "林小同", className: null, studentNo: "250101009" });
    expect((await call("POST", "/api/auth/member", { body: { studentNo: "250101009", password: "pass-2026-x" } })).status).toBe(200);
    // 改学号不让已登录的设备掉线
    expect((await call("GET", "/api/heatmap", { token: lin.data.token })).status).toBe(200);

    expect((await admin("PUT", `/api/admin/members/${id}`, { studentNo: "254030411" })).status).toBe(409);
    expect((await admin("PUT", `/api/admin/members/${id}`, { studentNo: "123" })).status).toBe(400);
    expect((await admin("PUT", `/api/admin/members/${id}`, { name: " " })).status).toBe(400);
    expect((await admin("PUT", `/api/admin/members/${id}`, { username: "lin" })).status).toBe(400);
    expect((await admin("PUT", `/api/admin/members/nobody`, { name: "x" })).status).toBe(404);
  });

  test("校外：改昵称、用户名、邮箱、单位；不能给校外账号填班级", async () => {
    const { call, admin, invite, pw } = setup();
    const ext = await call("POST", "/api/auth/register", { body: { kind: "external", username: "alice", name: "爱丽丝", invite: await invite("external"), ...pw } });
    const id = ext.data.member.id as string;
    const r = await admin("PUT", `/api/admin/members/${id}`, { name: "小爱", username: "Alice2", email: "A@x.com", org: "某大学" });
    expect(r.status).toBe(200);
    expect(r.data).toMatchObject({ name: "小爱", username: "alice2", email: "a@x.com", org: "某大学" });
    expect((await admin("PUT", `/api/admin/members/${id}`, { email: "not-mail" })).status).toBe(400);
    expect((await admin("PUT", `/api/admin/members/${id}`, { className: "计科" })).status).toBe(400);
    expect((await admin("PUT", `/api/admin/members/${id}`, { email: "" })).data.email).toBeNull();
  });

  test("非管理员不能改", async () => {
    const { call, invite, pw } = setup();
    const lin = await call("POST", "/api/auth/register", { body: { studentNo: "250101001", name: "林同学", className: "计科2501", invite: await invite(), ...pw } });
    expect((await call("PUT", `/api/admin/members/${lin.data.member.id}`, { body: { name: "x" }, token: lin.data.token })).status).toBe(403);
    expect((await call("PUT", `/api/admin/members/${lin.data.member.id}`, { body: { name: "x" } })).status).toBe(401);
  });
});

describe("安装包从本站转发", () => {
  test("没填下载地址时，版本接口给本站的转发地址；转发只认白名单里的文件名", async () => {
    const { call, admin } = setup();
    expect((await call("GET", "/api/app/version?scheme=0")).data.apkUrl).toBeNull();
    expect((await call("GET", "/api/app/apk")).status).toBe(404);
    await admin("PUT", "/api/admin/settings", { app_latest_version: "0.4.1" });
    expect((await call("GET", "/api/app/version?scheme=0")).data.apkUrl).toBe("http://localhost/api/app/apk?v=0.4.1");

    const asked: string[] = [];
    globalThis.fetch = (async (url: string) => {
      asked.push(String(url));
      return String(url).endsWith("/app-release.apk") ? new Response("APK!", { headers: { "content-length": "4" } }) : new Response("no", { status: 404 });
    }) as unknown as typeof fetch;
    const r = await call("GET", "/api/app/apk?v=0.4.1");
    expect(r.status).toBe(200);
    expect(r.data).toBe("APK!");
    expect(r.headers.get("content-type")).toBe("application/vnd.android.package-archive");
    expect(r.headers.get("content-disposition")).toContain("hiana-0.4.1.apk");
    expect(asked[0]).toBe("https://github.com/SSSSSmilewei/HIANA-Association/releases/download/app-v0.4.1/app-release.apk");

    expect((await call("GET", "/api/app/apk?v=0.4.1&abi=x86_64")).status).toBe(404);

    // 旧版本没有通用包：退回 arm64-v8a
    globalThis.fetch = (async (url: string) =>
      String(url).endsWith("/app-arm64-v8a-release.apk") ? new Response("ARM") : new Response("no", { status: 404 })) as unknown as typeof fetch;
    const old = await call("GET", "/api/app/apk?v=0.4.0");
    expect(old.data).toBe("ARM");
    expect(old.headers.get("content-disposition")).toContain("hiana-0.4.0-arm64-v8a.apk");
    expect((await call("GET", "/api/app/apk?abi=../../evil")).status).toBe(400);
    expect((await call("GET", "/api/app/apk?v=../x")).status).toBe(404);
  });
});

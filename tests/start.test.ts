import { describe, expect, test } from "bun:test";
import { memoryD1 } from "../scripts/local-d1";
import type { Env } from "../src/worker/env";
import worker from "../src/worker/index";

/** 和 api.test.ts 一样：内存数据库 + 带 Cookie 调接口。ip 用来测防刷（从 applications.test.ts 抄来） */
function setup() {
  const env = {
    DB: memoryD1(),
    ASSETS: { fetch: async () => new Response("index") },
    SESSION_SECRET: "test-session-secret-0123456789abcdef",
    FIRST_ADMIN_CODE: "first-admin-secret",
  } as unknown as Env;
  const jars = new Map<string, string>();
  let ipSeq = 0;
  async function call(who: string, method: string, path: string, body?: unknown, ip?: string) {
    const headers: Record<string, string> = { "cf-connecting-ip": ip ?? `10.0.0.${++ipSeq % 250}` };
    if (jars.has(who)) headers.cookie = jars.get(who) as string;
    if (body !== undefined) headers["content-type"] = "application/json";
    const res = await worker.fetch(
      new Request(`http://localhost${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }),
      env,
    );
    const set = res.headers.get("set-cookie");
    if (set) jars.set(who, set.split(";")[0]);
    const bytes = new Uint8Array(await res.arrayBuffer());
    const text = new TextDecoder().decode(bytes);
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      /* CSV */
    }
    return { status: res.status, data: data as Record<string, any>, text, bytes, headers: res.headers };
  }
  /** 一个管理员 admin、一个普通成员 lin */
  async function accounts() {
    const reg = (who: string, body: Record<string, unknown>) => call(who, "POST", "/api/auth/register", { className: "计科2501", password: "pass-2026-x", confirm: "pass-2026-x", ...body });
    expect((await reg("admin", { studentNo: "254030411", name: "会长", invite: "first-admin-secret" })).status).toBe(200);
    const inv = await call("admin", "POST", "/api/admin/invites", { count: 1 });
    expect((await reg("lin", { studentNo: "250101001", name: "林同学", invite: inv.data.codes[0] })).status).toBe(200);
  }
  return { env, call, accounts };
}

describe("新生任务：CS50 证书", () => {
  test("交证书 → 管理员看到 → 退回 → 重交 → 通过；通过后不能再改", async () => {
    const { call, accounts } = setup();
    await accounts();
    expect((await call("guest", "GET", "/api/start")).status).toBe(401);
    expect((await call("lin", "GET", "/api/start")).data.certificates).toEqual([]);

    expect((await call("lin", "PUT", "/api/start/certificates/cs50x", { url: "not a url" })).status).toBe(400);
    expect((await call("lin", "PUT", "/api/start/certificates/cs61a", { url: "https://x.example/c" })).status).toBe(404);
    const put = await call("lin", "PUT", "/api/start/certificates/cs50x", { url: "https://certificates.cs50.io/abc.pdf" });
    expect(put.status).toBe(200);
    expect(put.data.certificate.status).toBe("pending");

    expect((await call("lin", "GET", "/api/admin/certificates")).status).toBe(403);
    const list = await call("admin", "GET", "/api/admin/certificates");
    expect(list.data).toHaveLength(1);
    expect(list.data[0]).toMatchObject({ name: "林同学", studentNo: "250101001", status: "pending" });
    const uid = list.data[0].userId;

    expect((await call("admin", "PUT", `/api/admin/certificates/cs50x/${uid}`, { status: "rejected", note: "打不开" })).status).toBe(200);
    expect((await call("lin", "GET", "/api/start")).data.certificates[0]).toMatchObject({ status: "rejected", note: "打不开" });

    await call("lin", "PUT", "/api/start/certificates/cs50x", { url: "https://certificates.cs50.io/def.pdf" });
    expect((await call("lin", "GET", "/api/start")).data.certificates[0]).toMatchObject({ status: "pending", note: null, url: "https://certificates.cs50.io/def.pdf" });

    expect((await call("admin", "PUT", `/api/admin/certificates/cs50x/${uid}`, { status: "approved" })).status).toBe(200);
    expect((await call("lin", "GET", "/api/start")).data.certificates[0].status).toBe("approved");
    expect((await call("lin", "PUT", "/api/start/certificates/cs50x", { url: "https://x.example/other" })).status).toBe(409);
    expect((await call("admin", "PUT", "/api/admin/certificates/cs50x/nobody", { status: "approved" })).status).toBe(404);
  });

  test("Across the Deep Sea 是站内课，前言能标记完成", async () => {
    const { call, accounts } = setup();
    await accounts();
    const c = await call("lin", "GET", "/api/courses/across-the-deep-sea");
    expect(c.status).toBe(200);
    expect((await call("lin", "PUT", "/api/courses/across-the-deep-sea/items/preface", { done: true })).status).toBe(200);
    expect((await call("lin", "GET", "/api/courses/across-the-deep-sea")).data.done.preface).toBeGreaterThan(0);
  });
});

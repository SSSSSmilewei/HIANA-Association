import { describe, expect, test } from "bun:test";
import { memoryD1 } from "../scripts/local-d1";
import type { Env } from "../src/worker/env";
import worker from "../src/worker/index";

/** 和 api.test.ts 一样：内存数据库 + 带 Cookie 调接口。ip 用来测防刷 */
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
    const reg = (who: string, body: Record<string, unknown>) => call(who, "POST", "/api/auth/register", { password: "pass-2026-x", confirm: "pass-2026-x", ...body });
    expect((await reg("admin", { studentNo: "254030411", name: "会长", invite: "first-admin-secret" })).status).toBe(200);
    const inv = await call("admin", "POST", "/api/admin/invites", { count: 1 });
    expect((await reg("lin", { studentNo: "250101001", name: "林同学", invite: inv.data.codes[0] })).status).toBe(200);
  }
  return { env, call, accounts };
}

const FORM = {
  name: "小海",
  className: "计科2601",
  studentId: "260101001",
  phone: "13812345678",
  qq: "123456789",
  fresh: true,
  q1: "想学算法，也想做项目。",
  q2: "会一点 Python",
  q3: "",
  q4: "",
  q5: "",
};

describe("新生报名", () => {
  test("合法提交入库，返回里不带任何报名内容", async () => {
    const { env, call, accounts } = setup();
    await accounts();
    expect((await call("guest", "GET", "/api/applications/status")).data).toEqual({ open: true });
    const r = await call("guest", "POST", "/api/applications", { ...FORM, name: "  小海  " });
    expect(r.status).toBe(200);
    expect(r.data).toEqual({ ok: true, updated: false });

    const row = await env.DB.prepare("SELECT * FROM applications").first<Record<string, unknown>>();
    expect(row).toMatchObject({ name: "小海", class_name: "计科2601", student_id: "260101001", phone: "13812345678", qq: "123456789", status: "new", submit_count: 1, q3: null });

    // 管理员收到微信通知（进 outbox），里面没有手机号和 QQ
    const note = await env.DB.prepare("SELECT title, body FROM outbox WHERE kind = 'application'").first<{ title: string; body: string }>();
    expect(note?.title).toBe("新的报名：小海 · 计科2601");
    expect(note?.body).toBe(FORM.q1);
    expect(JSON.stringify(note)).not.toContain("13812345678");
    expect(JSON.stringify(note)).not.toContain("123456789");

    // 公开接口的返回里绝不出现报名信息
    for (const who of ["guest", "lin"]) {
      const s = await call(who, "GET", "/api/applications/status");
      for (const secret of ["小海", "260101001", "13812345678", "123456789"]) expect(s.text).not.toContain(secret);
    }
    const again = await call("other", "POST", "/api/applications", { ...FORM, name: "别人", phone: "13900000000" });
    for (const secret of ["小海", "13812345678", "123456789"]) expect(again.text).not.toContain(secret);
  });

  test("每条校验规则都会拒绝", async () => {
    const { env, call } = setup();
    const bad: [Record<string, unknown>, string][] = [
      [{ name: "" }, "名字"],
      [{ name: "   " }, "名字"],
      [{ name: "名".repeat(21) }, "20"],
      [{ className: "" }, "班级"],
      [{ className: "班".repeat(31) }, "30"],
      [{ studentId: "12345" }, "学号"],
      [{ studentId: "1234567890123456" }, "学号"],
      [{ studentId: "26010100a" }, "学号"],
      [{ phone: "23812345678" }, "手机号"],
      [{ phone: "1381234567" }, "手机号"],
      [{ phone: "138123456789" }, "手机号"],
      [{ qq: "1234" }, "QQ"],
      [{ qq: "123456789012" }, "QQ"],
      [{ qq: "12345a" }, "QQ"],
      [{ fresh: false }, "新生"],
      [{ fresh: "true" }, "新生"],
      [{ fresh: undefined }, "新生"],
      [{ q1: "" }, "第 1 题"],
      [{ q1: "  " }, "第 1 题"],
      [{ q1: "字".repeat(2001) }, "2000"],
      [{ q2: "字".repeat(2001) }, "2000"],
      [{ q5: "字".repeat(2001) }, "2000"],
    ];
    for (const [patch, msg] of bad) {
      const r = await call("guest", "POST", "/api/applications", { ...FORM, ...patch });
      expect(r.status).toBe(400);
      expect(r.data.error).toContain(msg);
    }
    expect((await call("guest", "POST", "/api/applications", "not json")).status).toBe(400);
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM applications").first<{ n: number }>();
    expect(n?.n).toBe(0);
    // 边界值能过
    const ok = await call("guest", "POST", "/api/applications", { ...FORM, name: "名".repeat(20), className: "班".repeat(30), studentId: "123456", qq: "12345", q1: "字".repeat(2000) });
    expect(ok.status).toBe(200);
  });

  test("同一学号覆盖上一次，submit_count 加 1，未通过改回新报名", async () => {
    const { env, call, accounts } = setup();
    await accounts();
    await call("guest", "POST", "/api/applications", FORM);
    const id = (await env.DB.prepare("SELECT id FROM applications").first<{ id: string }>())?.id as string;
    expect((await call("admin", "PATCH", `/api/admin/applications/${id}`, { status: "rejected" })).status).toBe(200);

    const r = await call("guest", "POST", "/api/applications", { ...FORM, phone: "13900000000", q1: "改主意了" });
    expect(r.data).toEqual({ ok: true, updated: true });
    const row = await env.DB.prepare("SELECT * FROM applications").first<Record<string, unknown>>();
    expect(row).toMatchObject({ id, phone: "13900000000", q1: "改主意了", submit_count: 2, status: "new" });
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM applications").first<{ n: number }>())?.n).toBe(1);
    // 覆盖不再发通知
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM outbox WHERE kind = 'application'").first<{ n: number }>())?.n).toBe(1);

    // 已联系的再交一次，状态不变
    await call("admin", "PATCH", `/api/admin/applications/${id}`, { status: "contacted" });
    await call("guest", "POST", "/api/applications", FORM);
    expect(await env.DB.prepare("SELECT status, submit_count FROM applications").first()).toEqual({ status: "contacted", submit_count: 3 });
  });

  test("招新关闭时返回 403 和提示语", async () => {
    const { env, call, accounts } = setup();
    await accounts();
    expect((await call("admin", "PUT", "/api/admin/applications/settings", { open: false })).data).toEqual({ open: false, message: "本轮招新已结束" });
    expect((await call("guest", "GET", "/api/applications/status")).data).toEqual({ open: false, message: "本轮招新已结束" });
    const r = await call("guest", "POST", "/api/applications", FORM);
    expect(r.status).toBe(403);
    expect(r.data.error).toBe("本轮招新已结束");

    await call("admin", "PUT", "/api/admin/applications/settings", { open: false, message: "明年九月再见" });
    expect((await call("guest", "POST", "/api/applications", FORM)).data.error).toBe("明年九月再见");
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM applications").first<{ n: number }>())?.n).toBe(0);

    await call("admin", "PUT", "/api/admin/applications/settings", { open: true });
    expect((await call("guest", "GET", "/api/applications/status")).data).toEqual({ open: true });
    expect((await call("guest", "POST", "/api/applications", FORM)).status).toBe(200);
  });

  test("防刷：蜜罐假装成功；每个 IP 每小时最多 10 次", async () => {
    const { env, call } = setup();
    const bot = await call("bot", "POST", "/api/applications", { ...FORM, website: "http://spam" }, "1.1.1.1");
    expect(bot.data).toEqual({ ok: true, updated: false });
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM applications").first<{ n: number }>())?.n).toBe(0);

    for (let i = 0; i < 9; i++) expect((await call("x", "POST", "/api/applications", FORM, "1.1.1.1")).status).toBe(200);
    expect((await call("x", "POST", "/api/applications", FORM, "1.1.1.1")).status).toBe(429);
    // 别的 IP 不受影响
    expect((await call("y", "POST", "/api/applications", FORM, "2.2.2.2")).status).toBe(200);
  });

  test("游客和非管理员访问每个管理接口都被拒绝", async () => {
    const { env, call, accounts } = setup();
    await accounts();
    await call("guest", "POST", "/api/applications", FORM);
    const id = (await env.DB.prepare("SELECT id FROM applications").first<{ id: string }>())?.id as string;
    const routes: [string, string, unknown?][] = [
      ["GET", "/api/admin/applications"],
      ["GET", "/api/admin/applications?status=new&q=小海"],
      ["GET", `/api/admin/applications/${id}`],
      ["PATCH", `/api/admin/applications/${id}`, { status: "accepted" }],
      ["DELETE", `/api/admin/applications/${id}`],
      ["GET", "/api/admin/applications.csv"],
      ["PUT", "/api/admin/applications/settings", { open: false }],
    ];
    for (const [method, path, body] of routes) {
      const g = await call("guest", method, path, body);
      expect(g.status).toBe(401);
      const m = await call("lin", method, path, body);
      expect(m.status).toBe(403);
      for (const secret of ["小海", "13812345678", "123456789"]) {
        expect(g.text).not.toContain(secret);
        expect(m.text).not.toContain(secret);
      }
    }
    expect(await env.DB.prepare("SELECT status FROM applications").first()).toEqual({ status: "new" });
    expect((await call("guest", "GET", "/api/applications/status")).data.open).toBe(true);
  });

  test("管理员：列表、搜索、详情、改状态和备注、删除、导出 CSV", async () => {
    const { call, accounts } = setup();
    await accounts();
    await call("g1", "POST", "/api/applications", FORM);
    await call("g2", "POST", "/api/applications", { ...FORM, name: "小纳", className: "软工2602", studentId: "260202002", q1: "=1+1 想试试" });

    const all = await call("admin", "GET", "/api/admin/applications");
    expect(all.data.items.map((i: { name: string }) => i.name)).toEqual(["小纳", "小海"]);
    expect(all.data.counts).toMatchObject({ all: 2, new: 2, contacted: 0 });
    expect(all.data.items[0].phone).toBeUndefined();
    expect((await call("admin", "GET", `/api/admin/applications?q=${encodeURIComponent("软工")}`)).data.items).toHaveLength(1);
    expect((await call("admin", "GET", "/api/admin/applications?q=260101")).data.items[0].name).toBe("小海");
    expect((await call("admin", "GET", "/api/admin/applications?q=%25")).data.items).toHaveLength(0);

    const id = all.data.items[1].id as string;
    const d = await call("admin", "GET", `/api/admin/applications/${id}`);
    expect(d.data).toMatchObject({ name: "小海", phone: "13812345678", qq: "123456789", answers: [FORM.q1, FORM.q2, null, null, null], adminNote: null });
    expect((await call("admin", "GET", "/api/admin/applications/nope")).status).toBe(404);

    expect((await call("admin", "PATCH", `/api/admin/applications/${id}`, { status: "maybe" })).status).toBe(400);
    const p = await call("admin", "PATCH", `/api/admin/applications/${id}`, { status: "interview", adminNote: "周三面试" });
    expect(p.data).toMatchObject({ status: "interview", adminNote: "周三面试", handledBy: "会长" });
    expect(p.data.handledAt).toBeGreaterThan(0);
    expect((await call("admin", "GET", "/api/admin/applications?status=interview")).data.items).toHaveLength(1);
    expect((await call("admin", "GET", "/api/admin/applications")).data.counts).toMatchObject({ all: 2, new: 1, interview: 1 });

    const csv = await call("admin", "GET", "/api/admin/applications.csv");
    expect(csv.headers.get("content-type")).toContain("text/csv");
    // UTF-8 BOM：EF BB BF（TextDecoder 会把它吃掉，所以看原始字节）
    expect([...csv.bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(csv.text).toContain("13812345678");
    expect(csv.text).toContain("周三面试");
    expect(csv.text).toContain("待面试");
    expect(csv.text).toContain("'=1+1 想试试");

    expect((await call("admin", "DELETE", `/api/admin/applications/${id}`)).status).toBe(200);
    expect((await call("admin", "DELETE", `/api/admin/applications/${id}`)).status).toBe(404);
    expect((await call("admin", "GET", "/api/admin/applications")).data.counts.all).toBe(1);
  });
});

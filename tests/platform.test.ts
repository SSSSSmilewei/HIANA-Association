import { beforeEach, describe, expect, test } from "bun:test";
import { memoryD1 } from "../scripts/local-d1";
import { recordActivity, recordActivityOnce, siteDaily } from "../src/worker/activity";
import { checkIn, checkinsCsv, cnClock, dailyCode, inWindow, listCheckins, parseWindow } from "../src/worker/checkin";
import { MIGRATIONS } from "../src/worker/db";
import { type Fetch, bbdc, bbdcDate, duolingo, maimemo } from "../src/worker/heatmap/providers";
import { bindSource, listBindings, loadSeries, syncEveryone, syncUser, unbindSource } from "../src/worker/heatmap/store";
import { openSecret, sealSecret } from "../src/worker/secret-box";

const SECRET = "test-session-secret-0123456789abcdef";
const at = (iso: string) => Date.parse(iso);

async function freshDb() {
  const db = memoryD1();
  for (const group of MIGRATIONS) for (const sql of group) await db.prepare(sql).run();
  const now = at("2026-10-01T00:00:00+08:00");
  await db.batch([
    db.prepare("INSERT INTO users (id, student_no, name, class_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").bind("u1", "2025010101", "林同学", "计科2501", now, now),
    db.prepare("INSERT INTO users (id, student_no, name, class_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").bind("u2", "2025010102", "陈同学", "计科2501", now, now),
  ]);
  return db;
}

function fakeFetch(handler: (url: string, init?: RequestInit) => unknown, status = 200): Fetch & { calls: { url: string; auth?: string }[] } {
  const calls: { url: string; auth?: string }[] = [];
  const f = (async (url: string, init?: RequestInit) => {
    calls.push({ url, auth: (init?.headers as Record<string, string> | undefined)?.authorization });
    const payload = handler(url, init);
    return new Response(typeof payload === "string" ? payload : JSON.stringify(payload), { status });
  }) as Fetch & { calls: typeof calls };
  f.calls = calls;
  return f;
}

describe("令牌加密", () => {
  test("加密后能解开，换了密钥解不开", async () => {
    const sealed = await sealSecret(SECRET, "mm-token-abc");
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(sealed).not.toContain("mm-token-abc");
    expect(await openSecret(SECRET, sealed)).toBe("mm-token-abc");
    expect(await openSecret(`${SECRET}-other`, sealed)).toBeNull();
    expect(await openSecret(SECRET, "garbage")).toBeNull();
  });
  test("同一个令牌两次加密结果不同（随机 IV）", async () => {
    expect(await sealSecret(SECRET, "x")).not.toBe(await sealSecret(SECRET, "x"));
  });
});

describe("晚自习打卡", () => {
  let db: D1Database;
  beforeEach(async () => {
    db = await freshDb();
  });
  const rule = { window: "18:30-22:30", requireCode: false };

  test("时间段解析", () => {
    expect(parseWindow("18:30-22:30")).toEqual(["18:30", "22:30"]);
    expect(parseWindow("22:30-18:30")).toBeNull();
    expect(parseWindow("25:00-26:00")).toBeNull();
    expect(cnClock(at("2026-10-21T11:05:00Z"))).toBe("19:05");
    expect(inWindow("18:30-22:30", at("2026-10-21T19:00:00+08:00"))).toBe(true);
    expect(inWindow("18:30-22:30", at("2026-10-21T23:00:00+08:00"))).toBe(false);
  });

  test("每晚只记一次，第二次返回已打卡", async () => {
    const t = at("2026-10-21T19:10:00+08:00");
    const first = await checkIn(db, { userId: "u1", rule, secret: SECRET, now: t });
    expect(first).toEqual({ ok: true, day: "2026-10-21", at: t });
    const second = await checkIn(db, { userId: "u1", rule, secret: SECRET, now: t + 60_000 });
    expect(second).toEqual({ ok: false, reason: "already", day: "2026-10-21", at: t });
  });

  test("不在晚自习时间段不能打卡", async () => {
    const r = await checkIn(db, { userId: "u1", rule, secret: SECRET, now: at("2026-10-21T15:00:00+08:00") });
    expect(r).toEqual({ ok: false, reason: "closed", window: "18:30-22:30" });
  });

  test("开启现场口令后要输对", async () => {
    const t = at("2026-10-21T19:10:00+08:00");
    const strict = { ...rule, requireCode: true };
    expect((await checkIn(db, { userId: "u1", rule: strict, secret: SECRET, code: "0000x", now: t })).ok).toBe(false);
    const code = await dailyCode(SECRET, "2026-10-21");
    expect(code).toMatch(/^\d{4}$/);
    expect(await dailyCode(SECRET, "2026-10-21")).toBe(code); // 同一天口令固定
    expect((await checkIn(db, { userId: "u1", rule: strict, secret: SECRET, code, now: t })).ok).toBe(true);
  });

  test("打卡同时记一条学习记录", async () => {
    await checkIn(db, { userId: "u1", rule, secret: SECRET, now: at("2026-10-21T19:10:00+08:00") });
    expect(await siteDaily(db, "u1", "2026-10-01")).toEqual({ "2026-10-21": 1 });
  });

  test("导出给学校的表格", async () => {
    await checkIn(db, { userId: "u2", rule, secret: SECRET, now: at("2026-10-21T19:20:00+08:00") });
    await checkIn(db, { userId: "u1", rule, secret: SECRET, now: at("2026-10-21T19:10:00+08:00") });
    await checkIn(db, { userId: "u1", rule, secret: SECRET, now: at("2026-10-22T20:00:00+08:00") });
    const rows = await listCheckins(db, "2026-10-21", "2026-10-21");
    expect(rows.map((r) => r.name)).toEqual(["林同学", "陈同学"]); // 按学号排序
    const csv = checkinsCsv(rows);
    expect(csv.startsWith("﻿学号,姓名,班级,日期,打卡时间\r\n")).toBe(true);
    expect(csv).toContain("2025010101,林同学,计科2501,2026-10-21,19:10");
  });

  test("表格防公式注入", () => {
    const csv = checkinsCsv([{ student_no: "1", name: "=HYPERLINK(1)", class_name: null, day: "2026-10-21", at: at("2026-10-21T19:00:00+08:00") }]);
    expect(csv).toContain("'=HYPERLINK(1)");
  });
});

describe("站内学习记录", () => {
  test("同一课时一天只记一次", async () => {
    const db = await freshDb();
    const t = at("2026-10-21T20:00:00+08:00");
    expect(await recordActivityOnce(db, "u1", "lesson", "cs50x/week0", t)).toBe(true);
    expect(await recordActivityOnce(db, "u1", "lesson", "cs50x/week0", t + 1000)).toBe(false);
    await recordActivity(db, "u1", "ask", "t1", t);
    expect(await siteDaily(db, "u1", "2026-10-01")).toEqual({ "2026-10-21": 2 });
  });
});

describe("英语平台", () => {
  const now = at("2026-10-21T23:30:00+08:00");
  const base = { fetch: fakeFetch(() => ({})), sinceSeconds: 0, secrets: {}, now };

  test("不背单词：补年份，跨年时 12 月是去年", () => {
    expect(bbdcDate("今日", "2026-10-21")).toBe("2026-10-21");
    expect(bbdcDate("10-20", "2026-10-21")).toBe("2026-10-20");
    expect(bbdcDate("12-31", "2027-01-02")).toBe("2026-12-31");
    expect(bbdcDate("1-2", "2027-01-02")).toBe("2027-01-02");
    expect(bbdcDate("昨天", "2027-01-02")).toBeNull();
  });

  test("不背单词：学习 + 复习单词数", async () => {
    const f = fakeFetch(() => ({
      result_code: 200,
      data_body: { learnList: [{ date: "10-20", learnNum: 20, reviewNum: 35 }, { date: "今日", learnNum: 10, reviewNum: 0 }, { date: "10-19", learnNum: 0, reviewNum: 0 }] },
    }));
    expect(await bbdc.fetchDaily("123456", { ...base, fetch: f })).toEqual({ "2026-10-20": 55, "2026-10-21": 10 });
    expect(f.calls[0].url).toContain("userId=123456");
  });

  test("墨墨：没有令牌直接报错，有令牌按今天记", async () => {
    await expect(maimemo.fetchDaily("林", base)).rejects.toThrow("令牌");
    const f = fakeFetch(() => ({ success: true, data: { progress: { finished: 120, total: 150, study_time: 1_800_000 } } }));
    expect(await maimemo.fetchDaily("林", { ...base, fetch: f, userSecret: "tok" })).toEqual({ "2026-10-21": 120 });
    expect(f.calls[0].auth).toBe("Bearer tok");
  });

  test("墨墨：令牌失效给出能操作的提示", async () => {
    const f = fakeFetch(() => ({ success: false }), 401);
    await expect(maimemo.fetchDaily("林", { ...base, fetch: f, userSecret: "bad" })).rejects.toThrow("重新复制");
  });

  test("多邻国：先查用户 id，再取每日 XP", async () => {
    const day = at("2026-10-21T00:00:00+08:00") / 1000;
    const f = fakeFetch((url) => (url.includes("username=") ? { users: [{ id: 42 }] } : { summaries: [{ date: day, gainedXp: 30 }, { date: day - 86400, gainedXp: null }] }));
    expect(await duolingo.fetchDaily("lin", { ...base, fetch: f })).toEqual({ "2026-10-21": 30 });
    expect(f.calls[1].url).toContain("/users/42/xp_summaries");
  });
});

describe("绑定、同步、读取", () => {
  test("墨墨这种只给当天的平台，每天同步一次攒出历史", async () => {
    const db = await freshDb();
    await bindSource(db, SECRET, { userId: "u1", source: "maimemo", handle: "林", secret: "tok" });
    const stored = await db.prepare("SELECT secret_enc FROM bindings").first<{ secret_enc: string }>();
    expect(stored?.secret_enc).not.toContain("tok");
    let finished = 80;
    const f = fakeFetch(() => ({ success: true, data: { progress: { finished } } }));
    const env = { SESSION_SECRET: SECRET };
    await syncUser(db, env, "u1", f, at("2026-10-20T23:30:00+08:00"));
    finished = 120;
    await syncUser(db, env, "u1", f, at("2026-10-21T23:30:00+08:00"));
    expect(f.calls.every((c) => c.auth === "Bearer tok")).toBe(true);
    const series = await loadSeries(db, "u1", "2026-10-21");
    expect(series.map((s) => s.source)).toEqual(["site", "maimemo"]);
    expect(series[1].days).toEqual({ "2026-10-20": 80, "2026-10-21": 120 });
  });

  test("同步失败记在绑定上，旧数据保留", async () => {
    const db = await freshDb();
    await bindSource(db, SECRET, { userId: "u1", source: "bbdc", handle: "123" });
    const env = { SESSION_SECRET: SECRET };
    await syncUser(db, env, "u1", fakeFetch(() => ({ result_code: 200, data_body: { learnList: [{ date: "今日", learnNum: 5 }] } })), at("2026-10-20T23:30:00+08:00"));
    await syncUser(db, env, "u1", fakeFetch(() => ({ result_code: 500 })), at("2026-10-21T23:30:00+08:00"));
    const [b] = await listBindings(db, "u1");
    expect(b.lastError).toContain("找不到");
    const series = await loadSeries(db, "u1", "2026-10-21");
    expect(series[1].days).toEqual({ "2026-10-20": 5 });
    expect(series[1].error).toContain("找不到");
  });

  test("需要令牌的平台不填令牌不能绑定；待实测的平台不能绑定", async () => {
    const db = await freshDb();
    await expect(bindSource(db, SECRET, { userId: "u1", source: "maimemo", handle: "林" })).rejects.toThrow("需要令牌");
    await expect(bindSource(db, SECRET, { userId: "u1", source: "gitee", handle: "x" })).rejects.toThrow("暂不支持");
  });

  test("改用户名时不填令牌，保留原令牌", async () => {
    const db = await freshDb();
    await bindSource(db, SECRET, { userId: "u1", source: "maimemo", handle: "林", secret: "tok" });
    await bindSource(db, SECRET, { userId: "u1", source: "maimemo", handle: "小林" });
    const [b] = await listBindings(db, "u1");
    expect(b).toMatchObject({ handle: "小林", hasSecret: true });
  });

  test("解绑连历史一起删", async () => {
    const db = await freshDb();
    await bindSource(db, SECRET, { userId: "u1", source: "bbdc", handle: "123" });
    await syncUser(db, { SESSION_SECRET: SECRET }, "u1", fakeFetch(() => ({ result_code: 200, data_body: { learnList: [{ date: "今日", learnNum: 5 }] } })));
    await unbindSource(db, "u1", "bbdc");
    expect(await loadSeries(db, "u1")).toHaveLength(1);
    expect(await db.prepare("SELECT COUNT(*) AS n FROM external_daily").first<{ n: number }>()).toEqual({ n: 0 });
  });

  test("定时任务只同步在籍成员", async () => {
    const db = await freshDb();
    await bindSource(db, SECRET, { userId: "u1", source: "bbdc", handle: "1" });
    await bindSource(db, SECRET, { userId: "u2", source: "bbdc", handle: "2" });
    await db.prepare("UPDATE users SET status = 'archived' WHERE id = 'u2'").run();
    const f = fakeFetch(() => ({ result_code: 200, data_body: { learnList: [] } }));
    expect(await syncEveryone(db, { SESSION_SECRET: SECRET }, f)).toEqual({ users: 1, failures: 0 });
    expect(f.calls).toHaveLength(1);
  });
});

describe("成员管理", () => {
  test("解析从 Excel 粘贴的名单", async () => {
    const { parseRoster } = await import("../src/worker/members");
    const { rows, errors } = parseRoster("学号\t姓名\t班级\n2025010103\t王同学\t计科2502\n2025010104,赵同学\nabc 无名\n2025010103 王同学\n");
    expect(rows).toEqual([
      { studentNo: "2025010103", name: "王同学", className: "计科2502" },
      { studentNo: "2025010104", name: "赵同学", className: undefined },
    ]);
    expect(errors).toHaveLength(2);
  });

  test("导入、口令登录、重置、停用", async () => {
    const { importMembers, findByPasscode, resetPasscode, setMemberStatus } = await import("../src/worker/members");
    const db = await freshDb();
    const r = await importMembers(db, SECRET, [
      { studentNo: "2025010101", name: "林同学（改名）", className: "计科2501" }, // 已存在：只更新
      { studentNo: "2025010199", name: "新同学" },
    ]);
    expect(r.updated).toBe(1);
    expect(r.created).toHaveLength(1);
    const code = r.created[0].passcode;
    expect(code).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
    const me = await findByPasscode(db, SECRET, code.toUpperCase().replace(/-/g, " "));
    expect(me?.name).toBe("新同学");
    const fresh = await resetPasscode(db, SECRET, me!.id);
    expect(await findByPasscode(db, SECRET, code)).toBeNull();
    expect((await findByPasscode(db, SECRET, fresh!))?.id).toBe(me!.id);
    await setMemberStatus(db, me!.id, "archived");
    expect(await findByPasscode(db, SECRET, fresh!)).toBeNull();
  });

  test("最近没动静名单：站内和外部平台都算活动", async () => {
    const { listMembers, idleMembers } = await import("../src/worker/members");
    const db = await freshDb();
    await recordActivity(db, "u1", "lesson", "x", at("2026-10-20T20:00:00+08:00"));
    await db.prepare("INSERT INTO external_daily (user_id, source, day, count) VALUES ('u2', 'github', '2026-10-01', 3)").run();
    const members = await listMembers(db);
    expect(members.find((m) => m.id === "u1")?.lastActiveDay).toBe("2026-10-20");
    expect(idleMembers(members, 7, "2026-10-21").map((m) => m.name)).toEqual(["陈同学"]);
  });
});

import { beforeEach, describe, expect, test } from "bun:test";
import { memoryD1 } from "../scripts/local-d1";
import { recordActivity, recordActivityOnce, siteDaily, siteDailyByCategory } from "../src/worker/activity";
import { attendanceCsv, autoClose, cnClock, dailyCode, eveningState, listAttendance, parseDays, parseWindow, signIn, signOut } from "../src/worker/attendance";
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

describe("签到签退", () => {
  let db: D1Database;
  beforeEach(async () => {
    db = await freshDb();
  });
  // 2026-10-21 是周三；默认晚自习是周一、二、四 19:00–20:40
  const rule = { days: [1, 2, 4], window: ["19:00", "20:40"] as [string, string], earlyMinutes: 15, requireCode: false };
  const thu = (hhmm: string) => at(`2026-10-22T${hhmm}:00+08:00`);
  const base = { rule, secret: SECRET, photoKey: "attendance/x/1" };

  test("时间与日期解析", () => {
    expect(parseWindow("19:00-20:40")).toEqual(["19:00", "20:40"]);
    expect(parseWindow("22:30-18:30")).toBeNull();
    expect(parseDays("1,2,4")).toEqual([1, 2, 4]);
    expect(parseDays("0,8")).toBeNull();
    expect(cnClock(at("2026-10-21T11:05:00Z"))).toBe("19:05");
  });

  test("晚自习日的签到时间：提前 15 分钟开放，20:40 结束", () => {
    expect(eveningState(rule, thu("18:40")).open).toBe(false);
    expect(eveningState(rule, thu("18:45")).open).toBe(true);
    expect(eveningState(rule, thu("20:40")).open).toBe(true);
    expect(eveningState(rule, thu("20:41")).open).toBe(false);
    expect(eveningState(rule, at("2026-10-21T19:30:00+08:00")).isDay).toBe(false); // 周三
  });

  test("签到、签退各记一条，进热力图的签到分类", async () => {
    const r = await signIn(db, { ...base, userId: "u1", kind: "evening" }, thu("19:02"));
    expect(r.status).toBe("open");
    await expect(signIn(db, { ...base, userId: "u1", kind: "venue" }, thu("19:05"))).rejects.toThrow("已经在晚自习签到");
    const out = await signOut(db, { userId: "u1", rule, photoKey: "attendance/x/2" }, thu("20:30"));
    expect(out.status).toBe("closed");
    expect((await siteDailyByCategory(db, "u1", "2026-10-01")).attendance).toEqual({ "2026-10-22": 2 });
    await expect(signIn(db, { ...base, userId: "u1", kind: "evening" }, thu("20:35"))).rejects.toThrow("已经签到过了");
  });

  test("不是晚自习日或不在时段内，不能晚自习签到；场地签到任何时间都可以", async () => {
    await expect(signIn(db, { ...base, userId: "u1", kind: "evening" }, at("2026-10-21T19:30:00+08:00"))).rejects.toThrow("今天没有晚自习");
    await expect(signIn(db, { ...base, userId: "u1", kind: "evening" }, thu("15:00"))).rejects.toThrow("不在晚自习签到时间");
    expect((await signIn(db, { ...base, userId: "u1", kind: "venue" }, thu("15:00"))).kind).toBe("venue");
  });

  test("没照片不能签到", async () => {
    await expect(signIn(db, { ...base, photoKey: null, userId: "u1", kind: "venue" }, thu("15:00"))).rejects.toThrow("照片");
  });

  test("开启现场口令后，晚自习要输对", async () => {
    const strict = { ...rule, requireCode: true };
    const code = await dailyCode(SECRET, "2026-10-22");
    expect(code).toMatch(/^\d{4}$/);
    await expect(signIn(db, { ...base, rule: strict, code: "x", userId: "u1", kind: "evening" }, thu("19:10"))).rejects.toThrow("口令不对");
    expect((await signIn(db, { ...base, rule: strict, code, userId: "u1", kind: "evening" }, thu("19:10"))).status).toBe("open");
  });

  test("忘记签退：晚自习到 20:40、场地到 23:59 自动结束，记为未签退", async () => {
    await signIn(db, { ...base, userId: "u1", kind: "evening" }, thu("19:10"));
    await signIn(db, { ...base, userId: "u2", kind: "venue" }, thu("21:00"));
    expect(await autoClose(db, rule, thu("20:50"))).toBe(1);
    expect(await autoClose(db, rule, at("2026-10-23T00:01:00+08:00"))).toBe(1);
    const rows = await listAttendance(db, "2026-10-22", "2026-10-22");
    expect(rows.map((r) => [r.name, r.status, cnClock(r.out_at!)])).toEqual([
      ["林同学", "auto_closed", "20:40"],
      ["陈同学", "auto_closed", "23:59"],
    ]);
  });

  test("导出给学校的表格", async () => {
    await signIn(db, { ...base, userId: "u2", kind: "evening" }, thu("19:20"));
    await signIn(db, { ...base, userId: "u1", kind: "evening" }, thu("19:10"));
    await signOut(db, { userId: "u1", rule, photoKey: "p" }, thu("20:30"));
    const csv = attendanceCsv(await listAttendance(db, "2026-10-22", "2026-10-22", "evening"));
    expect(csv.startsWith("\uFEFF学号,姓名,班级,日期,场景,签到时间,签退时间,状态\r\n")).toBe(true);
    expect(csv).toContain("2025010101,林同学,计科2501,2026-10-22,晚自习,19:10,20:30,已签退");
    expect(csv).toContain("2025010102,陈同学,计科2501,2026-10-22,晚自习,19:20,,进行中");
  });

  test("表格防公式注入", () => {
    const csv = attendanceCsv([{ student_no: "1", name: "=HYPERLINK(1)", class_name: null, day: "2026-10-22", kind: "venue", in_at: thu("19:00"), out_at: null, status: "open" }]);
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
    expect(series.map((s) => s.source)).toEqual(["site:attendance", "site:reflection", "site:study", "maimemo"]);
    expect(series[3].days).toEqual({ "2026-10-20": 80, "2026-10-21": 120 });
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
    expect(series[3].days).toEqual({ "2026-10-20": 5 });
    expect(series[3].error).toContain("找不到");
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
    expect(await loadSeries(db, "u1")).toHaveLength(3);
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
  test("邀请码：同一个码同时注册两次只有一个成功；过期的码不能用", async () => {
    const { register } = await import("../src/worker/members");
    const { createInvites, listInvites } = await import("../src/worker/invites");
    const db = await freshDb();
    const t0 = at("2026-10-01T00:00:00+08:00");
    const { codes } = await createInvites(db, SECRET, { count: 1, days: 1, note: null, by: "u1" }, t0);
    const input = (no: string) => ({ studentNo: no, name: "新同学", password: "pass-2026-x", confirm: "pass-2026-x", invite: codes[0] });
    const results = await Promise.allSettled([register(db, SECRET, input("250101011"), { open: true }, t0), register(db, SECRET, input("250101012"), { open: true }, t0)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await db.prepare("SELECT COUNT(*) AS n FROM users WHERE student_no LIKE '25010101_'").first<{ n: number }>())?.n).toBe(1);

    const late = await createInvites(db, SECRET, { count: 1, days: 1, note: null, by: "u1" }, t0);
    const t2 = t0 + 2 * 86_400_000;
    await expect(register(db, SECRET, { ...input("250101013"), invite: late.codes[0] }, { open: true }, t2)).rejects.toThrow("过期");
    expect((await listInvites(db, t2)).map((x) => x.state).sort()).toEqual(["expired", "used"]);
  });

  test("之前导入、还没激活的账号：旧口令当重置码用；也可以用邀请码认领", async () => {
    const { register, resetWithCode, createResetCode, findByAccountAndPassword, setMemberStatus } = await import("../src/worker/members");
    const { hashPasscode } = await import("../src/worker/passcode");
    const { createInvites } = await import("../src/worker/invites");
    const db = await freshDb();
    // u1 拿着会长以前发的口令
    await db.prepare("UPDATE users SET passcode_hash = ? WHERE id = 'u1'").bind(await hashPasscode(SECRET, "abcd-efgh-jkmn")).run();
    const pw = { password: "pass-2026-x", confirm: "pass-2026-x" };
    await expect(resetWithCode(db, SECRET, { account: "2025010102", code: "abcd-efgh-jkmn", ...pw })).rejects.toThrow("重置码");
    const u1 = await resetWithCode(db, SECRET, { account: "2025010101", code: "ABCD EFGH JKMN", ...pw });
    expect(u1).toMatchObject({ id: "u1", name: "林同学", session_version: 1 });
    expect((await findByAccountAndPassword(db, "2025010101", "pass-2026-x"))?.id).toBe("u1");

    // 重置码：停用的账号不能用
    const code = (await createResetCode(db, SECRET, "u1")) as string;
    expect(await findByAccountAndPassword(db, "2025010101", "pass-2026-x")).toBeNull();
    await setMemberStatus(db, "u1", "archived");
    await expect(resetWithCode(db, SECRET, { account: "2025010101", code, ...pw })).rejects.toThrow();

    // 没有密码的旧账号（学号已经是 9 位）可以用邀请码认领，原来的 id 和记录保留
    await db.prepare("INSERT INTO users (id, student_no, name, created_at, updated_at) VALUES ('u3', '250101003', '王同学', 0, 0)").run();
    const { codes } = await createInvites(db, SECRET, { count: 1, days: null, note: null, by: "u2" });
    const claimed = await register(db, SECRET, { studentNo: "250101003", name: "王同学", invite: codes[0], ...pw }, { open: true });
    expect(claimed.id).toBe("u3");
  });

  test("首个管理员：要指定学号 + 密钥，且系统里还没有管理员", async () => {
    const { register } = await import("../src/worker/members");
    const db = await freshDb();
    const pw = { password: "boss-pass-1", confirm: "boss-pass-1" };
    const opts = { open: false, firstAdminCode: "first-admin-secret" };
    // 注册关闭时也能注册首个管理员
    const boss = await register(db, SECRET, { studentNo: "254030411", name: "会长", invite: "first-admin-secret", ...pw }, opts);
    expect(boss.role).toBe("admin");
    // 没配置密钥时，这条路不存在
    const db2 = await freshDb();
    await expect(register(db2, SECRET, { studentNo: "254030411", name: "会长", invite: "", ...pw }, { open: true })).rejects.toThrow("邀请码");
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

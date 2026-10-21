import { z } from "zod";
import { addDays, cnDate } from "../shared/heatmap";
import { DEFAULT_WINDOW, type CheckinRule, checkIn, checkinsCsv, dailyCode, listCheckins, parseWindow } from "./checkin";
import { getSetting, setSetting } from "./db";
import { PROVIDERS, ProviderError } from "./heatmap/providers";
import { bindSource, listBindings, loadSeries, syncUser, unbindSource } from "./heatmap/store";
import { type Ctx, HttpError, Router, json } from "./http";
import {
  PasswordError,
  findByPasscode,
  findByStudentNoAndPassword,
  idleMembers,
  importMembers,
  listMembers,
  parseRoster,
  resetPasscode,
  setMemberStatus,
  setOwnPassword,
} from "./members";
import { clearCookie, clientIp, recordFailure, requireSecret, safeEqual, sessionCookie, sha256Hex, tooManyFailures } from "./session";

/**
 * 网站的全部接口。成员用口令登录；会长用后台密码登录。
 * 所有路径都在 /api 下，前端是同域的单页应用。
 */

export const api = new Router();

function memberId(c: Ctx): string {
  if (c.session?.role !== "member") throw new HttpError(401, "请先用口令登录");
  return c.session.uid;
}

function requireAdmin(c: Ctx) {
  if (c.session?.role !== "admin") throw new HttpError(401, "请先登录会长后台");
}

async function checkinRule(db: D1Database): Promise<CheckinRule> {
  const [w, code] = await Promise.all([getSetting(db, "checkin_window"), getSetting(db, "checkin_code")]);
  return { window: w && parseWindow(w) ? w : DEFAULT_WINDOW, requireCode: code === "on" };
}

/* ---------- 登录 ---------- */

api.get("/api/auth/me", async (c) => {
  if (!c.session) return json({ role: null });
  if (c.session.role === "admin") return json({ role: "admin" });
  const row = await c.env.DB.prepare("SELECT id, student_no, name, class_name, password_hash IS NOT NULL AS has_pw FROM users WHERE id = ? AND status = 'active'")
    .bind(c.session.uid)
    .first<{ id: string; student_no: string; name: string; class_name: string | null; has_pw: number }>();
  if (!row) {
    c.cookies.push(clearCookie(c.req));
    return json({ role: null });
  }
  return json({
    role: "member",
    needsPassword: row.has_pw !== 1,
    member: { id: row.id, studentNo: row.student_no, name: row.name, className: row.class_name },
  });
});

/** 日常登录：学号 + 自己设的密码。 */
api.post("/api/auth/member", async (c) => {
  const { studentNo, password } = z.object({ studentNo: z.string().trim().min(1).max(20), password: z.string().min(1).max(64) }).parse(await c.body());
  const ip = clientIp(c.req);
  if (await tooManyFailures(c.env.DB, ip)) throw new HttpError(429, "试错太多次了，请 10 分钟后再试");
  const row = await findByStudentNoAndPassword(c.env.DB, studentNo, password);
  if (!row) {
    await recordFailure(c.env.DB, ip);
    throw new HttpError(401, "学号或密码不对。还没设过密码的话，请用会长发的口令激活账号");
  }
  c.cookies.push(await sessionCookie(c.env, c.req, { role: "member", uid: row.id }));
  return json({ role: "member", needsPassword: false, member: { id: row.id, studentNo: row.student_no, name: row.name } });
});

/** 第一次使用：用会长发的口令激活账号，之后马上设置密码。 */
api.post("/api/auth/activate", async (c) => {
  const { code } = z.object({ code: z.string().trim().min(4).max(40) }).parse(await c.body());
  const ip = clientIp(c.req);
  if (await tooManyFailures(c.env.DB, ip)) throw new HttpError(429, "试错太多次了，请 10 分钟后再试");
  const row = await findByPasscode(c.env.DB, requireSecret(c.env), code);
  if (!row) {
    await recordFailure(c.env.DB, ip);
    throw new HttpError(401, "口令不对或已经用过了。设过密码的同学请用学号和密码登录");
  }
  c.cookies.push(await sessionCookie(c.env, c.req, { role: "member", uid: row.id }));
  return json({ role: "member", needsPassword: true, member: { id: row.id, studentNo: row.student_no, name: row.name } });
});

/** 设置或修改密码：新密码输两次；已经有密码时要先输当前密码。 */
api.post("/api/auth/password", async (c) => {
  const uid = memberId(c);
  const input = z
    .object({ password: z.string().max(64), confirm: z.string().max(64), current: z.string().max(64).optional() })
    .parse(await c.body());
  try {
    await setOwnPassword(c.env.DB, { userId: uid, ...input });
  } catch (err) {
    if (err instanceof PasswordError) throw new HttpError(400, err.message);
    throw err;
  }
  return json({ ok: true });
});

api.post("/api/auth/admin", async (c) => {
  const { password } = z.object({ password: z.string().min(1).max(200) }).parse(await c.body());
  const secret = requireSecret(c.env);
  const fromEnv = c.env.ADMIN_PASSWORD?.trim();
  const storedHash = fromEnv ? null : await getSetting(c.env.DB, "admin_password_sha256");
  if (!fromEnv && !storedHash) throw new HttpError(500, "还没有设置 ADMIN_PASSWORD。", { config: true });
  const ip = clientIp(c.req);
  if (await tooManyFailures(c.env.DB, ip)) throw new HttpError(429, "试错太多次了，请 10 分钟后再试");
  const ok = fromEnv ? await safeEqual(secret, password, fromEnv) : await safeEqual(secret, await sha256Hex(password), (storedHash as string).toLowerCase());
  if (!ok) {
    await recordFailure(c.env.DB, ip);
    throw new HttpError(401, "密码不对");
  }
  c.cookies.push(await sessionCookie(c.env, c.req, { role: "admin" }));
  return json({ role: "admin" });
});

api.post("/api/auth/logout", (c) => {
  c.cookies.push(clearCookie(c.req));
  return json({ ok: true });
});

/* ---------- 晚自习打卡 ---------- */

api.get("/api/checkin", async (c) => {
  const uid = memberId(c);
  const rule = await checkinRule(c.env.DB);
  const today = cnDate(Date.now());
  const row = await c.env.DB.prepare("SELECT at FROM checkins WHERE user_id = ? AND day = ? AND session = 'evening'").bind(uid, today).first<{ at: number }>();
  const total = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM checkins WHERE user_id = ?").bind(uid).first<{ n: number }>();
  return json({ today, window: rule.window, requireCode: rule.requireCode, checkedAt: row?.at ?? null, total: total?.n ?? 0 });
});

api.post("/api/checkin", async (c) => {
  const uid = memberId(c);
  const { code } = z.object({ code: z.string().trim().max(8).optional() }).parse(await c.body());
  const r = await checkIn(c.env.DB, { userId: uid, rule: await checkinRule(c.env.DB), secret: requireSecret(c.env), code, ip: clientIp(c.req) });
  if (r.ok || r.reason === "already") return json(r);
  if (r.reason === "closed") throw new HttpError(409, `现在不在打卡时间，晚自习打卡时间是 ${r.window.replace("-", " 到 ")}`);
  throw new HttpError(400, "口令不对，看一下屏幕上今天的数字");
});

/* ---------- 热力图 ---------- */

const publicProviders = () =>
  PROVIDERS.map((p) => ({
    id: p.id,
    label: p.label,
    unit: p.unit,
    category: p.category,
    status: p.status,
    coverage: p.coverage,
    handleHint: p.handleHint,
    needsUserSecret: p.needsUserSecret ?? null,
  }));

api.get("/api/heatmap", async (c) => {
  const uid = memberId(c);
  const [series, bindings] = await Promise.all([loadSeries(c.env.DB, uid), listBindings(c.env.DB, uid)]);
  return json({ today: cnDate(Date.now()), series, bindings, providers: publicProviders() });
});

api.post("/api/heatmap/bindings", async (c) => {
  const uid = memberId(c);
  const input = z
    .object({ source: z.string().max(32), handle: z.string().trim().min(1).max(64), secret: z.string().trim().max(400).optional() })
    .parse(await c.body());
  try {
    await bindSource(c.env.DB, requireSecret(c.env), { userId: uid, ...input });
  } catch (err) {
    if (err instanceof ProviderError) throw new HttpError(400, err.message);
    throw err;
  }
  const synced = await syncUser(c.env.DB, { ...c.env, SESSION_SECRET: requireSecret(c.env) }, uid, (u, i) => fetch(u, i));
  const mine = synced.find((s) => s.source === input.source);
  return json({ ok: true, error: mine?.error ?? null, days: mine ? Object.keys(mine.days).length : 0 });
});

api.delete("/api/heatmap/bindings/:source", async (c) => {
  await unbindSource(c.env.DB, memberId(c), c.params.source);
  return json({ ok: true });
});

/* ---------- 会长后台 ---------- */

api.get("/api/admin/members", async (c) => {
  requireAdmin(c);
  return json(await listMembers(c.env.DB));
});

api.post("/api/admin/members/import", async (c) => {
  requireAdmin(c);
  const { text } = z.object({ text: z.string().max(100_000) }).parse(await c.body());
  const { rows, errors } = parseRoster(text);
  if (rows.length === 0) throw new HttpError(400, errors[0] ?? "没有识别到成员。每行写“学号 姓名 班级”。", { errors });
  const result = await importMembers(c.env.DB, requireSecret(c.env), rows);
  return json({ ...result, errors });
});

api.post("/api/admin/members/:id/reset", async (c) => {
  requireAdmin(c);
  const passcode = await resetPasscode(c.env.DB, requireSecret(c.env), c.params.id);
  if (!passcode) throw new HttpError(404, "找不到这个成员");
  return json({ passcode });
});

api.post("/api/admin/members/:id/status", async (c) => {
  requireAdmin(c);
  const { status } = z.object({ status: z.enum(["active", "archived"]) }).parse(await c.body());
  await setMemberStatus(c.env.DB, c.params.id, status);
  return json({ ok: true });
});

api.get("/api/admin/idle", async (c) => {
  requireAdmin(c);
  const days = Math.min(60, Math.max(1, Number(c.url.searchParams.get("days") ?? 7) || 7));
  return json(idleMembers(await listMembers(c.env.DB), days));
});

api.get("/api/admin/checkin/today", async (c) => {
  requireAdmin(c);
  const today = cnDate(Date.now());
  const rule = await checkinRule(c.env.DB);
  const [count, total] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) AS n FROM checkins WHERE day = ? AND session = 'evening'").bind(today).first<{ n: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE status = 'active'").first<{ n: number }>(),
  ]);
  return json({ today, ...rule, code: await dailyCode(requireSecret(c.env), today), count: count?.n ?? 0, total: total?.n ?? 0 });
});

api.put("/api/admin/checkin/settings", async (c) => {
  requireAdmin(c);
  const { window, requireCode } = z.object({ window: z.string().max(20), requireCode: z.boolean() }).parse(await c.body());
  if (!parseWindow(window)) throw new HttpError(400, "时间段格式是 18:30-22:30，开始要早于结束");
  await setSetting(c.env.DB, "checkin_window", window);
  await setSetting(c.env.DB, "checkin_code", requireCode ? "on" : "off");
  return json({ ok: true });
});

api.get("/api/admin/checkins.csv", async (c) => {
  requireAdmin(c);
  const today = cnDate(Date.now());
  const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
  const from = day.catch(addDays(today, -30)).parse(c.url.searchParams.get("from"));
  const to = day.catch(today).parse(c.url.searchParams.get("to"));
  const csv = checkinsCsv(await listCheckins(c.env.DB, from, to));
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`晚自习打卡_${from}_${to}.csv`)}`,
    },
  });
});

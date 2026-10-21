import { cnDate, weekdayMon0 } from "../shared/heatmap";
import { recordActivity } from "./activity";
import { getSetting } from "./db";

/**
 * 签到签退（技术方案“管理”一节）。
 *
 * 两种场景：
 *  - evening：晚自习，默认周一、二、四 19:00–20:40，只能在时段内签到（可提前 15 分钟）；到 20:40 自动结束
 *  - venue：大创场地日常使用，任意时间进场签到、离场签退；当天 23:59 自动结束
 *
 * 签到、签退各拍一张现场照片（只能用摄像头拍，网页和 App 都不提供相册入口），时间以服务器为准。
 * 管理员可以在后台打开“现场口令”（每天自动换的 4 位数），晚自习签到时要再输一次。
 * 不统计连续天数，没有断签。
 *
 * 可在 settings 表里改：
 *  - evening_days：晚自习是星期几，"1,2,4"（1 = 周一 … 7 = 周日）
 *  - evening_window：晚自习时段，"19:00-20:40"
 *  - checkin_code：on / off，晚自习签到是否要现场口令
 */

export type AttendanceKind = "evening" | "venue";
export type AttendanceStatus = "open" | "closed" | "auto_closed";

export interface AttendanceRule {
  days: number[]; // 1 = 周一 … 7 = 周日
  window: [string, string];
  earlyMinutes: number;
  requireCode: boolean;
}

export const DEFAULT_EVENING_DAYS = [1, 2, 4];
export const DEFAULT_EVENING_WINDOW: [string, string] = ["19:00", "20:40"];

export interface AttendanceRow {
  id: string;
  user_id: string;
  kind: AttendanceKind;
  day: string;
  in_at: number;
  out_at: number | null;
  in_photo: string | null;
  out_photo: string | null;
  status: AttendanceStatus;
}

export class AttendanceError extends Error {
  constructor(
    public code: "closed" | "not_evening_day" | "code" | "already_in" | "not_in" | "photo",
    message: string,
  ) {
    super(message);
  }
}

/** 北京时间的 "HH:MM"。 */
export function cnClock(ms: number): string {
  return new Date(ms + 8 * 3_600_000).toISOString().slice(11, 16);
}

/** 北京时间某天某时刻对应的 Unix 毫秒。 */
export function cnTime(day: string, hhmm: string): number {
  return Date.parse(`${day}T${hhmm}:00+08:00`);
}

export function parseWindow(w: string | null | undefined): [string, string] | null {
  const m = (w ?? "").trim().match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/);
  if (!m) return null;
  const a = `${m[1]}:${m[2]}`;
  const b = `${m[3]}:${m[4]}`;
  if (Number(m[1]) > 23 || Number(m[3]) > 23 || Number(m[2]) > 59 || Number(m[4]) > 59 || a >= b) return null;
  return [a, b];
}

export function parseDays(s: string | null | undefined): number[] | null {
  if (!s) return null;
  const days = [...new Set(s.split(/[,，\s]+/).filter(Boolean).map(Number))].sort();
  if (days.length === 0 || days.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) return null;
  return days;
}

export async function loadRule(db: D1Database): Promise<AttendanceRule> {
  const [days, window, code] = await Promise.all([getSetting(db, "evening_days"), getSetting(db, "evening_window"), getSetting(db, "checkin_code")]);
  return {
    days: parseDays(days) ?? DEFAULT_EVENING_DAYS,
    window: parseWindow(window) ?? DEFAULT_EVENING_WINDOW,
    earlyMinutes: 15,
    requireCode: code === "on",
  };
}

/** 今天（北京时间）是不是晚自习日，现在能不能签到、什么时候结束。 */
export function eveningState(rule: AttendanceRule, now: number) {
  const day = cnDate(now);
  const isDay = rule.days.includes(weekdayMon0(day) + 1);
  const opensAt = cnTime(day, rule.window[0]) - rule.earlyMinutes * 60_000;
  const endsAt = cnTime(day, rule.window[1]);
  return { day, isDay, opensAt, endsAt, open: isDay && now >= opensAt && now <= endsAt };
}

/** 当天的现场口令：由密钥和日期算出 4 位数字，管理员后台显示，学员现场输入。 */
export async function dailyCode(secret: string, day: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`checkin:${day}`)));
  const n = ((sig[0] << 24) | (sig[1] << 16) | (sig[2] << 8) | sig[3]) >>> 0;
  return String(n % 10000).padStart(4, "0");
}

/** 把超时没签退的记录自动结束：晚自习到结束时刻，场地到当天 23:59。 */
export async function autoClose(db: D1Database, rule: AttendanceRule, now = Date.now(), userId?: string) {
  const open = await db
    .prepare(`SELECT id, kind, day FROM attendance WHERE status = 'open'${userId ? " AND user_id = ?" : ""}`)
    .bind(...(userId ? [userId] : []))
    .all<{ id: string; kind: AttendanceKind; day: string }>();
  const stmts: D1PreparedStatement[] = [];
  for (const r of open.results) {
    const end = r.kind === "evening" ? cnTime(r.day, rule.window[1]) : cnTime(r.day, "23:59") + 59_000;
    if (now > end) stmts.push(db.prepare("UPDATE attendance SET status = 'auto_closed', out_at = ? WHERE id = ? AND status = 'open'").bind(end, r.id));
  }
  if (stmts.length) await db.batch(stmts);
  return stmts.length;
}

export async function openRecord(db: D1Database, userId: string): Promise<AttendanceRow | null> {
  return db.prepare("SELECT * FROM attendance WHERE user_id = ? AND status = 'open' ORDER BY in_at DESC LIMIT 1").bind(userId).first<AttendanceRow>();
}

export async function signIn(
  db: D1Database,
  input: { userId: string; kind: AttendanceKind; rule: AttendanceRule; secret: string; code?: string; photoKey: string | null; ip?: string | null },
  now = Date.now(),
): Promise<AttendanceRow> {
  await autoClose(db, input.rule, now, input.userId);
  const current = await openRecord(db, input.userId);
  if (current) throw new AttendanceError("already_in", current.kind === "evening" ? "你已经在晚自习签到了，离开时记得签退" : "你已经在场地签到了，离开时记得签退");
  const day = cnDate(now);
  if (input.kind === "evening") {
    const ev = eveningState(input.rule, now);
    if (!ev.isDay) throw new AttendanceError("not_evening_day", "今天没有晚自习。去大创场地学习请选“场地签到”");
    if (!ev.open) throw new AttendanceError("closed", `现在不在晚自习签到时间。签到时间是 ${cnClock(ev.opensAt)} 到 ${input.rule.window[1]}`);
    const done = await db.prepare("SELECT 1 AS x FROM attendance WHERE user_id = ? AND day = ? AND kind = 'evening'").bind(input.userId, day).first();
    if (done) throw new AttendanceError("already_in", "今晚已经签到过了");
    if (input.rule.requireCode && (input.code ?? "").trim() !== (await dailyCode(input.secret, day))) {
      throw new AttendanceError("code", "口令不对，看一下屏幕上今天的 4 位数");
    }
  }
  if (!input.photoKey) throw new AttendanceError("photo", "签到要拍一张现场照片");
  const row: AttendanceRow = {
    id: crypto.randomUUID(),
    user_id: input.userId,
    kind: input.kind,
    day,
    in_at: now,
    out_at: null,
    in_photo: input.photoKey,
    out_photo: null,
    status: "open",
  };
  await db
    .prepare("INSERT INTO attendance (id, user_id, kind, day, in_at, in_photo, status, ip) VALUES (?, ?, ?, ?, ?, ?, 'open', ?)")
    .bind(row.id, row.user_id, row.kind, row.day, row.in_at, row.in_photo, input.ip ?? null)
    .run();
  await recordActivity(db, input.userId, "attend_in", row.id, now);
  return row;
}

export async function signOut(db: D1Database, input: { userId: string; rule: AttendanceRule; photoKey: string | null }, now = Date.now()): Promise<AttendanceRow> {
  await autoClose(db, input.rule, now, input.userId);
  const current = await openRecord(db, input.userId);
  if (!current) throw new AttendanceError("not_in", "现在没有进行中的签到。超过结束时间的记录已经自动结束了");
  if (!input.photoKey) throw new AttendanceError("photo", "签退也要拍一张现场照片");
  await db.prepare("UPDATE attendance SET out_at = ?, out_photo = ?, status = 'closed' WHERE id = ?").bind(now, input.photoKey, current.id).run();
  await recordActivity(db, input.userId, "attend_out", current.id, now);
  return { ...current, out_at: now, out_photo: input.photoKey, status: "closed" };
}

export interface AttendanceExportRow {
  student_no: string;
  name: string;
  class_name: string | null;
  day: string;
  kind: AttendanceKind;
  in_at: number;
  out_at: number | null;
  status: AttendanceStatus;
}

export async function listAttendance(db: D1Database, fromDay: string, toDay: string, kind?: AttendanceKind): Promise<AttendanceExportRow[]> {
  const rows = await db
    .prepare(
      `SELECT u.student_no, u.name, u.class_name, a.day, a.kind, a.in_at, a.out_at, a.status
       FROM attendance a JOIN users u ON u.id = a.user_id
       WHERE a.day >= ? AND a.day <= ?${kind ? " AND a.kind = ?" : ""}
       ORDER BY a.day, a.kind, u.student_no, a.in_at`,
    )
    .bind(fromDay, toDay, ...(kind ? [kind] : []))
    .all<AttendanceExportRow>();
  return rows.results;
}

const KIND_LABEL: Record<AttendanceKind, string> = { evening: "晚自习", venue: "大创场地" };
const STATUS_LABEL: Record<AttendanceStatus, string> = { open: "进行中", closed: "已签退", auto_closed: "未签退" };

function csvCell(v: string): string {
  // 防止 Excel 把 =、+、-、@ 开头的内容当公式
  const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** 导出给学校的表格：带 BOM 的 UTF-8 CSV，Excel 直接打开不乱码。 */
export function attendanceCsv(rows: AttendanceExportRow[]): string {
  const head = ["学号", "姓名", "班级", "日期", "场景", "签到时间", "签退时间", "状态"];
  const lines = rows.map((r) =>
    [r.student_no, r.name, r.class_name ?? "", r.day, KIND_LABEL[r.kind], cnClock(r.in_at), r.out_at ? cnClock(r.out_at) : "", STATUS_LABEL[r.status]]
      .map(csvCell)
      .join(","),
  );
  return `﻿${[head.join(","), ...lines].join("\r\n")}\r\n`;
}

/** 某人最近的签到记录（个人页和 App 用）。 */
export async function recentAttendance(db: D1Database, userId: string, limit = 20) {
  const rows = await db
    .prepare("SELECT id, kind, day, in_at, out_at, status FROM attendance WHERE user_id = ? ORDER BY in_at DESC LIMIT ?")
    .bind(userId, limit)
    .all<{ id: string; kind: AttendanceKind; day: string; in_at: number; out_at: number | null; status: AttendanceStatus }>();
  return rows.results;
}

export async function attendanceTotals(db: D1Database, userId: string) {
  const r = await db
    .prepare("SELECT SUM(kind = 'evening') AS evening, SUM(kind = 'venue') AS venue FROM attendance WHERE user_id = ?")
    .bind(userId)
    .first<{ evening: number | null; venue: number | null }>();
  return { evening: r?.evening ?? 0, venue: r?.venue ?? 0 };
}


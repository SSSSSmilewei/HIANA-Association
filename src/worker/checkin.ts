import { cnDate } from "../shared/heatmap";
import { recordActivity } from "./activity";

/**
 * 晚自习打卡。给学校看的出勤记录：每人每晚一次，可以导出成表格。
 * 不统计连续天数，没有断签。
 *
 * 可在后台设置（settings 表）：
 *  - checkin_window：允许打卡的时间段，北京时间，默认 "18:30-22:30"
 *  - checkin_code：开启后要输入会长在现场展示的 4 位口令（每天自动换），防止代签
 */

export const DEFAULT_WINDOW = "18:30-22:30";

export interface CheckinRule {
  window: string; // "HH:MM-HH:MM"
  requireCode: boolean;
}

export type CheckinResult =
  | { ok: true; day: string; at: number }
  | { ok: false; reason: "already"; day: string; at: number }
  | { ok: false; reason: "closed"; window: string }
  | { ok: false; reason: "code" };

/** 北京时间的 "HH:MM"。 */
export function cnClock(ms: number): string {
  return new Date(ms + 8 * 3_600_000).toISOString().slice(11, 16);
}

export function parseWindow(w: string): [string, string] | null {
  const m = w.trim().match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/);
  if (!m) return null;
  const a = `${m[1]}:${m[2]}`;
  const b = `${m[3]}:${m[4]}`;
  if (Number(m[1]) > 23 || Number(m[3]) > 23 || Number(m[2]) > 59 || Number(m[4]) > 59 || a >= b) return null;
  return [a, b];
}

export function inWindow(window: string, ms: number): boolean {
  const w = parseWindow(window) ?? parseWindow(DEFAULT_WINDOW)!;
  const t = cnClock(ms);
  return t >= w[0] && t <= w[1];
}

/** 当天的现场口令：由密钥和日期算出 4 位数字，会长后台显示，学员现场输入。 */
export async function dailyCode(secret: string, day: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`checkin:${day}`)));
  const n = ((sig[0] << 24) | (sig[1] << 16) | (sig[2] << 8) | sig[3]) >>> 0;
  return String(n % 10000).padStart(4, "0");
}

export async function checkIn(
  db: D1Database,
  opts: { userId: string; rule: CheckinRule; secret: string; code?: string; ip?: string | null; now?: number },
): Promise<CheckinResult> {
  const now = opts.now ?? Date.now();
  const day = cnDate(now);
  const existing = await db
    .prepare("SELECT at FROM checkins WHERE user_id = ? AND day = ? AND session = 'evening'")
    .bind(opts.userId, day)
    .first<{ at: number }>();
  if (existing) return { ok: false, reason: "already", day, at: existing.at };
  if (!inWindow(opts.rule.window, now)) return { ok: false, reason: "closed", window: opts.rule.window };
  if (opts.rule.requireCode && (opts.code ?? "").trim() !== (await dailyCode(opts.secret, day))) return { ok: false, reason: "code" };
  const res = await db
    .prepare("INSERT OR IGNORE INTO checkins (user_id, day, session, at, ip) VALUES (?, ?, 'evening', ?, ?)")
    .bind(opts.userId, day, now, opts.ip ?? null)
    .run();
  if (!res.meta.changes) {
    // 同一时刻点了两次：第二次当作已打卡
    const row = await db.prepare("SELECT at FROM checkins WHERE user_id = ? AND day = ? AND session = 'evening'").bind(opts.userId, day).first<{ at: number }>();
    return { ok: false, reason: "already", day, at: row?.at ?? now };
  }
  await recordActivity(db, opts.userId, "checkin", day, now);
  return { ok: true, day, at: now };
}

export interface CheckinRow {
  student_no: string;
  name: string;
  class_name: string | null;
  day: string;
  at: number;
}

export async function listCheckins(db: D1Database, fromDay: string, toDay: string): Promise<CheckinRow[]> {
  const rows = await db
    .prepare(
      `SELECT u.student_no, u.name, u.class_name, c.day, c.at
       FROM checkins c JOIN users u ON u.id = c.user_id
       WHERE c.day >= ? AND c.day <= ? AND c.session = 'evening'
       ORDER BY c.day, u.student_no`,
    )
    .bind(fromDay, toDay)
    .all<CheckinRow>();
  return rows.results;
}

function csvCell(v: string): string {
  // 防止 Excel 把 =、+、-、@ 开头的内容当公式
  const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** 导出给学校的表格：带 BOM 的 UTF-8 CSV，Excel 直接打开不乱码。 */
export function checkinsCsv(rows: CheckinRow[]): string {
  const head = ["学号", "姓名", "班级", "日期", "打卡时间"];
  const lines = rows.map((r) => [r.student_no, r.name, r.class_name ?? "", r.day, cnClock(r.at)].map(csvCell).join(","));
  return `﻿${[head.join(","), ...lines].join("\r\n")}\r\n`;
}

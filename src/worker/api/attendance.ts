import { z } from "zod";
import { addDays, cnDate } from "../../shared/heatmap";
import {
  AttendanceError,
  type AttendanceKind,
  attendanceCsv,
  attendanceTotals,
  autoClose,
  dailyCode,
  eveningState,
  listAttendance,
  loadRule,
  openRecord,
  parseDays,
  parseWindow,
  recentAttendance,
  signIn,
  signOut,
} from "../attendance";
import { setSetting } from "../db";
import { MAX_PHOTO_BYTES, decodeBase64, getFile, putFile, sniffImage } from "../files";
import { HttpError, type Router, json } from "../http";
import { clientIp, requireSecret } from "../session";
import { DAY_RE, isAdmin, memberId, requireAdmin } from "./common";

const PhotoBody = z.object({ photo: z.string().min(100).max(1_000_000) });

async function storePhoto(c: Parameters<Parameters<Router["get"]>[1]>[0], b64: string, userId: string): Promise<string> {
  let bytes: Uint8Array;
  try {
    bytes = decodeBase64(b64);
  } catch {
    throw new HttpError(400, "照片格式不对，重新拍一张");
  }
  if (bytes.length > MAX_PHOTO_BYTES) throw new HttpError(413, "照片太大了，重新拍一张");
  const mime = sniffImage(bytes);
  if (!mime) throw new HttpError(400, "只能上传 JPEG、PNG 或 WebP 照片");
  return putFile(c.env, { prefix: "attendance", ownerId: userId, mime, bytes });
}

function attendanceError(err: unknown): never {
  if (err instanceof AttendanceError) {
    const status = err.code === "code" || err.code === "photo" ? 400 : 409;
    throw new HttpError(status, err.message, { reason: err.code });
  }
  throw err;
}

export function attendanceRoutes(api: Router) {
  /** 签到页的状态：今天有没有晚自习、现在能不能签到、我有没有进行中的签到。 */
  api.get("/api/attendance", async (c) => {
    const uid = memberId(c);
    const rule = await loadRule(c.env.DB);
    const now = Date.now();
    await autoClose(c.env.DB, rule, now, uid);
    const ev = eveningState(rule, now);
    const [current, recent, totals, eveningDone] = await Promise.all([
      openRecord(c.env.DB, uid),
      recentAttendance(c.env.DB, uid, 10),
      attendanceTotals(c.env.DB, uid),
      c.env.DB.prepare("SELECT in_at, out_at, status FROM attendance WHERE user_id = ? AND day = ? AND kind = 'evening'")
        .bind(uid, ev.day)
        .first<{ in_at: number; out_at: number | null; status: string }>(),
    ]);
    return json({
      now,
      today: ev.day,
      evening: { days: rule.days, window: rule.window, isDay: ev.isDay, open: ev.open, opensAt: ev.opensAt, endsAt: ev.endsAt, requireCode: rule.requireCode, record: eveningDone ?? null },
      current: current ? { id: current.id, kind: current.kind, inAt: current.in_at } : null,
      recent: recent.map((r) => ({ id: r.id, kind: r.kind, day: r.day, inAt: r.in_at, outAt: r.out_at, status: r.status })),
      totals,
    });
  });

  api.post("/api/attendance/in", async (c) => {
    const uid = memberId(c);
    const body = PhotoBody.extend({ kind: z.enum(["evening", "venue"]), code: z.string().trim().max(8).optional() }).parse(await c.body());
    const rule = await loadRule(c.env.DB);
    // 先检查能不能签到，再存照片，免得存下没用的照片
    const ev = eveningState(rule, Date.now());
    if (body.kind === "evening" && !ev.open) {
      attendanceError(
        new AttendanceError(ev.isDay ? "closed" : "not_evening_day", ev.isDay ? `现在不在晚自习签到时间` : "今天没有晚自习。去大创场地学习请选“场地签到”"),
      );
    }
    const key = await storePhoto(c, body.photo, uid);
    try {
      const row = await signIn(c.env.DB, { userId: uid, kind: body.kind as AttendanceKind, rule, secret: requireSecret(c.env), code: body.code, photoKey: key, ip: clientIp(c.req) });
      return json({ ok: true, id: row.id, kind: row.kind, inAt: row.in_at });
    } catch (err) {
      attendanceError(err);
    }
  });

  api.post("/api/attendance/out", async (c) => {
    const uid = memberId(c);
    const body = PhotoBody.parse(await c.body());
    const rule = await loadRule(c.env.DB);
    await autoClose(c.env.DB, rule, Date.now(), uid);
    if (!(await openRecord(c.env.DB, uid))) attendanceError(new AttendanceError("not_in", "现在没有进行中的签到。超过结束时间的记录已经自动结束了"));
    const key = await storePhoto(c, body.photo, uid);
    try {
      const row = await signOut(c.env.DB, { userId: uid, rule, photoKey: key });
      return json({ ok: true, id: row.id, outAt: row.out_at });
    } catch (err) {
      attendanceError(err);
    }
  });

  /** 照片：本人或管理员能看。 */
  api.get("/api/files/:a/:b/:c", async (c) => {
    const key = `${c.params.a}/${c.params.b}/${c.params.c}`;
    const file = await getFile(c.env, key);
    if (!file) throw new HttpError(404, "找不到这张照片");
    if (!isAdmin(c) && file.ownerId !== memberId(c)) throw new HttpError(403, "只能看自己的照片");
    return new Response(file.bytes, { headers: { "content-type": file.mime, "cache-control": "private, max-age=86400" } });
  });

  /* ---------- 管理员 ---------- */

  api.get("/api/admin/attendance/today", async (c) => {
    requireAdmin(c);
    const rule = await loadRule(c.env.DB);
    const now = Date.now();
    await autoClose(c.env.DB, rule, now);
    const ev = eveningState(rule, now);
    const [rows, total] = await Promise.all([
      c.env.DB.prepare(
        `SELECT a.id, a.kind, a.in_at, a.out_at, a.status, a.in_photo, a.out_photo, u.name, u.student_no
         FROM attendance a JOIN users u ON u.id = a.user_id WHERE a.day = ? ORDER BY a.in_at`,
      )
        .bind(ev.day)
        .all<{ id: string; kind: string; in_at: number; out_at: number | null; status: string; in_photo: string | null; out_photo: string | null; name: string; student_no: string }>(),
      c.env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE status = 'active' AND role = 'member'").first<{ n: number }>(),
    ]);
    return json({
      today: ev.day,
      rule: { days: rule.days, window: rule.window, requireCode: rule.requireCode },
      isEveningDay: ev.isDay,
      code: await dailyCode(requireSecret(c.env), ev.day),
      members: total?.n ?? 0,
      records: rows.results.map((r) => ({
        id: r.id,
        kind: r.kind,
        inAt: r.in_at,
        outAt: r.out_at,
        status: r.status,
        inPhoto: r.in_photo,
        outPhoto: r.out_photo,
        name: r.name,
        studentNo: r.student_no,
      })),
    });
  });

  api.put("/api/admin/attendance/settings", async (c) => {
    requireAdmin(c);
    const body = z.object({ days: z.string().max(20), window: z.string().max(20), requireCode: z.boolean() }).parse(await c.body());
    if (!parseDays(body.days)) throw new HttpError(400, "晚自习日期写成 1,2,4（1 是周一，7 是周日）");
    if (!parseWindow(body.window)) throw new HttpError(400, "时间段写成 19:00-20:40，开始要早于结束");
    await setSetting(c.env.DB, "evening_days", body.days);
    await setSetting(c.env.DB, "evening_window", body.window);
    await setSetting(c.env.DB, "checkin_code", body.requireCode ? "on" : "off");
    return json({ ok: true });
  });

  api.get("/api/admin/attendance.csv", async (c) => {
    requireAdmin(c);
    const today = cnDate(Date.now());
    const day = z.string().regex(DAY_RE);
    const from = day.catch(addDays(today, -30)).parse(c.url.searchParams.get("from"));
    const to = day.catch(today).parse(c.url.searchParams.get("to"));
    const kind = z.enum(["evening", "venue"]).optional().catch(undefined).parse(c.url.searchParams.get("kind") ?? undefined);
    await autoClose(c.env.DB, await loadRule(c.env.DB));
    const csv = attendanceCsv(await listAttendance(c.env.DB, from, to, kind));
    const label = kind === "evening" ? "晚自习" : kind === "venue" ? "场地" : "签到";
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${label}记录_${from}_${to}.csv`)}`,
      },
    });
  });
}

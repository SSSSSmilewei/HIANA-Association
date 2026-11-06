import { z } from "zod";
import { type Ctx, HttpError, type Router, json } from "../http";
import { adminLink, enqueue } from "../notify";
import { memberId, requireAdmin } from "./common";

/**
 * 新生任务里要交证书的课（现在只有 CS50x）。学员贴证书链接，状态是“待确认”；
 * 管理员看过证书后点通过（或退回并写一句原因），通过了这一步才算完成。
 * 退回后学员可以重新交；已经通过的不能再改。
 */
export const CERT_COURSES = ["cs50x"] as const;
type CertCourse = (typeof CERT_COURSES)[number];
export type CertStatus = "pending" | "approved" | "rejected";

interface CertRow {
  user_id: string;
  course_slug: string;
  url: string;
  status: CertStatus;
  note: string | null;
  submitted_at: number;
  reviewed_at: number | null;
}

const certOut = (r: CertRow) => ({ course: r.course_slug, url: r.url, status: r.status, note: r.note, submittedAt: r.submitted_at, reviewedAt: r.reviewed_at });

function certCourse(c: Ctx): CertCourse {
  const slug = c.params.course;
  if (!(CERT_COURSES as readonly string[]).includes(slug)) throw new HttpError(404, "该课程不需要提交证书");
  return slug as CertCourse;
}

const Submit = z.object({
  url: z
    .string()
    .trim()
    .max(500, "链接过长")
    .regex(/^https:\/\/\S+$/, "请填写以 https:// 开头的完整证书链接"),
});

const Review = z.object({
  status: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(200).optional(),
});

export function startRoutes(api: Router) {
  /** 我交过的证书（新生任务页用）。 */
  api.get("/api/start", async (c) => {
    const uid = memberId(c);
    const rows = await c.env.DB.prepare("SELECT * FROM certificates WHERE user_id = ?").bind(uid).all<CertRow>();
    return json({ certificates: rows.results.map(certOut) });
  });

  /** 交（或退回后重交）证书链接。 */
  api.put("/api/start/certificates/:course", async (c) => {
    const uid = memberId(c);
    const course = certCourse(c);
    const { url } = Submit.parse(await c.body());
    const db = c.env.DB;
    const old = await db.prepare("SELECT status FROM certificates WHERE user_id = ? AND course_slug = ?").bind(uid, course).first<{ status: CertStatus }>();
    if (old?.status === "approved") throw new HttpError(409, "证书已通过确认，不能修改");
    const now = Date.now();
    await db
      .prepare(
        `INSERT INTO certificates (user_id, course_slug, url, status, note, submitted_at) VALUES (?, ?, ?, 'pending', NULL, ?)
         ON CONFLICT(user_id, course_slug) DO UPDATE SET url = excluded.url, status = 'pending', note = NULL, submitted_at = excluded.submitted_at, reviewed_by = NULL, reviewed_at = NULL`,
      )
      .bind(uid, course, url, now)
      .run();
    await enqueue(c.env, { kind: "certificate", title: `新证书待确认：${c.user?.name ?? ""}`, body: "CS50x 课程证书", link: adminLink(c.env, "/admin") });
    const row = await db.prepare("SELECT * FROM certificates WHERE user_id = ? AND course_slug = ?").bind(uid, course).first<CertRow>();
    return json({ certificate: row ? certOut(row) : null });
  });

  /** 管理员：证书列表，待确认的在前。 */
  api.get("/api/admin/certificates", async (c) => {
    requireAdmin(c);
    const rows = await c.env.DB.prepare(
      `SELECT c.*, u.name, u.student_no, u.kind FROM certificates c JOIN users u ON u.id = c.user_id
       ORDER BY CASE c.status WHEN 'pending' THEN 0 ELSE 1 END, c.submitted_at DESC LIMIT 200`,
    ).all<CertRow & { name: string; student_no: string; kind: string }>();
    return json(rows.results.map((r) => ({ ...certOut(r), userId: r.user_id, name: r.name, studentNo: r.kind === "campus" ? r.student_no : null })));
  });

  /** 管理员：通过或退回。 */
  api.put("/api/admin/certificates/:course/:user", async (c) => {
    const { userId } = requireAdmin(c);
    const course = certCourse(c);
    const { status, note } = Review.parse(await c.body());
    const res = await c.env.DB.prepare("UPDATE certificates SET status = ?, note = ?, reviewed_by = ?, reviewed_at = ? WHERE user_id = ? AND course_slug = ?")
      .bind(status, note || null, userId, Date.now(), c.params.user, course)
      .run();
    if (!res.meta.changes) throw new HttpError(404, "未找到该证书");
    return json({ ok: true });
  });
}

import { z } from "zod";
import {
  APPLICATIONS_CLOSED_DEFAULT,
  APPLICATION_QUESTIONS,
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABEL,
  type ApplicationDetail,
  type ApplicationStatus,
  type ApplicationSummary,
} from "../../shared/applications";
import { cnDate } from "../../shared/heatmap";
import { cnClock, csvCell } from "../attendance";
import { getSetting, setSetting } from "../db";
import { HttpError, type Router, json } from "../http";
import { adminLink, enqueue, flush } from "../notify";
import { clientIp } from "../session";
import { requireAdmin } from "./common";

/**
 * 新生报名：开场动画（/intro/）里的报名表交到这里。
 * 报名表上写着“只有指导老师和会长能看到”，所以除了管理员接口，任何返回都不带报名内容。
 * 同一学号再交一次 = 覆盖上一次（submit_count 加 1；被标成“未通过”的改回“新报名”）。
 */

const OPEN_KEY = "applications_open";
const MESSAGE_KEY = "applications_closed_message";
const HOURLY_LIMIT = 10;
const HOUR_MS = 3_600_000;

/** 规则和报名表前端的 check1() 一致；服务器再查一遍 */
const Submit = z.object({
  name: z.string().trim().min(1, "名字还没填").max(20, "名字最多 20 个字"),
  className: z.string().trim().min(1, "班级还没填").max(30, "班级最多 30 个字"),
  studentId: z.string().trim().regex(/^\d{6,15}$/, "学号应该是 6–15 位数字"),
  phone: z.string().trim().regex(/^1\d{10}$/, "手机号应该是 1 开头的 11 位数字"),
  qq: z.string().trim().regex(/^\d{5,11}$/, "QQ 号应该是 5–11 位数字"),
  fresh: z.literal(true, { errorMap: () => ({ message: "报名只面向湖南涉外经济学院的在读新生，请勾选确认" }) }),
  q1: z.string().trim().min(1, "第 1 题还没写").max(2000, "第 1 题最多 2000 字"),
  q2: z.string().trim().max(2000, "第 2 题最多 2000 字").optional().nullable(),
  q3: z.string().trim().max(2000, "第 3 题最多 2000 字").optional().nullable(),
  q4: z.string().trim().max(2000, "第 4 题最多 2000 字").optional().nullable(),
  q5: z.string().trim().max(2000, "第 5 题最多 2000 字").optional().nullable(),
  /** 蜜罐：页面上藏起来的输入框，人看不见也不会填 */
  website: z.unknown().optional(),
});

const Patch = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  adminNote: z.string().trim().max(2000, "备注最多 2000 字").nullable().optional(),
});

const Settings = z.object({
  open: z.boolean(),
  message: z.string().trim().max(100, "提示语最多 100 字").optional(),
});

interface Row {
  id: string;
  student_id: string;
  name: string;
  class_name: string;
  phone: string;
  qq: string;
  q1: string | null;
  q2: string | null;
  q3: string | null;
  q4: string | null;
  q5: string | null;
  status: ApplicationStatus;
  admin_note: string | null;
  submit_count: number;
  created_at: number;
  updated_at: number;
  handled_by: string | null;
  handled_at: number | null;
}

async function loadSettings(db: D1Database): Promise<{ open: boolean; message: string }> {
  const [open, message] = await Promise.all([getSetting(db, OPEN_KEY), getSetting(db, MESSAGE_KEY)]);
  return { open: open !== "0", message: message || APPLICATIONS_CLOSED_DEFAULT };
}

function summary(r: Row): ApplicationSummary {
  return {
    id: r.id,
    studentId: r.student_id,
    name: r.name,
    className: r.class_name,
    status: r.status,
    submitCount: r.submit_count,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function blank(s: string | null | undefined): string | null {
  return s ? s : null;
}

/** 北京时间 "YYYY-MM-DD HH:MM" */
function cnStamp(ms: number): string {
  return `${cnDate(ms)} ${cnClock(ms)}`;
}

async function findRow(db: D1Database, id: string): Promise<Row> {
  const row = await db.prepare("SELECT * FROM applications WHERE id = ?").bind(id).first<Row>();
  if (!row) throw new HttpError(404, "没有这条报名");
  return row;
}

async function detail(db: D1Database, r: Row): Promise<ApplicationDetail> {
  const by = r.handled_by
    ? await db.prepare("SELECT name FROM users WHERE id = ?").bind(r.handled_by).first<{ name: string }>()
    : null;
  return {
    ...summary(r),
    phone: r.phone,
    qq: r.qq,
    answers: [r.q1, r.q2, r.q3, r.q4, r.q5],
    adminNote: r.admin_note,
    handledBy: by?.name ?? null,
    handledAt: r.handled_at,
  };
}

/** 导出全部报名：带 BOM 的 UTF-8 CSV，Excel 直接打开不乱码 */
export function applicationsCsv(rows: Row[]): string {
  const head = ["提交时间", "最后更新", "提交次数", "名字", "班级", "学号", "手机号", "QQ", ...APPLICATION_QUESTIONS.map((q, i) => `${i + 1}. ${q.title}`), "状态", "备注"];
  const lines = rows.map((r) =>
    [
      cnStamp(r.created_at),
      cnStamp(r.updated_at),
      String(r.submit_count),
      r.name,
      r.class_name,
      r.student_id,
      r.phone,
      r.qq,
      r.q1 ?? "",
      r.q2 ?? "",
      r.q3 ?? "",
      r.q4 ?? "",
      r.q5 ?? "",
      APPLICATION_STATUS_LABEL[r.status] ?? r.status,
      r.admin_note ?? "",
    ]
      .map(csvCell)
      .join(","),
  );
  return `﻿${[head.join(","), ...lines].join("\r\n")}\r\n`;
}

export function applicationRoutes(api: Router) {
  // ---------- 公开：报名表用 ----------

  api.get("/api/applications/status", async (c) => {
    const s = await loadSettings(c.env.DB);
    return json(s.open ? { open: true } : { open: false, message: s.message });
  });

  api.post("/api/applications", async (c) => {
    const db = c.env.DB;
    const s = await loadSettings(db);
    if (!s.open) throw new HttpError(403, s.message, { closed: true });

    // 防刷：每个 IP 每小时最多交 HOURLY_LIMIT 次（填错被退回的也算）
    const ip = clientIp(c.req);
    const now = Date.now();
    const hits = await db.prepare("SELECT COUNT(*) AS n FROM application_hits WHERE ip = ? AND at > ?").bind(ip, now - HOUR_MS).first<{ n: number }>();
    if ((hits?.n ?? 0) >= HOURLY_LIMIT) throw new HttpError(429, "提交得太频繁了，过一个小时再试试");
    await db.batch([
      db.prepare("INSERT INTO application_hits (ip, at) VALUES (?, ?)").bind(ip, now),
      db.prepare("DELETE FROM application_hits WHERE at < ?").bind(now - HOUR_MS),
    ]);

    const raw = await c.body<Record<string, unknown>>();
    // 蜜罐有值：多半是机器人。假装收到了，但不入库
    if (raw && typeof raw === "object" && raw.website) return json({ ok: true, updated: false });
    const parsed = Submit.safeParse(raw);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "报名表填得不对");
    const b = parsed.data;

    const row = await db
      .prepare(
        `INSERT INTO applications (id, student_id, name, class_name, phone, qq, q1, q2, q3, q4, q5, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(student_id) DO UPDATE SET
           name = excluded.name, class_name = excluded.class_name, phone = excluded.phone, qq = excluded.qq,
           q1 = excluded.q1, q2 = excluded.q2, q3 = excluded.q3, q4 = excluded.q4, q5 = excluded.q5,
           submit_count = applications.submit_count + 1,
           updated_at = excluded.updated_at,
           status = CASE applications.status WHEN 'rejected' THEN 'new' ELSE applications.status END
         RETURNING submit_count`,
      )
      .bind(crypto.randomUUID(), b.studentId, b.name, b.className, b.phone, b.qq, b.q1, blank(b.q2), blank(b.q3), blank(b.q4), blank(b.q5), now, now)
      .first<{ submit_count: number }>();
    const updated = (row?.submit_count ?? 1) > 1;

    if (!updated) {
      // 通知里不带手机号和 QQ
      await enqueue(c.env, {
        kind: "application",
        title: `新的报名：${b.name} · ${b.className}`,
        body: b.q1.slice(0, 50),
        link: adminLink(c.env, "/admin/applications"),
      });
      await flush(c.env, { force: false }).catch(() => {});
    }
    return json({ ok: true, updated });
  });

  // ---------- 管理员 ----------

  api.get("/api/admin/applications", async (c) => {
    requireAdmin(c);
    const db = c.env.DB;
    const status = z.enum(APPLICATION_STATUSES).optional().catch(undefined).parse(c.url.searchParams.get("status") || undefined);
    const q = (c.url.searchParams.get("q") ?? "").trim().slice(0, 40);
    const where: string[] = [];
    const binds: unknown[] = [];
    if (status) {
      where.push("status = ?");
      binds.push(status);
    }
    if (q) {
      const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
      where.push("(name LIKE ? ESCAPE '\\' OR student_id LIKE ? ESCAPE '\\' OR class_name LIKE ? ESCAPE '\\')");
      binds.push(like, like, like);
    }
    const [rows, counts, settings] = await Promise.all([
      db
        .prepare(`SELECT * FROM applications ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT 1000`)
        .bind(...binds)
        .all<Row>(),
      db.prepare("SELECT status, COUNT(*) AS n FROM applications GROUP BY status").all<{ status: string; n: number }>(),
      loadSettings(db),
    ]);
    const byStatus: Record<string, number> = { all: 0 };
    for (const s of APPLICATION_STATUSES) byStatus[s] = 0;
    for (const r of counts.results) {
      byStatus[r.status] = r.n;
      byStatus.all += r.n;
    }
    return json({ items: rows.results.map(summary), counts: byStatus, settings });
  });

  api.get("/api/admin/applications.csv", async (c) => {
    requireAdmin(c);
    const rows = await c.env.DB.prepare("SELECT * FROM applications ORDER BY created_at").all<Row>();
    return new Response(applicationsCsv(rows.results), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`新生报名_${cnDate(Date.now())}.csv`)}`,
      },
    });
  });

  api.put("/api/admin/applications/settings", async (c) => {
    requireAdmin(c);
    const b = Settings.parse(await c.body());
    await setSetting(c.env.DB, OPEN_KEY, b.open ? "1" : "0");
    if (b.message !== undefined) await setSetting(c.env.DB, MESSAGE_KEY, b.message);
    return json(await loadSettings(c.env.DB));
  });

  api.get("/api/admin/applications/:id", async (c) => {
    requireAdmin(c);
    return json(await detail(c.env.DB, await findRow(c.env.DB, c.params.id)));
  });

  api.patch("/api/admin/applications/:id", async (c) => {
    const { userId } = requireAdmin(c);
    const db = c.env.DB;
    const b = Patch.parse(await c.body());
    const row = await findRow(db, c.params.id);
    const status = b.status ?? row.status;
    const note = b.adminNote === undefined ? row.admin_note : b.adminNote || null;
    await db
      .prepare("UPDATE applications SET status = ?, admin_note = ?, handled_by = ?, handled_at = ? WHERE id = ?")
      .bind(status, note, userId, Date.now(), row.id)
      .run();
    return json(await detail(db, await findRow(db, row.id)));
  });

  api.delete("/api/admin/applications/:id", async (c) => {
    requireAdmin(c);
    const res = await c.env.DB.prepare("DELETE FROM applications WHERE id = ?").bind(c.params.id).run();
    if (!res.meta.changes) throw new HttpError(404, "没有这条报名");
    return json({ ok: true });
  });
}

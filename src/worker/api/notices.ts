import { z } from "zod";
import { decodeBase64, sniffImage } from "../files";
import { HttpError, type Router, json } from "../http";
import { enqueue } from "../notify";
import { memberId, requireAdmin, seesNames, viewerId } from "./common";

/**
 * 公告栏与比赛卡（技术方案“交流”一节）。
 * 公告：标题、正文、发布人、时间。比赛卡另有官方文档链接、群号、截止日期、性质标签，以及“我要参加 / 组队”。
 */

interface NoticeRow {
  id: string;
  kind: "notice" | "competition";
  title: string;
  body: string;
  doc_url: string | null;
  group_info: string | null;
  deadline: string | null;
  tags: string | null;
  pinned: number;
  author_id: string | null;
  created_at: number;
  updated_at: number;
  author_name: string | null;
}

const MAX_IMAGE_BYTES = 3_000_000;

const NoticeInput = z.object({
  kind: z.enum(["notice", "competition"]),
  title: z.string().trim().min(1, "标题不能为空").max(80),
  body: z.string().trim().max(4000).default(""),
  docUrl: z.string().trim().url("官方文档链接格式不对").max(400).optional().or(z.literal("")),
  groupInfo: z.string().trim().max(200).optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "截止日期格式是 2026-11-30").optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(12)).max(6).default([]),
  pinned: z.boolean().default(false),
});

function shape(
  r: NoticeRow,
  entries: { notice_id: string; name: string; team: string | null; contact: string | null; user_id: string }[],
  uid: string | null,
  confirmed: Set<string>,
  names: boolean,
) {
  const mine = entries.filter((e) => e.notice_id === r.id);
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body,
    docUrl: r.doc_url,
    groupInfo: r.group_info,
    deadline: r.deadline,
    tags: r.tags ? (JSON.parse(r.tags) as string[]) : [],
    pinned: r.pinned === 1,
    // 游客和校外账号看不到发布人和报名名单（都是真名，名单里还有联系方式），只看到报名人数；校外账号能看到自己报的那一条
    author: names ? r.author_name : null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    entries: r.kind === "competition" && uid ? mine.filter((e) => names || e.user_id === uid).map((e) => ({ name: e.name, team: e.team, contact: e.contact })) : [],
    entryCount: r.kind === "competition" ? mine.length : 0,
    joined: uid ? mine.some((e) => e.user_id === uid) : false,
    confirmed: uid ? confirmed.has(r.id) : false,
  };
}

async function list(db: D1Database, uid: string | null, names: boolean, limit = 50) {
  const [rows, entries, reads] = await Promise.all([
    db
      .prepare(
        `SELECT n.*, u.name AS author_name FROM notices n LEFT JOIN users u ON u.id = n.author_id
         WHERE n.deleted_at IS NULL ORDER BY n.pinned DESC, n.created_at DESC LIMIT ?`,
      )
      .bind(limit)
      .all<NoticeRow>(),
    db
      .prepare("SELECT e.notice_id, e.user_id, e.team, e.contact, u.name FROM competition_entries e JOIN users u ON u.id = e.user_id ORDER BY e.created_at")
      .all<{ notice_id: string; user_id: string; team: string | null; contact: string | null; name: string }>(),
    uid
      ? db.prepare("SELECT notice_id FROM notice_reads WHERE user_id = ?").bind(uid).all<{ notice_id: string }>()
      : Promise.resolve({ results: [] as { notice_id: string }[] }),
  ]);
  const confirmed = new Set(reads.results.map((r) => r.notice_id));
  return rows.results.map((r) => shape(r, entries.results, uid, confirmed, names));
}

export function noticeRoutes(api: Router) {
  /** 公告和比赛。游客也能看。 */
  api.get("/api/notices", async (c) => json(await list(c.env.DB, viewerId(c), seesNames(c))));

  /** 确认已阅读公告（登录后弹窗里的“我已阅读”）。重复确认无影响。 */
  api.post("/api/notices/:id/confirm", async (c) => {
    const uid = memberId(c);
    const n = await c.env.DB.prepare("SELECT id FROM notices WHERE id = ? AND deleted_at IS NULL").bind(c.params.id).first();
    if (!n) throw new HttpError(404, "没有这条公告");
    await c.env.DB.prepare("INSERT OR IGNORE INTO notice_reads (notice_id, user_id, confirmed_at) VALUES (?, ?, ?)").bind(c.params.id, uid, Date.now()).run();
    return json({ ok: true });
  });

  /** 我要参加 / 组队：team 留空表示个人报名；再次提交会更新队名和联系方式。 */
  api.put("/api/notices/:id/entry", async (c) => {
    const uid = memberId(c);
    const body = z.object({ team: z.string().trim().max(30).optional(), contact: z.string().trim().max(60).optional() }).parse(await c.body());
    const n = await c.env.DB.prepare("SELECT kind FROM notices WHERE id = ? AND deleted_at IS NULL").bind(c.params.id).first<{ kind: string }>();
    if (!n || n.kind !== "competition") throw new HttpError(404, "没有这个比赛");
    await c.env.DB.prepare(
      `INSERT INTO competition_entries (notice_id, user_id, team, contact, created_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(notice_id, user_id) DO UPDATE SET team = excluded.team, contact = excluded.contact`,
    )
      .bind(c.params.id, uid, body.team || null, body.contact || null, Date.now())
      .run();
    return json({ ok: true });
  });

  api.delete("/api/notices/:id/entry", async (c) => {
    await c.env.DB.prepare("DELETE FROM competition_entries WHERE notice_id = ? AND user_id = ?").bind(c.params.id, memberId(c)).run();
    return json({ ok: true });
  });

  /* ---------- 管理员 ---------- */

  /** 公告配图：存进公开的图床存储桶，返回可直接引用的地址。 */
  api.post("/api/admin/notices/image", async (c) => {
    requireAdmin(c);
    if (!c.env.IMAGES || !c.env.IMAGE_BASE_URL) throw new HttpError(400, "图床未配置：需要绑定 IMAGES 存储桶并设置 IMAGE_BASE_URL");
    const { data } = z.object({ data: z.string().min(1) }).parse(await c.body());
    let bytes: Uint8Array;
    try {
      bytes = decodeBase64(data);
    } catch {
      throw new HttpError(400, "图片数据无效");
    }
    if (bytes.length > MAX_IMAGE_BYTES) throw new HttpError(400, "图片不能超过 3 MB");
    const mime = sniffImage(bytes);
    if (!mime) throw new HttpError(400, "仅支持 JPEG、PNG、WebP 图片");
    const ext = mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp";
    const key = `notices/${new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
    await c.env.IMAGES.put(key, bytes, { httpMetadata: { contentType: mime } });
    return json({ url: `${c.env.IMAGE_BASE_URL.replace(/\/+$/, "")}/${key}` });
  });

  api.post("/api/admin/notices", async (c) => {
    const { userId } = requireAdmin(c);
    const b = NoticeInput.parse(await c.body());
    const now = Date.now();
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO notices (id, kind, title, body, doc_url, group_info, deadline, tags, pinned, author_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, b.kind, b.title, b.body, b.docUrl || null, b.groupInfo || null, b.deadline || null, JSON.stringify(b.tags), b.pinned ? 1 : 0, userId, now, now)
      .run();
    if (b.kind === "competition") {
      await enqueue(c.env, { kind: "test", title: `新比赛：${b.title}`, body: b.deadline ? `截止 ${b.deadline}` : "在协会平台查看详情" });
    }
    return json({ ok: true, id });
  });

  api.put("/api/admin/notices/:id", async (c) => {
    requireAdmin(c);
    const b = NoticeInput.parse(await c.body());
    const res = await c.env.DB.prepare(
      `UPDATE notices SET kind = ?, title = ?, body = ?, doc_url = ?, group_info = ?, deadline = ?, tags = ?, pinned = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
    )
      .bind(b.kind, b.title, b.body, b.docUrl || null, b.groupInfo || null, b.deadline || null, JSON.stringify(b.tags), b.pinned ? 1 : 0, Date.now(), c.params.id)
      .run();
    if (!res.meta.changes) throw new HttpError(404, "没有这条公告");
    return json({ ok: true });
  });

  api.delete("/api/admin/notices/:id", async (c) => {
    requireAdmin(c);
    await c.env.DB.prepare("UPDATE notices SET deleted_at = ? WHERE id = ?").bind(Date.now(), c.params.id).run();
    return json({ ok: true });
  });
}

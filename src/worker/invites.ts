import { generatePasscode, hashPasscode } from "./passcode";

/**
 * 邀请码：管理员批量生成，每个码只能注册一个账号，可以设有效期，没用过的可以作废。
 * 码本身只在生成时返回一次；数据库里只存摘要和末 4 位（后台列表里用来辨认是哪一个）。
 */

/** “这个码现在还能用”的 SQL 条件，要绑定一个参数：当前时间（毫秒）。注册时和占用时用同一个条件。 */
export const INVITE_USABLE = "used_at IS NULL AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?)";

export const MAX_INVITES_PER_BATCH = 50;

export interface Invite {
  id: string;
  /** 注册出来的账号类型 */
  kind: "campus" | "external";
  hint: string;
  note: string | null;
  createdAt: number;
  expiresAt: number | null;
  usedAt: number | null;
  /** studentNo：校内是学号，校外是用户名 */
  usedBy: { name: string; studentNo: string } | null;
  revokedAt: number | null;
  state: "unused" | "used" | "expired" | "revoked";
}

export async function createInvites(
  db: D1Database,
  secret: string,
  input: { count: number; days: number | null; note: string | null; by: string; kind?: "campus" | "external" },
  now = Date.now(),
): Promise<{ codes: string[]; expiresAt: number | null }> {
  const expiresAt = input.days ? now + input.days * 86_400_000 : null;
  const codes: string[] = [];
  const stmts: D1PreparedStatement[] = [];
  for (let i = 0; i < input.count; i++) {
    const code = generatePasscode();
    codes.push(code);
    stmts.push(
      db
        .prepare("INSERT INTO invite_codes (id, code_hash, hint, note, created_by, created_at, expires_at, kind) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(crypto.randomUUID(), await hashPasscode(secret, code), code.slice(-4), input.note, input.by, now, expiresAt, input.kind ?? "campus"),
    );
  }
  await db.batch(stmts);
  return { codes, expiresAt };
}

export async function listInvites(db: D1Database, now = Date.now(), limit = 200): Promise<Invite[]> {
  const rows = await db
    .prepare(
      `SELECT i.id, i.kind, i.hint, i.note, i.created_at, i.expires_at, i.used_at, i.revoked_at, u.name AS used_name,
         CASE WHEN u.kind = 'external' THEN u.username ELSE u.student_no END AS used_no
       FROM invite_codes i LEFT JOIN users u ON u.id = i.used_by ORDER BY i.created_at DESC LIMIT ?`,
    )
    .bind(limit)
    .all<{
      id: string;
      kind: string;
      hint: string;
      note: string | null;
      created_at: number;
      expires_at: number | null;
      used_at: number | null;
      revoked_at: number | null;
      used_name: string | null;
      used_no: string | null;
    }>();
  return rows.results.map((r) => ({
    id: r.id,
    kind: r.kind === "external" ? "external" : "campus",
    hint: r.hint,
    note: r.note,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    usedAt: r.used_at,
    usedBy: r.used_at && r.used_name ? { name: r.used_name, studentNo: r.used_no ?? "" } : null,
    revokedAt: r.revoked_at,
    state: r.used_at ? "used" : r.revoked_at ? "revoked" : r.expires_at !== null && r.expires_at <= now ? "expired" : "unused",
  }));
}

/** 作废一个还没用过的码。返回是否真的作废了（已经用过或不存在时返回 false）。 */
export async function revokeInvite(db: D1Database, id: string, now = Date.now()): Promise<boolean> {
  const res = await db.prepare("UPDATE invite_codes SET revoked_at = ? WHERE id = ? AND used_at IS NULL AND revoked_at IS NULL").bind(now, id).run();
  return !!res.meta.changes;
}

import { addDays, cnDate } from "../shared/heatmap";
import { INVITE_USABLE } from "./invites";
import { generatePasscode, hashPasscode } from "./passcode";
import { safeEqual } from "./session";
import { hashPassword, passwordProblem, verifyPassword } from "./password";

/**
 * 账号分两种：
 *  - 校内（campus）：学号 + 真名 + 密码，学号登录。能签到。
 *  - 校外（external）：用户名 + 昵称 + 密码，邮箱和学校 / 单位选填，用户名或邮箱登录。
 *    不能签到，也看不到成员真名（“谁也在学”、报名名单），能报名比赛，能被设为管理员。
 *    邮箱暂时不验证（还没有发信服务），只用来登录。
 *  - 注册：必须有管理员生成的邀请码（一次性），邀请码决定注册出来是哪种账号；管理员还能在设置里整个关掉注册。
 *    第一个管理员例外，见 FIRST_ADMIN_STUDENT_NO。
 *  - 忘记密码：管理员生成一个一次性的“重置码”，在登录页用账号（学号 / 用户名 / 邮箱）+ 重置码设新密码。
 *    重置码和邀请码都只在生成时显示一次，数据库里只存摘要。
 * 管理员（会长、老师）就是 role = 'admin' 的普通账号，没有单独的后台密码。
 */

export type AccountKind = "campus" | "external";

/** 学号：9 位数字（注册时检查；登录不检查格式，兼容之前录入的账号）。 */
export const STUDENT_NO_RE = /^\d{9}$/;

/** 校外账号的用户名：3–20 位，小写字母开头，只有小写字母、数字、下划线、连字符（不能全是数字，免得和学号混淆）。 */
export const USERNAME_RE = /^[a-z][a-z0-9_-]{2,19}$/;
export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;

/** 校外账号在 student_no 列里的占位（这一列 NOT NULL UNIQUE），不对外显示 */
export const externalStudentNo = (id: string) => `ext:${id}`;

/** 登录、重置时填的“账号”：含 @ 是邮箱，全是数字是学号，其余是用户名 */
export function accountLookup(account: string): { sql: string; value: string } {
  const a = account.trim();
  if (a.includes("@")) return { sql: "email = ?", value: a.toLowerCase() };
  if (/^\d+$/.test(a)) return { sql: "student_no = ? AND kind = 'campus'", value: a };
  return { sql: "username = ?", value: a.toLowerCase() };
}

/**
 * 第一个管理员的学号。系统里还没有任何管理员时，这个学号可以用环境变量 FIRST_ADMIN_CODE（密钥）
 * 代替邀请码注册，注册后直接是管理员；有了管理员之后就和普通学号一样。
 * 学号本身不是秘密，所以必须同时知道密钥，避免部署后被人抢先注册。
 * 数据库迁移 v5 也会把已经存在的这个学号设为管理员。
 */
export const FIRST_ADMIN_STUDENT_NO = "254030411";

export interface Member {
  id: string;
  kind: AccountKind;
  /** 校外账号是空字符串 */
  studentNo: string;
  username: string | null;
  email: string | null;
  org: string | null;
  name: string;
  className: string | null;
  status: "active" | "archived";
  role: "member" | "admin";
  hasPassword: boolean; // 已经设置了密码（之前导入、还没激活过的旧账号没有）
  lastActiveDay: string | null; // 最近一次站内学习记录或外部平台有活动的日期
}

/** 账号操作的错误：status 是要返回的 HTTP 状态码，badCode 表示邀请码或重置码不对（要计入试错次数）。 */
export class AccountError extends Error {
  constructor(
    public status: number,
    message: string,
    public badCode = false,
  ) {
    super(message);
  }
}

/**
 * 检查一段要显示出来的短文字（姓名、显示名）：去掉首尾空格后 1–max 个字符（按 Unicode 字符数，不按字节），
 * 不能全是空白，不能含控制字符和看不见的格式字符（零宽空格、文字方向控制等）。
 * 合格返回整理后的文字，否则返回错误说明。
 */
export function cleanShortText(input: string, max: number, label: string): { value: string } | { error: string } {
  const v = input.trim();
  if (!v) return { error: `${label}不能为空` };
  // 允许 U+200D（emoji 组合用的零宽连接符），其余格式字符一律拒绝
  if (/[\p{Cc}\p{Zl}\p{Zp}]|(?!\u200d)\p{Cf}/u.test(v)) return { error: `${label}里有不能显示的字符` };
  if (Array.from(v).length > max) return { error: `${label}最多 ${max} 个字` };
  return { value: v };
}

async function hasAdmin(db: D1Database): Promise<boolean> {
  return !!(await db.prepare("SELECT 1 AS x FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1").first());
}

/** 登录成功后要用到的账号信息（session_version 用来签发令牌）。 */
export interface AccountRow {
  id: string;
  student_no: string;
  name: string;
  display_name: string | null;
  class_name: string | null;
  role: "member" | "admin";
  session_version: number;
  kind: AccountKind;
  username: string | null;
  email: string | null;
  org: string | null;
}

/** 读 AccountRow 用的列 */
export const ACCOUNT_COLS = "id, student_no, name, display_name, class_name, role, session_version, kind, username, email, org";

type RawAccount = Omit<AccountRow, "role" | "kind"> & { role: string; kind: string };
export function toAccount(r: RawAccount): AccountRow {
  return { ...r, role: r.role === "admin" ? "admin" : "member", kind: r.kind === "external" ? "external" : "campus" };
}

/** 账号名：校内是学号，校外是用户名（改密码时“不能和账号一样”、后台显示都用它） */
export function accountName(r: { kind: string; student_no: string; username: string | null }): string {
  return r.kind === "external" ? (r.username ?? "") : r.student_no;
}

export interface RegisterInput {
  /** 默认 campus */
  kind?: AccountKind;
  /** 校内必填 */
  studentNo?: string;
  /** 校外必填 */
  username?: string;
  email?: string;
  org?: string;
  /** 校内是真名，校外是昵称 */
  name: string;
  className?: string;
  password: string;
  confirm: string;
  invite?: string;
}

/** 邀请码对不上账号类型时，给出明确提示（不计入试错：码本身是对的） */
async function inviteKindMismatch(db: D1Database, codeHash: string, kind: AccountKind, now: number): Promise<boolean> {
  const row = await db.prepare(`SELECT kind FROM invite_codes WHERE code_hash = ? AND ${INVITE_USABLE}`).bind(codeHash, now).first<{ kind: string }>();
  return !!row && row.kind !== kind;
}

/**
 * 注册。邀请码的检查和占用放在同一个事务里：两个人同时用同一个码，只有一个能成功。
 * 之前由会长导入、但从没激活过的学号（没有密码）可以用邀请码认领，原来的记录保留。
 */
export async function register(
  db: D1Database,
  secret: string,
  input: RegisterInput,
  opts: { open: boolean; firstAdminCode?: string },
  now = Date.now(),
): Promise<AccountRow> {
  const kind: AccountKind = input.kind === "external" ? "external" : "campus";
  return kind === "external" ? registerExternal(db, secret, input, opts, now) : registerCampus(db, secret, input, opts, now);
}

async function readAccount(db: D1Database, id: string): Promise<AccountRow> {
  const row = await db.prepare(`SELECT ${ACCOUNT_COLS} FROM users WHERE id = ?`).bind(id).first<RawAccount>();
  if (!row) throw new Error("注册后读不到账号");
  return toAccount(row);
}

async function registerCampus(db: D1Database, secret: string, input: RegisterInput, opts: { open: boolean; firstAdminCode?: string }, now: number): Promise<AccountRow> {
  const studentNo = (input.studentNo ?? "").trim();
  if (!STUDENT_NO_RE.test(studentNo)) throw new AccountError(400, "学号是 9 位数字");
  const name = cleanShortText(input.name, 20, "姓名");
  if ("error" in name) throw new AccountError(400, name.error);
  let className: string | null = null;
  if (input.className?.trim()) {
    const c = cleanShortText(input.className, 30, "班级");
    if ("error" in c) throw new AccountError(400, c.error);
    className = c.value;
  }
  if (input.password !== input.confirm) throw new AccountError(400, "两次输入的密码不一样");
  const problem = passwordProblem(input.password, studentNo);
  if (problem) throw new AccountError(400, problem);

  const existing = await db
    .prepare("SELECT id, status, password_hash FROM users WHERE student_no = ?")
    .bind(studentNo)
    .first<{ id: string; status: string; password_hash: string | null }>();
  if (existing?.status === "archived") throw new AccountError(403, "这个学号的账号已停用，请联系管理员");
  if (existing?.password_hash) throw new AccountError(409, "这个学号已经注册过了，直接登录就行。忘了密码请找管理员要重置码");

  const code = input.invite?.trim() ?? "";
  const firstAdminCode = opts.firstAdminCode?.trim();
  const bootstrap =
    studentNo === FIRST_ADMIN_STUDENT_NO && !!firstAdminCode && !!code && (await safeEqual(secret, code, firstAdminCode)) && !(await hasAdmin(db));
  if (!bootstrap && !opts.open) throw new AccountError(403, "现在没有开放注册，请联系管理员");
  if (!bootstrap && !code) throw new AccountError(400, "注册需要邀请码，请向管理员要一个");

  const id = existing?.id ?? crypto.randomUUID();
  const hash = await hashPassword(input.password);

  try {
    if (bootstrap) {
      await (existing
        ? db
            .prepare("UPDATE users SET name = ?, class_name = COALESCE(?, class_name), password_hash = ?, password_set_at = ?, passcode_hash = NULL, role = 'admin', updated_at = ? WHERE id = ?")
            .bind(name.value, className, hash, now, now, id)
        : db
            .prepare("INSERT INTO users (id, student_no, name, class_name, password_hash, password_set_at, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'admin', 'active', ?, ?)")
            .bind(id, studentNo, name.value, className, hash, now, now, now)
      ).run();
    } else {
      const codeHash = await hashPasscode(secret, code);
      const usable = `EXISTS (SELECT 1 FROM invite_codes WHERE code_hash = ? AND kind = 'campus' AND ${INVITE_USABLE})`;
      const write = existing
        ? db
            .prepare(
              `UPDATE users SET name = ?, class_name = COALESCE(?, class_name), password_hash = ?, password_set_at = ?, passcode_hash = NULL, updated_at = ?
               WHERE id = ? AND password_hash IS NULL AND ${usable}`,
            )
            .bind(name.value, className, hash, now, now, id, codeHash, now)
        : db
            .prepare(
              `INSERT INTO users (id, student_no, name, class_name, password_hash, password_set_at, role, status, created_at, updated_at)
               SELECT ?, ?, ?, ?, ?, ?, 'member', 'active', ?, ? WHERE ${usable}`,
            )
            .bind(id, studentNo, name.value, className, hash, now, now, now, codeHash, now);
      const use = db.prepare(`UPDATE invite_codes SET used_by = ?, used_at = ? WHERE code_hash = ? AND kind = 'campus' AND ${INVITE_USABLE}`).bind(id, now, codeHash, now);
      const [r] = await db.batch([write, use]);
      if (!r.meta.changes) {
        if (await inviteKindMismatch(db, codeHash, "campus", now)) throw new AccountError(400, "这个邀请码是注册校外账号用的，请选“校外”");
        throw new AccountError(400, "邀请码不对、已经用过或者过期了", true);
      }
    }
  } catch (err) {
    if (err instanceof AccountError) throw err;
    // 同一个学号几乎同时注册两次：第二次撞上唯一约束
    if (String(err).includes("UNIQUE")) throw new AccountError(409, "这个学号已经注册过了，直接登录就行");
    throw err;
  }
  return readAccount(db, id);
}

async function registerExternal(db: D1Database, secret: string, input: RegisterInput, opts: { open: boolean }, now: number): Promise<AccountRow> {
  const username = (input.username ?? "").trim().toLowerCase();
  if (!USERNAME_RE.test(username)) throw new AccountError(400, "用户名 3–20 位，小写字母开头，只能用小写字母、数字、下划线和连字符");
  const email = input.email?.trim() ? input.email.trim().toLowerCase() : null;
  if (email && (email.length > 100 || !EMAIL_RE.test(email))) throw new AccountError(400, "邮箱格式不对");
  const name = cleanShortText(input.name, 20, "昵称");
  if ("error" in name) throw new AccountError(400, name.error);
  let org: string | null = null;
  if (input.org?.trim()) {
    const o = cleanShortText(input.org, 40, "学校 / 单位");
    if ("error" in o) throw new AccountError(400, o.error);
    org = o.value;
  }
  if (input.password !== input.confirm) throw new AccountError(400, "两次输入的密码不一样");
  const problem = passwordProblem(input.password, username, "用户名");
  if (problem) throw new AccountError(400, problem);
  if (email && input.password.toLowerCase() === email) throw new AccountError(400, "密码不能和邮箱一样");

  if (await db.prepare("SELECT 1 AS x FROM users WHERE username = ?").bind(username).first()) throw new AccountError(409, "这个用户名已经有人用了，换一个");
  if (email && (await db.prepare("SELECT 1 AS x FROM users WHERE email = ?").bind(email).first())) throw new AccountError(409, "这个邮箱已经注册过了，直接登录就行");

  if (!opts.open) throw new AccountError(403, "现在没有开放注册，请联系管理员");
  const code = input.invite?.trim() ?? "";
  if (!code) throw new AccountError(400, "注册需要邀请码，请向管理员要一个");

  const id = crypto.randomUUID();
  const codeHash = await hashPasscode(secret, code);
  const usable = `EXISTS (SELECT 1 FROM invite_codes WHERE code_hash = ? AND kind = 'external' AND ${INVITE_USABLE})`;
  try {
    const write = db
      .prepare(
        `INSERT INTO users (id, student_no, kind, username, email, org, name, password_hash, password_set_at, role, status, created_at, updated_at)
         SELECT ?, ?, 'external', ?, ?, ?, ?, ?, ?, 'member', 'active', ?, ? WHERE ${usable}`,
      )
      .bind(id, externalStudentNo(id), username, email, org, name.value, await hashPassword(input.password), now, now, now, codeHash, now);
    const use = db.prepare(`UPDATE invite_codes SET used_by = ?, used_at = ? WHERE code_hash = ? AND kind = 'external' AND ${INVITE_USABLE}`).bind(id, now, codeHash, now);
    const [r] = await db.batch([write, use]);
    if (!r.meta.changes) {
      if (await inviteKindMismatch(db, codeHash, "external", now)) throw new AccountError(400, "这个邀请码是注册校内账号用的，请选“校内”");
      throw new AccountError(400, "邀请码不对、已经用过或者过期了", true);
    }
  } catch (err) {
    if (err instanceof AccountError) throw err;
    if (String(err).includes("UNIQUE")) throw new AccountError(409, "这个用户名或邮箱已经注册过了");
    throw err;
  }
  return readAccount(db, id);
}

/** 用管理员给的重置码设新密码（忘记密码；也用于之前导入、拿着旧口令还没激活的账号）。 */
export async function resetWithCode(
  db: D1Database,
  secret: string,
  input: { account: string; code: string; password: string; confirm: string },
  now = Date.now(),
): Promise<AccountRow> {
  const q = accountLookup(input.account);
  const row = await db
    .prepare(`SELECT ${ACCOUNT_COLS}, passcode_hash FROM users WHERE ${q.sql} AND status = 'active'`)
    .bind(q.value)
    .first<RawAccount & { passcode_hash: string | null }>();
  const codeHash = await hashPasscode(secret, input.code);
  if (!row?.passcode_hash || row.passcode_hash !== codeHash) throw new AccountError(400, "账号或重置码不对。重置码只能用一次，可以找管理员重新生成", true);
  if (input.password !== input.confirm) throw new AccountError(400, "两次输入的密码不一样");
  const problem = passwordProblem(input.password, accountName(row), row.kind === "external" ? "用户名" : "学号");
  if (problem) throw new AccountError(400, problem);
  const res = await db
    .prepare(
      "UPDATE users SET password_hash = ?, password_set_at = ?, passcode_hash = NULL, session_version = session_version + 1, updated_at = ? WHERE id = ? AND passcode_hash = ? AND status = 'active'",
    )
    .bind(await hashPassword(input.password), now, now, row.id, codeHash)
    .run();
  if (!res.meta.changes) throw new AccountError(400, "重置码已经用过了", true);
  const { passcode_hash: _, ...account } = row;
  return toAccount({ ...account, session_version: row.session_version + 1 });
}

/**
 * 管理员给成员生成重置码（忘记密码时用）。旧密码马上失效，已登录的设备也全部退出。
 * 重置码只返回这一次。
 */
export async function createResetCode(db: D1Database, secret: string, userId: string, now = Date.now()): Promise<string | null> {
  const code = generatePasscode();
  const res = await db
    .prepare(
      "UPDATE users SET passcode_hash = ?, password_hash = NULL, password_set_at = NULL, session_version = session_version + 1, updated_at = ? WHERE id = ? AND status = 'active'",
    )
    .bind(await hashPasscode(secret, code), now, userId)
    .run();
  return res.meta.changes ? code : null;
}

/** 设为管理员（会长、老师）或改回普通成员。 */
export async function setMemberRole(db: D1Database, userId: string, role: "member" | "admin", now = Date.now()) {
  const res = await db.prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?").bind(role, now, userId).run();
  return !!res.meta.changes;
}

/** 停用后不能登录，也不再同步外部平台；数据保留，可以恢复。 */
export async function setMemberStatus(db: D1Database, userId: string, status: "active" | "archived", now = Date.now()) {
  await db.prepare("UPDATE users SET status = ?, updated_at = ? WHERE id = ?").bind(status, now, userId).run();
}

/** 登录：account 是学号、用户名或邮箱（见 accountLookup）。 */
export async function findByAccountAndPassword(db: D1Database, login: string, password: string): Promise<AccountRow | null> {
  const q = accountLookup(login);
  const row = await db
    .prepare(`SELECT ${ACCOUNT_COLS}, password_hash FROM users WHERE ${q.sql} AND status = 'active'`)
    .bind(q.value)
    .first<RawAccount & { password_hash: string | null }>();
  // 账号不存在时也做一次同样耗时的计算，避免从响应时间猜出哪些账号存在
  const ok = await verifyPassword(password, row?.password_hash ?? "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
  if (!row || !ok) return null;
  const { password_hash: _, ...account } = row;
  return toAccount(account);
}

/* ---------- 显示名与上次访问（首页欢迎语用） ---------- */

export const DISPLAY_NAME_MAX = 20;

/** 显示名：空字符串表示恢复为真名（返回 null）；其余规则同 cleanShortText，最多 20 个字。 */
export function normalizeDisplayName(input: string): { value: string | null } | { error: string } {
  if (input === "") return { value: null };
  if (!input.trim()) return { error: "显示名不能全是空白" };
  return cleanShortText(input, DISPLAY_NAME_MAX, "显示名");
}

/** 只改自己的显示名；真名 name 不动。value 为 null 时恢复为真名。 */
export async function setDisplayName(db: D1Database, userId: string, value: string | null, now = Date.now()) {
  await db.prepare("UPDATE users SET display_name = ?, updated_at = ? WHERE id = ? AND status = 'active'").bind(value, now, userId).run();
}

/** 距上次写入不足这么久就不重复写库 */
export const SEEN_THROTTLE_MS = 3_600_000;

/**
 * 记一次访问：先读出旧的 last_seen_at 返回（前端据此判断“初来”“久别”），再更新。
 * 节流：上次写入不到 1 小时就不写。
 */
export async function touchLastSeen(db: D1Database, userId: string, now = Date.now()): Promise<number | null> {
  const row = await db.prepare("SELECT last_seen_at FROM users WHERE id = ? AND status = 'active'").bind(userId).first<{ last_seen_at: number | null }>();
  const prev = row?.last_seen_at ?? null;
  if (prev === null || now - prev >= SEEN_THROTTLE_MS) {
    await db.prepare("UPDATE users SET last_seen_at = ? WHERE id = ? AND status = 'active' AND (last_seen_at IS NULL OR last_seen_at <= ?)").bind(now, userId, now - SEEN_THROTTLE_MS).run();
  }
  return prev;
}

/**
 * 修改自己的密码：要先输当前密码。改完后其他设备上的登录全部失效（当前设备由接口重新签发）。
 */
export async function setOwnPassword(
  db: D1Database,
  input: { userId: string; password: string; confirm: string; current?: string },
  now = Date.now(),
) {
  const row = await db
    .prepare("SELECT student_no, kind, username, password_hash FROM users WHERE id = ? AND status = 'active'")
    .bind(input.userId)
    .first<{ student_no: string; kind: string; username: string | null; password_hash: string | null }>();
  if (!row) throw new AccountError(404, "账号不存在或已停用");
  if (!(await verifyPassword(input.current ?? "", row.password_hash))) throw new AccountError(400, "当前密码不对");
  if (input.password !== input.confirm) throw new AccountError(400, "两次输入的新密码不一样");
  const problem = passwordProblem(input.password, accountName(row), row.kind === "external" ? "用户名" : "学号");
  if (problem) throw new AccountError(400, problem);
  await db
    .prepare(
      "UPDATE users SET password_hash = ?, password_set_at = ?, passcode_hash = NULL, session_version = session_version + 1, updated_at = ? WHERE id = ? AND status = 'active'",
    )
    .bind(await hashPassword(input.password), now, now, input.userId)
    .run();
  const v = await db.prepare("SELECT session_version FROM users WHERE id = ?").bind(input.userId).first<{ session_version: number }>();
  return v?.session_version ?? 0;
}

export async function listMembers(db: D1Database): Promise<Member[]> {
  const rows = await db
    .prepare(
      `SELECT u.id, u.kind, u.student_no, u.username, u.email, u.org, u.name, u.class_name, u.status, u.role, u.password_hash IS NOT NULL AS has_password,
         MAX(COALESCE((SELECT MAX(day) FROM activity_events a WHERE a.user_id = u.id), ''),
             COALESCE((SELECT MAX(day) FROM external_daily e WHERE e.user_id = u.id), '')) AS last_day
       FROM users u ORDER BY u.status, u.kind, u.student_no, u.username`,
    )
    .all<{
      id: string;
      kind: string;
      student_no: string;
      username: string | null;
      email: string | null;
      org: string | null;
      name: string;
      class_name: string | null;
      status: "active" | "archived";
      role: string;
      has_password: number;
      last_day: string;
    }>();
  return rows.results.map((r) => ({
    id: r.id,
    kind: r.kind === "external" ? "external" : "campus",
    studentNo: r.kind === "external" ? "" : r.student_no,
    username: r.username,
    email: r.email,
    org: r.org,
    name: r.name,
    className: r.class_name,
    status: r.status,
    role: r.role === "admin" ? "admin" : "member",
    hasPassword: r.has_password === 1,
    lastActiveDay: r.last_day || null,
  }));
}

/** 会长后台的“最近没动静”名单：在籍的校内成员里，最近 n 天站内和外部平台都没有记录的人（校外账号不管）。 */
export function idleMembers(members: Member[], n: number, today = cnDate(Date.now())): Member[] {
  const from = addDays(today, -(n - 1));
  return members.filter((m) => m.status === "active" && m.kind === "campus" && m.role !== "admin" && (!m.lastActiveDay || m.lastActiveDay < from));
}

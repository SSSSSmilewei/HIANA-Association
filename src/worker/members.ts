import { addDays, cnDate } from "../shared/heatmap";
import { generatePasscode, hashPasscode } from "./passcode";
import { hashPassword, passwordProblem, verifyPassword } from "./password";

/**
 * 成员管理：会长批量导入（学号、姓名、班级），每人生成一个激活口令。
 * 成员第一次用口令登录后自己设置密码，口令随即作废；以后用学号 + 密码登录。
 * 忘了密码：会长“重置”，生成新口令、旧密码作废，成员重新激活。
 * 口令只在生成时返回一次，数据库里只存摘要。
 */

export interface MemberInput {
  studentNo: string;
  name: string;
  className?: string;
}

export interface Member {
  id: string;
  studentNo: string;
  name: string;
  className: string | null;
  status: "active" | "archived";
  hasPassword: boolean; // 已经激活并设置了自己的密码
  lastActiveDay: string | null; // 最近一次站内学习记录或外部平台有活动的日期
}

/**
 * 从粘贴的文字解析名单：每行“学号 姓名 班级”，用空格、逗号或制表符分隔，班级可省略。
 * 直接从 Excel 复制几列粘贴进来就行。
 */
export function parseRoster(text: string): { rows: MemberInput[]; errors: string[] } {
  const rows: MemberInput[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  text.split(/\r?\n/).forEach((line, i) => {
    const t = line.trim();
    if (!t) return;
    const [studentNo, name, className] = t.split(/[\t,，\s]+/);
    if (/^学号$/.test(studentNo)) return; // 表头
    if (!/^[A-Za-z0-9]{4,20}$/.test(studentNo ?? "")) return errors.push(`第 ${i + 1} 行：学号“${studentNo ?? ""}”格式不对`);
    if (!name || name.length > 20) return errors.push(`第 ${i + 1} 行：缺少姓名`);
    if (seen.has(studentNo)) return errors.push(`第 ${i + 1} 行：学号 ${studentNo} 重复`);
    seen.add(studentNo);
    rows.push({ studentNo, name, className: className?.slice(0, 30) || undefined });
  });
  return { rows, errors };
}

/** 导入名单。已存在的学号只更新姓名和班级，不改口令；新成员生成口令。 */
export async function importMembers(
  db: D1Database,
  secret: string,
  rows: MemberInput[],
  now = Date.now(),
): Promise<{ created: { studentNo: string; name: string; passcode: string }[]; updated: number }> {
  const created: { studentNo: string; name: string; passcode: string }[] = [];
  let updated = 0;
  for (const r of rows) {
    const existing = await db.prepare("SELECT id FROM users WHERE student_no = ?").bind(r.studentNo).first<{ id: string }>();
    if (existing) {
      await db
        .prepare("UPDATE users SET name = ?, class_name = ?, status = 'active', updated_at = ? WHERE id = ?")
        .bind(r.name, r.className ?? null, now, existing.id)
        .run();
      updated++;
      continue;
    }
    const passcode = generatePasscode();
    await db
      .prepare("INSERT INTO users (id, student_no, name, class_name, passcode_hash, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)")
      .bind(crypto.randomUUID(), r.studentNo, r.name, r.className ?? null, await hashPasscode(secret, passcode), now, now)
      .run();
    created.push({ studentNo: r.studentNo, name: r.name, passcode });
  }
  return { created, updated };
}

/** 重置：生成新的激活口令，旧密码作废（用于忘记密码）。 */
export async function resetPasscode(db: D1Database, secret: string, userId: string, now = Date.now()): Promise<string | null> {
  const passcode = generatePasscode();
  const res = await db
    .prepare("UPDATE users SET passcode_hash = ?, password_hash = NULL, password_set_at = NULL, updated_at = ? WHERE id = ?")
    .bind(await hashPasscode(secret, passcode), now, userId)
    .run();
  return res.meta.changes ? passcode : null;
}

/** 停用后不能登录，也不再同步外部平台；数据保留，可以恢复。 */
export async function setMemberStatus(db: D1Database, userId: string, status: "active" | "archived", now = Date.now()) {
  await db.prepare("UPDATE users SET status = ?, updated_at = ? WHERE id = ?").bind(status, now, userId).run();
}

export async function findByPasscode(db: D1Database, secret: string, passcode: string) {
  return db
    .prepare("SELECT id, student_no, name FROM users WHERE passcode_hash = ? AND status = 'active'")
    .bind(await hashPasscode(secret, passcode))
    .first<{ id: string; student_no: string; name: string }>();
}

export async function findByStudentNoAndPassword(db: D1Database, studentNo: string, password: string) {
  const row = await db
    .prepare("SELECT id, student_no, name, password_hash FROM users WHERE student_no = ? AND status = 'active'")
    .bind(studentNo.trim())
    .first<{ id: string; student_no: string; name: string; password_hash: string | null }>();
  // 学号不存在时也做一次同样耗时的计算，避免从响应时间猜出哪些学号存在
  const ok = await verifyPassword(password, row?.password_hash ?? "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
  return row && ok ? { id: row.id, student_no: row.student_no, name: row.name } : null;
}

export class PasswordError extends Error {}

/**
 * 设置或修改密码。已经有密码的人必须提供当前密码；刚用口令激活、还没设密码的人不用。
 * 设好后激活口令作废。
 */
export async function setOwnPassword(
  db: D1Database,
  input: { userId: string; password: string; confirm: string; current?: string },
  now = Date.now(),
) {
  const row = await db
    .prepare("SELECT student_no, password_hash FROM users WHERE id = ? AND status = 'active'")
    .bind(input.userId)
    .first<{ student_no: string; password_hash: string | null }>();
  if (!row) throw new PasswordError("账号不存在或已停用");
  if (row.password_hash && !(await verifyPassword(input.current ?? "", row.password_hash))) throw new PasswordError("当前密码不对");
  if (input.password !== input.confirm) throw new PasswordError("两次输入的新密码不一样");
  const problem = passwordProblem(input.password, row.student_no);
  if (problem) throw new PasswordError(problem);
  await db
    .prepare("UPDATE users SET password_hash = ?, password_set_at = ?, passcode_hash = NULL, updated_at = ? WHERE id = ?")
    .bind(await hashPassword(input.password), now, now, input.userId)
    .run();
}

export async function listMembers(db: D1Database): Promise<Member[]> {
  const rows = await db
    .prepare(
      `SELECT u.id, u.student_no, u.name, u.class_name, u.status, u.password_hash IS NOT NULL AS has_password,
         MAX(COALESCE((SELECT MAX(day) FROM activity_events a WHERE a.user_id = u.id), ''),
             COALESCE((SELECT MAX(day) FROM external_daily e WHERE e.user_id = u.id), '')) AS last_day
       FROM users u ORDER BY u.status, u.student_no`,
    )
    .all<{ id: string; student_no: string; name: string; class_name: string | null; status: "active" | "archived"; has_password: number; last_day: string }>();
  return rows.results.map((r) => ({
    id: r.id,
    studentNo: r.student_no,
    name: r.name,
    className: r.class_name,
    status: r.status,
    hasPassword: r.has_password === 1,
    lastActiveDay: r.last_day || null,
  }));
}

/** 会长后台的“最近没动静”名单：在籍成员里，最近 n 天站内和外部平台都没有记录的人。 */
export function idleMembers(members: Member[], n: number, today = cnDate(Date.now())): Member[] {
  const from = addDays(today, -(n - 1));
  return members.filter((m) => m.status === "active" && (!m.lastActiveDay || m.lastActiveDay < from));
}

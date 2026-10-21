import { addDays, cnDate } from "../shared/heatmap";
import { generatePasscode, hashPasscode } from "./passcode";

/**
 * 成员管理：会长批量导入（学号、姓名、班级），每人生成一个口令。
 * 口令只在生成时返回一次，数据库里只存摘要；丢了就重置。
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

export async function resetPasscode(db: D1Database, secret: string, userId: string, now = Date.now()): Promise<string | null> {
  const passcode = generatePasscode();
  const res = await db
    .prepare("UPDATE users SET passcode_hash = ?, updated_at = ? WHERE id = ?")
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

export async function listMembers(db: D1Database): Promise<Member[]> {
  const rows = await db
    .prepare(
      `SELECT u.id, u.student_no, u.name, u.class_name, u.status,
         MAX(COALESCE((SELECT MAX(day) FROM activity_events a WHERE a.user_id = u.id), ''),
             COALESCE((SELECT MAX(day) FROM external_daily e WHERE e.user_id = u.id), '')) AS last_day
       FROM users u ORDER BY u.status, u.student_no`,
    )
    .all<{ id: string; student_no: string; name: string; class_name: string | null; status: "active" | "archived"; last_day: string }>();
  return rows.results.map((r) => ({
    id: r.id,
    studentNo: r.student_no,
    name: r.name,
    className: r.class_name,
    status: r.status,
    lastActiveDay: r.last_day || null,
  }));
}

/** 会长后台的“最近没动静”名单：在籍成员里，最近 n 天站内和外部平台都没有记录的人。 */
export function idleMembers(members: Member[], n: number, today = cnDate(Date.now())): Member[] {
  const from = addDays(today, -(n - 1));
  return members.filter((m) => m.status === "active" && (!m.lastActiveDay || m.lastActiveDay < from));
}

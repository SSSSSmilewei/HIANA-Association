/**
 * 数据库结构。Worker 启动后第一次收到请求时自动建表/升级，部署时不需要另外跑迁移命令。
 * 新增结构时只在数组末尾追加一组，已经上线的组不要再改。
 *
 * 日期字段 day 一律是北京时间的 "YYYY-MM-DD"；时间字段是 Unix 毫秒。
 */
export const MIGRATIONS: string[][] = [
  [
    // 成员：学号 + 姓名 + 口令。会长用后台密码登录，不在这张表里。
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      student_no TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      class_name TEXT,
      passcode_hash TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    // 晚自习打卡：给学校看，只记每晚一次，不算连续天数
    `CREATE TABLE IF NOT EXISTS checkins (
      user_id TEXT NOT NULL,
      day TEXT NOT NULL,
      session TEXT NOT NULL DEFAULT 'evening',
      at INTEGER NOT NULL,
      ip TEXT,
      PRIMARY KEY (user_id, day, session)
    )`,
    `CREATE INDEX IF NOT EXISTS checkins_by_day ON checkins(day, session)`,
    // 站内学习记录：打卡、完成课时、提问、回答……热力图“协会平台”那一行从这里汇总
    `CREATE TABLE IF NOT EXISTS activity_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      day TEXT NOT NULL,
      kind TEXT NOT NULL,
      ref TEXT,
      at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS activity_by_user_day ON activity_events(user_id, day)`,
    // 外部平台绑定；secret_enc 是加密后的学员令牌（例如墨墨背单词）
    `CREATE TABLE IF NOT EXISTS bindings (
      user_id TEXT NOT NULL,
      source TEXT NOT NULL,
      handle TEXT NOT NULL,
      secret_enc TEXT,
      created_at INTEGER NOT NULL,
      synced_at INTEGER,
      last_error TEXT,
      PRIMARY KEY (user_id, source)
    )`,
    // 外部平台每日数据：同步时只增改不删除，只给最近几天的平台靠它攒历史
    `CREATE TABLE IF NOT EXISTS external_daily (
      user_id TEXT NOT NULL,
      source TEXT NOT NULL,
      day TEXT NOT NULL,
      count INTEGER NOT NULL,
      PRIMARY KEY (user_id, source, day)
    )`,
    // 讨论：页面上的蓝点提问（kind=pin）和置顶内容（kind=post）是同一种东西
    `CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      author_id TEXT,
      page_key TEXT,
      anchor_key TEXT,
      anchor_label TEXT,
      x_pct REAL,
      y_pct REAL,
      snippet TEXT,
      title TEXT,
      visibility TEXT NOT NULL DEFAULT 'public',
      status TEXT NOT NULL DEFAULT 'open',
      pinned_at INTEGER,
      featured_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS threads_by_page ON threads(page_key, created_at)`,
    `CREATE INDEX IF NOT EXISTS threads_pinned ON threads(pinned_at)`,
    // 讨论里的每条消息；author_kind 区分成员、会长、Agent
    `CREATE TABLE IF NOT EXISTS thread_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id TEXT NOT NULL,
      author_kind TEXT NOT NULL,
      author_id TEXT,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS thread_messages_by_thread ON thread_messages(thread_id, created_at)`,
    // Agent 每人每天的使用次数，用来限额
    `CREATE TABLE IF NOT EXISTS agent_usage (
      user_id TEXT NOT NULL,
      day TEXT NOT NULL,
      count INTEGER NOT NULL,
      PRIMARY KEY (user_id, day)
    )`,
    `CREATE TABLE IF NOT EXISTS outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      link TEXT,
      created_at INTEGER NOT NULL,
      sent_at INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS login_failures (
      ip TEXT NOT NULL,
      at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS login_failures_by_ip ON login_failures(ip, at)`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
  ],
  // v2：成员自己设置密码。口令只用来第一次激活账号；设好密码后口令作废，以后用学号 + 密码登录
  [
    `ALTER TABLE users ADD COLUMN password_hash TEXT`,
    `ALTER TABLE users ADD COLUMN password_set_at INTEGER`,
  ],
  // v3（技术方案阶段 0/1）：只做加法，main 上的旧代码照常能跑
  [
    // 会长和老师都是 users 里 role = 'admin' 的账号；ADMIN_PASSWORD 只留作首次初始化
    `ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'member'`,
    // 统一事件表加分类：attendance（签到）/ reflection（晨思夜思）/ study（站内学习）
    `ALTER TABLE activity_events ADD COLUMN category TEXT`,
    `UPDATE activity_events SET category = CASE kind WHEN 'checkin' THEN 'attendance' ELSE 'study' END WHERE category IS NULL`,
    // 签到签退：晚自习（evening）和大创场地（venue），各拍一张照片
    `CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      day TEXT NOT NULL,
      in_at INTEGER NOT NULL,
      out_at INTEGER,
      in_photo TEXT,
      out_photo TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      ip TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS attendance_by_user ON attendance(user_id, day)`,
    `CREATE INDEX IF NOT EXISTS attendance_by_day ON attendance(day, kind)`,
    // 旧的晚自习打卡记录搬进新表（没有照片，状态记为已结束）
    `INSERT OR IGNORE INTO attendance (id, user_id, kind, day, in_at, out_at, status, ip)
       SELECT 'legacy-' || user_id || '-' || day, user_id, 'evening', day, at, NULL, 'closed', ip FROM checkins`,
    // 文件：没开通 R2 时，照片直接存这张表（每张约 100 KB）
    `CREATE TABLE IF NOT EXISTS files (
      key TEXT PRIMARY KEY,
      owner_id TEXT,
      mime TEXT NOT NULL,
      size INTEGER NOT NULL,
      data BLOB,
      in_r2 INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )`,
    // 公告栏与比赛卡
    `CREATE TABLE IF NOT EXISTS notices (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      doc_url TEXT,
      group_info TEXT,
      deadline TEXT,
      tags TEXT,
      pinned INTEGER NOT NULL DEFAULT 0,
      author_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    )`,
    `CREATE INDEX IF NOT EXISTS notices_by_time ON notices(deleted_at, pinned, created_at)`,
    `CREATE TABLE IF NOT EXISTS competition_entries (
      notice_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      team TEXT,
      contact TEXT,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (notice_id, user_id)
    )`,
    // 选课 = 学习区块；课程本身放在仓库 content/courses/ 里
    `CREATE TABLE IF NOT EXISTS enrollments (
      user_id TEXT NOT NULL,
      course_slug TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      started_at INTEGER NOT NULL,
      target_day TEXT,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, course_slug)
    )`,
    `CREATE TABLE IF NOT EXISTS unit_progress (
      user_id TEXT NOT NULL,
      course_slug TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      done_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, course_slug, unit_id)
    )`,
  ],
  // v4：晨思夜思（课程表 App 的晨间 / 晚间一分钟会同步过来）。只做加法
  [
    `CREATE TABLE IF NOT EXISTS reflections (
      user_id TEXT NOT NULL,
      day TEXT NOT NULL,
      slot TEXT NOT NULL CHECK (slot IN ('morning', 'evening')),
      text TEXT NOT NULL,
      source TEXT,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, day, slot)
    )`,
  ],
];

// 每个数据库连接只迁移一次（Worker 里通常只有一个；测试里每个用例一个内存库）
const ready = new WeakMap<D1Database, Promise<void>>();

export function ensureSchema(db: D1Database): Promise<void> {
  let p = ready.get(db);
  if (!p) {
    p = migrate(db).catch((err) => {
      ready.delete(db);
      throw err;
    });
    ready.set(db, p);
  }
  return p;
}

async function migrate(db: D1Database) {
  await db
    .prepare("CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)")
    .run();
  const row = await db.prepare("SELECT MAX(version) AS v FROM _migrations").first<{ v: number | null }>();
  const current = row?.v ?? 0;
  for (let i = current; i < MIGRATIONS.length; i++) {
    const statements = MIGRATIONS[i].map((sql) => db.prepare(sql));
    statements.push(db.prepare("INSERT INTO _migrations (version, applied_at) VALUES (?, ?)").bind(i + 1, Date.now()));
    await db.batch(statements);
  }
}

export async function getSetting(db: D1Database, key: string): Promise<string | null> {
  const row = await db.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first<{ value: string }>();
  return row?.value ?? null;
}

export async function setSetting(db: D1Database, key: string, value: string) {
  await db
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(key, value)
    .run();
}

export function parseJson<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

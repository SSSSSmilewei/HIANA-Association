/**
 * 数据库结构。Worker 启动后第一次收到请求时自动建表/升级，部署时不需要另外跑迁移命令。
 * 新增结构时只在数组末尾追加一组，已经上线的组不要再改。
 *
 * 日期字段 day 一律是北京时间的 "YYYY-MM-DD"；时间字段是 Unix 毫秒。
 */
export const MIGRATIONS: string[][] = [
  [
    // 成员：学号 + 姓名 + 口令（v2 起改为自己设密码，v5 起改为邀请码注册）
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
    // 会长和老师都是 users 里 role = 'admin' 的账号
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
  // v5：账号改造 + 首页欢迎语。只做加法
  [
    // 显示名只用于首页欢迎语，为空时显示真名 name（真名成员自己不能改）
    `ALTER TABLE users ADD COLUMN display_name TEXT`,
    // 上次访问时间（毫秒），用来判断欢迎语的“初来”“久别”，最多每小时写一次
    `ALTER TABLE users ADD COLUMN last_seen_at INTEGER`,
    // 登录版本号：令牌里带着签发时的版本，和库里不一致就失效。重置密码、改密码时加 1，所有设备退出登录
    `ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0`,
    // 邀请码：注册必须用一个，一次性。passcode_hash 列从此只用作“重置码”（忘记密码）
    `CREATE TABLE IF NOT EXISTS invite_codes (
      id TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL UNIQUE,
      hint TEXT NOT NULL,
      note TEXT,
      created_by TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER,
      used_by TEXT,
      used_at INTEGER,
      revoked_at INTEGER
    )`,
    `CREATE INDEX IF NOT EXISTS invite_codes_by_time ON invite_codes(created_at)`,
    // 不再有单独的“会长”登录；第一个管理员是这个学号（和 members.ts 里的 FIRST_ADMIN_STUDENT_NO 一致）
    `UPDATE users SET role = 'admin' WHERE student_no = '254030411'`,
    `DELETE FROM settings WHERE key = 'admin_password_sha256'`,
  ],
  // v6：公告阅读确认。只做加法
  [
    `CREATE TABLE IF NOT EXISTS notice_reads (
      notice_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      confirmed_at INTEGER NOT NULL,
      PRIMARY KEY (notice_id, user_id)
    )`,
  ],
  // v7：课程包（hiana-course@1）。管理员发布的课程存整包 JSON；练手题做对的记录。只做加法
  [
    `CREATE TABLE IF NOT EXISTS course_packages (
      slug TEXT PRIMARY KEY,
      json TEXT NOT NULL,
      meta TEXT NOT NULL,
      published_by TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS practice_solved (
      user_id TEXT NOT NULL,
      course_slug TEXT NOT NULL,
      item_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      solved_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, course_slug, item_id, question_id)
    )`,
  ],
  // v8：校内 / 校外账号。只做加法
  [
    // campus = 校内（学号登录）；external = 校外（用户名或邮箱登录）。
    // 校外账号没有学号，student_no 里放 "ext:<id>" 占位（这一列 NOT NULL UNIQUE，改不了表结构），界面上不显示
    `ALTER TABLE users ADD COLUMN kind TEXT NOT NULL DEFAULT 'campus'`,
    `ALTER TABLE users ADD COLUMN username TEXT`,
    `ALTER TABLE users ADD COLUMN email TEXT`,
    // 校外账号的学校 / 单位（选填）
    `ALTER TABLE users ADD COLUMN org TEXT`,
    `CREATE UNIQUE INDEX IF NOT EXISTS users_by_username ON users(username) WHERE username IS NOT NULL`,
    `CREATE UNIQUE INDEX IF NOT EXISTS users_by_email ON users(email) WHERE email IS NOT NULL`,
    // 邀请码决定注册出来的是哪种账号
    `ALTER TABLE invite_codes ADD COLUMN kind TEXT NOT NULL DEFAULT 'campus'`,
  ],
  // v9：签到时的手写签名（files 表里的图片 key）。旧记录和旧版 App 签的没有签名
  [`ALTER TABLE attendance ADD COLUMN in_sign TEXT`],
  // v10：蓝色钉子。钉在讲义某一段（anchor_key + 段内百分比坐标）上的问题，大家都能回复，Agent 的回答也留在里面
  [
    `CREATE TABLE IF NOT EXISTS pins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      course TEXT NOT NULL,
      item TEXT NOT NULL,
      page TEXT NOT NULL,
      anchor_key TEXT NOT NULL,
      anchor_label TEXT,
      x_pct REAL NOT NULL,
      y_pct REAL NOT NULL,
      snippet TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS pins_by_page ON pins(course, page)`,
    `CREATE INDEX IF NOT EXISTS pins_by_status ON pins(status, updated_at)`,
    // author_kind：member（成员）、agent（AI 的回答，user_id 记是谁让 AI 回答的）
    `CREATE TABLE IF NOT EXISTS pin_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pin_id TEXT NOT NULL,
      user_id TEXT,
      author_kind TEXT NOT NULL DEFAULT 'member',
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS pin_messages_by_pin ON pin_messages(pin_id, created_at)`,
    // “我也想问”
    `CREATE TABLE IF NOT EXISTS pin_votes (
      pin_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (pin_id, user_id)
    )`,
  ],
  // v11：新生报名（开场动画里的报名表）。只有管理员能看；同一学号再交一次覆盖上一次
  [
    `CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      name TEXT NOT NULL,
      class_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      qq TEXT NOT NULL,
      q1 TEXT,
      q2 TEXT,
      q3 TEXT,
      q4 TEXT,
      q5 TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      admin_note TEXT,
      submit_count INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      handled_by TEXT,
      handled_at INTEGER
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS applications_by_student ON applications(student_id)`,
    `CREATE INDEX IF NOT EXISTS applications_by_time ON applications(created_at)`,
    // 报名防刷：每个 IP 每小时最多交几次（和 login_failures 一样只存 IP 和时间）
    `CREATE TABLE IF NOT EXISTS application_hits (
      ip TEXT NOT NULL,
      at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS application_hits_by_ip ON application_hits(ip, at)`,
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

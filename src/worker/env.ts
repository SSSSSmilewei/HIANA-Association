export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  SESSION_SECRET?: string;
  AI_PROVIDER?: string; // "openai"（OpenAI 兼容接口）或 "anthropic"
  AI_BASE_URL?: string;
  AI_MODEL?: string;
  AI_API_KEY?: string;
  WXPUSHER_SPT?: string;
  SERVERCHAN_KEY?: string;
  SITE_URL?: string;
  GITHUB_TOKEN?: string;
  /** 首个管理员的注册码：系统里还没有管理员时，学号 FIRST_ADMIN_STUDENT_NO 用它代替邀请码注册，注册后就是管理员 */
  FIRST_ADMIN_CODE?: string; // 热力图：查 GitHub 贡献日历用，只读公开信息即可
  WAKATIME_KEY?: string;
  /** 照片和资料的 R2 存储桶。没开通 R2 时不绑定，文件存进 D1 的 files 表。 */
  FILES?: R2Bucket;
  /** 公告配图的图床：公开读的 R2 存储桶，通过自定义域名 IMAGE_BASE_URL 访问。两项都配了才能上传公告图片。 */
  IMAGES?: R2Bucket;
  IMAGE_BASE_URL?: string;
}

/**
 * 会话：所有账号（学员、会长、老师）都一样，管理员权限看 users.role。
 * sv 是签发时账号的登录版本号（users.session_version），不一致就失效；更早的令牌没有 sv，按 0 算。
 */
export type Session = { role: "member"; uid: string; exp: number; sv?: number };

/** 每个请求开始时从数据库读出的当前账号。 */
export interface CurrentUser {
  id: string;
  /** campus = 校内（能签到、能看成员真名）；external = 校外 */
  kind: "campus" | "external";
  /** 校外账号是占位的 "ext:<id>"，不要显示 */
  studentNo: string;
  username: string | null;
  email: string | null;
  org: string | null;
  name: string;
  /** 自己设置的显示名，只用于首页欢迎语；没设时为 null */
  displayName: string | null;
  className: string | null;
  role: "member" | "admin";
  sessionVersion: number;
}

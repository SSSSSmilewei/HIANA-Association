export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  SESSION_SECRET?: string;
  ADMIN_PASSWORD?: string;
  AI_PROVIDER?: string; // "openai"（OpenAI 兼容接口）或 "anthropic"
  AI_BASE_URL?: string;
  AI_MODEL?: string;
  AI_API_KEY?: string;
  WXPUSHER_SPT?: string;
  SERVERCHAN_KEY?: string;
  SITE_URL?: string;
  GITHUB_TOKEN?: string; // 热力图：查 GitHub 贡献日历用，只读公开信息即可
  WAKATIME_KEY?: string;
  /** 照片和资料的 R2 存储桶。没开通 R2 时不绑定，文件存进 D1 的 files 表。 */
  FILES?: R2Bucket;
}

/**
 * 会话：所有账号（学员、会长、老师）都是 role "member" + uid，管理员权限看 users.role。
 * role "admin" 且没有 uid 的会话只来自 ADMIN_PASSWORD，用于第一次初始化。
 */
export type Session = { role: "member"; uid: string; exp: number } | { role: "admin"; exp: number };

/** 每个请求开始时从数据库读出的当前账号。 */
export interface CurrentUser {
  id: string;
  studentNo: string;
  name: string;
  className: string | null;
  role: "member" | "admin";
  hasPassword: boolean;
}

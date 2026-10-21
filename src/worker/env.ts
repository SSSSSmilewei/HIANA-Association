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
}

/** 成员用口令登录（uid 是 users.id）；会长用后台密码登录。 */
export type Session = { role: "member"; uid: string; exp: number } | { role: "admin"; exp: number };

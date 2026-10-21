import { api } from "./api/index";
import { ensureSchema, getSetting } from "./db";
import type { CurrentUser, Env } from "./env";
import { syncEveryone } from "./heatmap/store";
import { dispatch, json, parseCookies } from "./http";
import { flush } from "./notify";
import { COOKIE, bearerToken, verifySession } from "./session";

/**
 * 没在 Cloudflare 设置里配置 SESSION_SECRET 时，自动生成一个存在数据库里（只生成一次）。
 * 这样部署后不用手动填这个密钥也能用。
 */
async function fillSecretsFromDb(env: Env) {
  if (env.SESSION_SECRET && env.SESSION_SECRET.length >= 16) return;
  let s = await getSetting(env.DB, "session_secret");
  if (!s) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const fresh = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    await env.DB.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('session_secret', ?)").bind(fresh).run();
    s = await getSetting(env.DB, "session_secret");
  }
  if (s) env.SESSION_SECRET = s;
}

async function handleApi(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  await ensureSchema(env.DB);
  await fillSecretsFromDb(env);
  if (url.pathname === "/api/health") {
    // 只报告各项设置“有没有”，不返回值，方便排查部署
    const has = (k: keyof Env) => typeof env[k] === "string" && (env[k] as string).trim().length > 0;
    return json({
      ok: true,
      settings: {
        ADMIN_PASSWORD: has("ADMIN_PASSWORD"),
        SITE_URL: has("SITE_URL"),
        AI_API_KEY: has("AI_API_KEY"),
        GITHUB_TOKEN: has("GITHUB_TOKEN"),
        WXPUSHER_SPT: has("WXPUSHER_SPT"),
        FILES: !!env.FILES,
      },
    });
  }
  // 网页用 Cookie；手机 App 没有 Cookie，改用 Authorization: Bearer 头，令牌格式相同
  const token = parseCookies(req.headers.get("cookie"))[COOKIE] ?? bearerToken(req);
  let session = token && env.SESSION_SECRET ? await verifySession(env.SESSION_SECRET, token) : null;
  let user: CurrentUser | null = null;
  // 每次请求都读一下账号：停用后旧会话（网页和 App）立即失效；改成管理员也立即生效
  if (session?.role === "member") {
    const row = await env.DB.prepare(
      "SELECT id, student_no, name, class_name, role, password_hash IS NOT NULL AS has_pw FROM users WHERE id = ? AND status = 'active'",
    )
      .bind(session.uid)
      .first<{ id: string; student_no: string; name: string; class_name: string | null; role: string; has_pw: number }>();
    if (!row) session = null;
    else
      user = {
        id: row.id,
        studentNo: row.student_no,
        name: row.name,
        className: row.class_name,
        role: row.role === "admin" ? "admin" : "member",
        hasPassword: row.has_pw === 1,
      };
  }
  return dispatch(api, req, env, session, user);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) return handleApi(req, env);
    return env.ASSETS.fetch(req);
  },
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    if (controller.cron === "30 15 * * *") {
      // 每晚 23:30（北京时间）同步热力图
      ctx.waitUntil(
        ensureSchema(env.DB)
          .then(() => fillSecretsFromDb(env))
          .then(() => syncEveryone(env.DB, { ...env, SESSION_SECRET: env.SESSION_SECRET as string }, (u, i) => fetch(u, i)))
          .then((r) => console.log(JSON.stringify({ msg: "heatmap sync done", ...r })))
          .catch((err) => console.error(JSON.stringify({ msg: "heatmap sync failed", error: String(err) }))),
      );
      return;
    }
    ctx.waitUntil(
      ensureSchema(env.DB)
        .then(() => flush(env, { force: true }))
        .catch((err) => console.error(JSON.stringify({ msg: "scheduled flush failed", error: String(err) }))),
    );
  },
};

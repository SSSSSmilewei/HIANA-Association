import { ZodError } from "zod";
import type { CurrentUser, Env, Session } from "./env";

/**
 * 一个很小的路由层，只用到这个站需要的几样东西：
 * 方法 + 路径匹配（:param）、JSON 请求和响应、Cookie、会话。
 * 不依赖第三方框架，Worker 和 bun 本地都能直接跑。
 */

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export interface Ctx {
  req: Request;
  url: URL;
  env: Env;
  params: Record<string, string>;
  session: Session | null;
  /** 当前登录的账号（ADMIN_PASSWORD 初始化会话没有账号） */
  user: CurrentUser | null;
  /** 待写入响应的 Set-Cookie 头 */
  cookies: string[];
  body<T = unknown>(): Promise<T>;
  cookie(name: string): string | undefined;
}

export type Handler = (c: Ctx) => Promise<Response> | Response;

interface Route {
  method: string;
  parts: string[];
  handler: Handler;
}

export class Router {
  private routes: Route[] = [];
  on(method: string, path: string, handler: Handler) {
    this.routes.push({ method, parts: path.split("/").filter(Boolean), handler });
    return this;
  }
  get(path: string, h: Handler) {
    return this.on("GET", path, h);
  }
  post(path: string, h: Handler) {
    return this.on("POST", path, h);
  }
  put(path: string, h: Handler) {
    return this.on("PUT", path, h);
  }
  delete(path: string, h: Handler) {
    return this.on("DELETE", path, h);
  }

  match(method: string, pathname: string): { handler: Handler; params: Record<string, string> } | "method" | null {
    const segs = pathname.split("/").filter(Boolean);
    let wrongMethod = false;
    for (const r of this.routes) {
      if (r.parts.length !== segs.length) continue;
      const params: Record<string, string> = {};
      let ok = true;
      for (let i = 0; i < segs.length; i++) {
        const p = r.parts[i];
        if (p.startsWith(":")) params[p.slice(1)] = decodeURIComponent(segs[i]);
        else if (p !== segs[i]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      if (r.method !== method) {
        wrongMethod = true;
        continue;
      }
      return { handler: r.handler, params };
    }
    return wrongMethod ? "method" : null;
  }
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) {
      try {
        out[k] = decodeURIComponent(v);
      } catch {
        out[k] = v;
      }
    }
  }
  return out;
}

export function serializeCookie(name: string, value: string, opts: { maxAge: number; secure: boolean }): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${opts.maxAge}${opts.secure ? "; Secure" : ""}`;
}

export async function dispatch(router: Router, req: Request, env: Env, session: Session | null, user: CurrentUser | null = null): Promise<Response> {
  const url = new URL(req.url);
  const m = router.match(req.method, url.pathname);
  if (m === null) return json({ error: "没有这个接口" }, 404);
  if (m === "method") return json({ error: "不支持这种请求方式" }, 405);
  const jar = parseCookies(req.headers.get("cookie"));
  const ctx: Ctx = {
    req,
    url,
    env,
    params: m.params,
    session,
    user,
    cookies: [],
    async body<T>() {
      try {
        return (await req.json()) as T;
      } catch {
        throw new HttpError(400, "请求不是有效的 JSON");
      }
    },
    cookie: (name) => jar[name],
  };
  let res: Response;
  try {
    res = await m.handler(ctx);
  } catch (err) {
    res = errorResponse(err, url.pathname);
  }
  const headers = new Headers(res.headers);
  for (const c of ctx.cookies) headers.append("set-cookie", c);
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  return new Response(res.body, { status: res.status, headers });
}

function errorResponse(err: unknown, path: string): Response {
  if (err instanceof HttpError) return json({ error: err.message, ...err.extra }, err.status);
  if (err instanceof ZodError) {
    return json({ error: "提交的内容格式不对", issues: err.issues.map((i) => `${i.path.join(".") || "内容"}：${i.message}`) }, 400);
  }
  console.error(JSON.stringify({ msg: "unhandled error", path, error: String(err), stack: (err as Error)?.stack }));
  return json({ error: "服务器出错了，请稍后再试" }, 500);
}

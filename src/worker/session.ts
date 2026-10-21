import type { Env, Session } from "./env";
import { HttpError, serializeCookie } from "./http";

/**
 * 登录会话：签名的 Cookie（HMAC-SHA256），不存服务器。
 * 成员 180 天，会长 30 天。
 */

export const COOKIE = "hiana_s";
const MEMBER_DAYS = 180;
const ADMIN_DAYS = 30;
const enc = new TextEncoder();

const keyCache = new Map<string, Promise<CryptoKey>>();
function hmacKey(secret: string) {
  let key = keyCache.get(secret);
  if (!key) {
    key = crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
    keyCache.set(secret, key);
  }
  return key;
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function requireSecret(env: Env): string {
  const s = env.SESSION_SECRET;
  if (!s || s.length < 16) throw new HttpError(500, "还没有设置 SESSION_SECRET（至少 16 个字符）。", { config: true });
  return s;
}

export async function signSession(secret: string, session: Session): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify(session)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(payload));
  return `${payload}.${b64url(new Uint8Array(sig))}`;
}

export async function verifySession(secret: string, token: string, now = Date.now()): Promise<Session | null> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromB64url(sig), enc.encode(payload));
    if (!ok) return null;
    const session = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as Session;
    if (!session.exp || session.exp < now) return null;
    return session;
  } catch {
    return null;
  }
}

type NewSession = { role: "member"; uid: string } | { role: "admin" };

/**
 * 签发一次会话：同一个签名串既写进 Cookie（网页用），也可以原样交给手机 App
 * 放进 `Authorization: Bearer` 头。两者有效期相同，校验走同一个 verifySession。
 */
export async function issueSession(env: Env, req: Request, session: NewSession): Promise<{ cookie: string; token: string }> {
  const days = session.role === "admin" ? ADMIN_DAYS : MEMBER_DAYS;
  const token = await signSession(requireSecret(env), { ...session, exp: Date.now() + days * 86_400_000 } as Session);
  const cookie = serializeCookie(COOKIE, token, { maxAge: days * 86400, secure: new URL(req.url).protocol === "https:" });
  return { cookie, token };
}

export async function sessionCookie(env: Env, req: Request, session: NewSession): Promise<string> {
  return (await issueSession(env, req, session)).cookie;
}

/** 手机 App 登录时在请求头带 `X-Hiana-Client: app`，只有这时才在返回体里给出令牌。 */
export function wantsAppToken(req: Request): boolean {
  return req.headers.get("x-hiana-client")?.trim().toLowerCase() === "app";
}

/** 读 `Authorization: Bearer <token>`；没有或格式不对时返回 null。 */
export function bearerToken(req: Request): string | null {
  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.get("authorization")?.trim() ?? "");
  return m ? m[1] : null;
}

export function clearCookie(req: Request): string {
  return serializeCookie(COOKIE, "", { maxAge: 0, secure: new URL(req.url).protocol === "https:" });
}

/** 常量时间比较：两边都先做 HMAC，再逐字节比较摘要。 */
export async function safeEqual(secret: string, a: string, b: string): Promise<boolean> {
  const key = await hmacKey(secret);
  const [x, y] = await Promise.all([crypto.subtle.sign("HMAC", key, enc.encode(a)), crypto.subtle.sign("HMAC", key, enc.encode(b))]);
  const xa = new Uint8Array(x);
  const ya = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < xa.length; i++) diff |= xa[i] ^ ya[i];
  return diff === 0;
}

const WINDOW_MS = 10 * 60_000;
const MAX_FAILURES = 10;

export function clientIp(req: Request): string {
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "local";
}

export async function tooManyFailures(db: D1Database, ip: string): Promise<boolean> {
  const row = await db.prepare("SELECT COUNT(*) AS n FROM login_failures WHERE ip = ? AND at > ?").bind(ip, Date.now() - WINDOW_MS).first<{ n: number }>();
  return (row?.n ?? 0) >= MAX_FAILURES;
}

export async function recordFailure(db: D1Database, ip: string) {
  await db.batch([
    db.prepare("INSERT INTO login_failures (ip, at) VALUES (?, ?)").bind(ip, Date.now()),
    db.prepare("DELETE FROM login_failures WHERE at < ?").bind(Date.now() - WINDOW_MS),
  ]);
}

export async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

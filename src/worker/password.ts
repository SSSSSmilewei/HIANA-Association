/**
 * 成员自己设置的登录密码：PBKDF2-SHA256 加盐摘要（Workers 允许的最大迭代次数是 10 万）。
 * 存储格式："pbkdf2$<迭代次数>$<盐 base64url>$<摘要 base64url>"
 */

const ITERATIONS = 100_000;
const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function unb64url(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${b64url(salt)}$${b64url(await derive(password, salt, ITERATIONS))}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [algo, iter, salt, hash] = stored.split("$");
  const n = Number(iter);
  if (algo !== "pbkdf2" || !Number.isInteger(n) || n < 1 || n > ITERATIONS || !salt || !hash) return false;
  const got = await derive(password, unb64url(salt), n);
  const want = unb64url(hash);
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
  return diff === 0;
}

/** 密码要求：8 到 64 个字符，不能全是同一个字符，不能和学号一样。返回错误说明，合格时返回 null。 */
export function passwordProblem(password: string, studentNo: string): string | null {
  if (password.length < 8) return "密码至少 8 个字符";
  if (password.length > 64) return "密码最多 64 个字符";
  if (/^(.)\1+$/.test(password)) return "密码不能全是同一个字符";
  if (password === studentNo) return "密码不能和学号一样";
  return null;
}

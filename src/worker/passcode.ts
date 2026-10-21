/**
 * 成员口令：生成、归一化、摘要。数据库里只存摘要，口令本身只在生成时显示一次。
 * 单独放一个文件，不依赖 hono，方便测试和脚本复用。
 */
const enc = new TextEncoder();

/** 口令统一成小写、去掉空格和连字符，方便学生输入。 */
export function normalizePasscode(code: string): string {
  return code.toLowerCase().replace(/[\s-]/g, "");
}

export async function hashPasscode(secret: string, code: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(`${secret}:${normalizePasscode(code)}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export function generatePasscode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8).join("")}`;
}


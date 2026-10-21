import type { Env } from "./env";

/**
 * 文件存储（照片等）。绑定了 R2（env.FILES）时存 R2，否则存进 D1 的 files 表。
 * 两种情况下 files 表都有一行记录：谁上传的、类型、大小，读取时按 in_r2 决定去哪拿。
 */

export const MAX_PHOTO_BYTES = 600_000;

export function decodeBase64(b64: string): Uint8Array {
  const clean = b64.replace(/^data:[^,]*,/, "").replace(/\s+/g, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** 只接受 JPEG / PNG / WebP，按文件头判断，不信任客户端声明的类型。 */
export function sniffImage(bytes: Uint8Array): string | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length > 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export async function putFile(env: Env, input: { prefix: string; ownerId: string | null; mime: string; bytes: Uint8Array }, now = Date.now()): Promise<string> {
  const key = `${input.prefix}/${new Date(now + 8 * 3_600_000).toISOString().slice(0, 10)}/${crypto.randomUUID()}`;
  if (env.FILES) {
    await env.FILES.put(key, input.bytes, { httpMetadata: { contentType: input.mime } });
    await env.DB.prepare("INSERT INTO files (key, owner_id, mime, size, data, in_r2, created_at) VALUES (?, ?, ?, ?, NULL, 1, ?)")
      .bind(key, input.ownerId, input.mime, input.bytes.length, now)
      .run();
  } else {
    await env.DB.prepare("INSERT INTO files (key, owner_id, mime, size, data, in_r2, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)")
      .bind(key, input.ownerId, input.mime, input.bytes.length, input.bytes, now)
      .run();
  }
  return key;
}

export async function getFile(env: Env, key: string): Promise<{ ownerId: string | null; mime: string; bytes: ArrayBuffer } | null> {
  const row = await env.DB.prepare("SELECT owner_id, mime, data, in_r2 FROM files WHERE key = ?")
    .bind(key)
    .first<{ owner_id: string | null; mime: string; data: ArrayBuffer | Uint8Array | number[] | null; in_r2: number }>();
  if (!row) return null;
  if (row.in_r2) {
    const obj = env.FILES ? await env.FILES.get(key) : null;
    if (!obj) return null;
    return { ownerId: row.owner_id, mime: row.mime, bytes: await obj.arrayBuffer() };
  }
  const d = row.data;
  if (!d) return null;
  const bytes = d instanceof ArrayBuffer ? d : Array.isArray(d) ? new Uint8Array(d).buffer : (d as Uint8Array).slice().buffer;
  return { ownerId: row.owner_id, mime: row.mime, bytes: bytes as ArrayBuffer };
}

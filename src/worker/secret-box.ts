/**
 * 加密存在数据库里的学员令牌（例如墨墨背单词的开放 API 令牌）。
 * 用 SESSION_SECRET 经 HKDF 派生 AES-GCM 密钥；数据库泄露时令牌不会直接暴露。
 * 格式："v1.<iv base64url>.<密文 base64url>"
 */

const enc = new TextEncoder();
const dec = new TextDecoder();
const keys = new Map<string, Promise<CryptoKey>>();

function deriveKey(secret: string): Promise<CryptoKey> {
  let k = keys.get(secret);
  if (!k) {
    k = crypto.subtle
      .importKey("raw", enc.encode(secret), "HKDF", false, ["deriveKey"])
      .then((base) =>
        crypto.subtle.deriveKey(
          { name: "HKDF", hash: "SHA-256", salt: enc.encode("hiana-secret-box"), info: enc.encode("user-tokens-v1") },
          base,
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt", "decrypt"],
        ),
      );
    keys.set(secret, k);
  }
  return k;
}

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

export async function sealSecret(sessionSecret: string, plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await deriveKey(sessionSecret), enc.encode(plain));
  return `v1.${b64url(iv)}.${b64url(new Uint8Array(ct))}`;
}

/** 解不开（密钥换了或数据被改过）时返回 null，调用方提示学员重新填。 */
export async function openSecret(sessionSecret: string, sealed: string): Promise<string | null> {
  const [v, iv, ct] = sealed.split(".");
  if (v !== "v1" || !iv || !ct) return null;
  try {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64url(iv) }, await deriveKey(sessionSecret), unb64url(ct));
    return dec.decode(pt);
  } catch {
    return null;
  }
}

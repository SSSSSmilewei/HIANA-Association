/**
 * 导入配色方案和字体。
 *
 * 配色：解析成 7 个基色（浅、深各一套，见 palettes.css），生成一段 CSS 存进 localStorage，
 * index.html 的首帧脚本直接把它插进 <style>，不闪。支持的格式：
 *   - HIANA JSON：{ "name", "light": { bg, surface, ink, accent, text, cta, ctaInk }, "dark": {…} }（也可以只给一套）
 *   - base16 / base24（YAML 或 JSON，tinted-theming 新旧两种写法都行）
 *   - VS Code 颜色主题 JSON（colors 字段）
 *   - CSS 变量：--bg、--surface、--ink、--accent… 或 --p-bg…
 * 只给一套颜色时，深浅两种模式都用这一套。
 *
 * 字体：本机已安装的字体名、字体文件或 CSS 的网址、上传的字体文件（存 IndexedDB）。
 */

export interface Base {
  bg: string;
  surface: string;
  ink: string;
  accent: string;
  text: string;
  cta: string;
  ctaInk: string;
}
export interface CustomPalette {
  name: string;
  light: Base;
  dark: Base;
}

const KEYS: (keyof Base)[] = ["bg", "surface", "ink", "accent", "text", "cta", "ctaInk"];
const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function hex(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().replace(/^["']|["']$/g, "");
  if (HEX.test(s)) {
    let h = s.replace(/^#/, "").toLowerCase();
    if (h.length === 3) h = [...h].map((c) => c + c).join("");
    return `#${h.slice(0, 6)}`;
  }
  if (/^(rgb|hsl|oklch|oklab|lab|lch|color)\(/i.test(s) && CSS.supports("color", s)) return s;
  return null;
}

function rgb(h: string): [number, number, number] | null {
  const m = h.match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = Number.parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 相对亮度（WCAG），非十六进制颜色按中间值算 */
export function luminance(h: string): number {
  const c = rgb(h);
  if (!c) return 0.5;
  const [r, g, b] = c.map((x) => {
    const v = x / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** 按钮上的字：黑白里对比度高的那个 */
function inkOn(bg: string, light: string, dark: string): string {
  return contrast(bg, light) >= contrast(bg, dark) ? light : dark;
}

/** 由“底色、表面、文字、强调色”补全 7 个基色 */
function complete(p: Partial<Base>): Base | null {
  const bg = p.bg;
  const ink = p.ink;
  const accent = p.accent ?? p.cta ?? p.text;
  if (!bg || !ink || !accent) return null;
  const surface = p.surface ?? bg;
  const cta = p.cta ?? accent;
  return {
    bg,
    surface,
    ink,
    accent,
    // 文字里的强调色要在底色上读得清，不够就退到正文色
    text: p.text ?? (contrast(accent, bg) >= 3 ? accent : ink),
    cta,
    ctaInk: p.ctaInk ?? inkOn(cta, bg, ink),
  };
}

function pickBase(o: Record<string, unknown>): Partial<Base> {
  const out: Partial<Base> = {};
  const alias: Record<string, keyof Base> = { background: "bg", foreground: "ink", fg: "ink", primary: "accent", "cta-ink": "ctaInk", cta_ink: "ctaInk" };
  for (const [k, v] of Object.entries(o)) {
    const key = (KEYS as string[]).includes(k) ? (k as keyof Base) : alias[k];
    const c = hex(v);
    if (key && c) out[key] = c;
  }
  return out;
}

function both(name: string, one: Base): CustomPalette {
  return { name, light: one, dark: one };
}

function fromBase16(text: string): CustomPalette | null {
  const get = (n: string) => hex(text.match(new RegExp(`["']?base${n}["']?\\s*[:=]\\s*["']?#?([0-9a-fA-F]{6})`))?.[1] ?? "");
  const b = Object.fromEntries(["00", "01", "02", "05", "08", "0A", "0B", "0D", "0E"].map((n) => [n, get(n) ?? get(n.toLowerCase())]));
  if (!b["00"] || !b["05"]) return null;
  const name = text.match(/^\s*["']?(?:scheme|name)["']?\s*:\s*["']?([^"'\n,]+)/m)?.[1].trim() ?? "base16";
  const accent = b["0D"] ?? b["0E"] ?? b["08"] ?? b["05"];
  const one = complete({ bg: b["00"], surface: b["01"] ?? b["00"], ink: b["05"], accent });
  return one && both(name, one);
}

function fromVscode(o: { name?: string; colors?: Record<string, string> }): CustomPalette | null {
  const c = o.colors ?? {};
  const g = (...ks: string[]) => ks.map((k) => hex(c[k])).find(Boolean) ?? undefined;
  const one = complete({
    bg: g("editor.background"),
    surface: g("sideBar.background", "editorWidget.background", "panel.background", "editor.background"),
    ink: g("editor.foreground", "foreground"),
    accent: g("focusBorder", "button.background", "textLink.foreground", "activityBarBadge.background"),
    text: g("textLink.foreground"),
    cta: g("button.background"),
    ctaInk: g("button.foreground"),
  });
  return one && both(o.name ?? "VS Code", one);
}

function fromCss(text: string): CustomPalette | null {
  const vars: Record<string, string> = {};
  for (const m of text.matchAll(/--(?:p-)?([\w-]+)\s*:\s*([^;]+);?/g)) vars[m[1].replace(/-(\w)/g, (_, x: string) => x.toUpperCase())] = m[2];
  const one = complete(pickBase(vars));
  return one && both("CSS", one);
}

/** 解析一段配色文本；认不出返回 null */
export function parsePalette(text: string, fallbackName = "自定义"): CustomPalette | null {
  const t = text.trim();
  if (!t) return null;
  let json: unknown = null;
  try {
    json = JSON.parse(t.replace(/^\s*\/\/.*$/gm, ""));
  } catch {
    /* 不是 JSON */
  }
  let out: CustomPalette | null = null;
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;
    if (o.colors && typeof o.colors === "object") out = fromVscode(o as { name?: string; colors: Record<string, string> });
    else if (o.light || o.dark) {
      const l = o.light && complete(pickBase(o.light as Record<string, unknown>));
      const d = o.dark && complete(pickBase(o.dark as Record<string, unknown>));
      if (l || d) out = { name: String(o.name ?? fallbackName), light: (l || d) as Base, dark: (d || l) as Base };
    } else if (/base0[0-9a-f]/i.test(t)) out = fromBase16(t);
    else {
      const one = complete(pickBase(o));
      if (one) out = both(String(o.name ?? fallbackName), one);
    }
  } else if (/base0[0-9a-f]\s*["']?\s*[:=]/i.test(t)) out = fromBase16(t);
  else if (/--[\w-]+\s*:/.test(t)) out = fromCss(t);
  if (out && (out.name === "CSS" || !out.name.trim())) out.name = fallbackName;
  if (out) out.name = out.name.slice(0, 40);
  return out;
}

const vars = (b: Base) =>
  `--p-bg:${b.bg};--p-surface:${b.surface};--p-ink:${b.ink};--p-accent:${b.accent};--p-text:${b.text};--p-cta:${b.cta};--p-cta-ink:${b.ctaInk};`;

/** 生成样式：深色那套在深色模式下生效 */
export function paletteCss(p: CustomPalette): string {
  const safe = (s: string) => s.replace(/[;{}<>]/g, "");
  const clean = (b: Base) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, safe(v)])) as unknown as Base;
  return `:root[data-palette="custom"]{${vars(clean(p.light))}}:root[data-palette="custom"][data-mode="dark"]{${vars(clean(p.dark))}}`;
}

/** 导出成 HIANA JSON，方便分享 */
export function exportPalette(p: CustomPalette): string {
  return JSON.stringify(p, null, 2);
}

// ---------- 字体 ----------

export type FontSlot = "sans" | "mono";
export interface CustomFont {
  family: string;
  /** local：本机安装；url：字体文件或 CSS 的网址；file：上传的文件（存 IndexedDB） */
  source: "local" | "url" | "file";
  url?: string;
}

const DB = "hiana-fonts";
function idb(): Promise<IDBDatabase> {
  return new Promise((ok, fail) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fail(r.error);
  });
}
export async function saveFontFile(slot: FontSlot, file: Blob): Promise<void> {
  const db = await idb();
  await new Promise<void>((ok, fail) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").put(file, slot);
    tx.oncomplete = () => ok();
    tx.onerror = () => fail(tx.error);
  });
}
async function loadFontFile(slot: FontSlot): Promise<Blob | null> {
  const db = await idb();
  return new Promise((ok) => {
    const r = db.transaction("files").objectStore("files").get(slot);
    r.onsuccess = () => ok((r.result as Blob) ?? null);
    r.onerror = () => ok(null);
  });
}

const GENERIC = new Set(["system-ui", "sans-serif", "serif", "monospace", "ui-monospace", "ui-sans-serif", "ui-serif"]);

export const safeFamily = (s: string) => s.replace(/["\\;{}<>]/g, "").trim().slice(0, 60);

/** 首帧脚本插入的 CSS：字体变量（和网址里的 CSS 字体） */
export function fontCss(slot: FontSlot, f: CustomFont | null): string {
  if (!f) return "";
  const fam = safeFamily(f.family);
  if (!fam) return "";
  const url = f.url && /^https:\/\/[^\s"'()]+$/.test(f.url) ? f.url : null;
  let face = "";
  if (f.source === "url" && url) face = /\.css(\?|$)/.test(url) || url.includes("fonts.googleapis.com") ? `@import url("${url}");` : `@font-face{font-family:"${fam}";src:url("${url}");font-display:swap}`;
  const value = GENERIC.has(fam) ? fam : `"${fam}"`;
  return `${face}:root{--font-${slot}-user:${value}}`;
}

const loaded = new Set<string>();
/** 上传的字体文件要等 JS 起来以后从 IndexedDB 读出来 */
export async function loadUploadedFont(slot: FontSlot, f: CustomFont | null) {
  if (!f || f.source !== "file") return;
  const fam = safeFamily(f.family);
  if (loaded.has(`${slot}:${fam}`)) return;
  const blob = await loadFontFile(slot).catch(() => null);
  if (!blob) return;
  const face = new FontFace(fam, await blob.arrayBuffer(), { display: "swap" });
  await face.load();
  document.fonts.add(face);
  loaded.add(`${slot}:${fam}`);
}

import { useEffect, useState } from "react";
import { type CustomFont, type CustomPalette, type FontSlot, fontCss, loadUploadedFont, paletteCss } from "./theme";

/**
 * 外观偏好：皮肤、深浅、配色（含导入的配色）、字体。
 * 只存在这台设备的浏览器里。首帧前由 index.html 里的小脚本先设好（含导入配色和字体的 CSS），避免闪一下。
 */
export type Skin = "glass" | "classic";
export type ThemeChoice = "system" | "light" | "dark";
/** 配色主题；swatch 为 [底色, 表面, 文字, 强调色]，只用来在设置里画预览，真正的颜色在 palettes.css */
export const PALETTES = [
  { id: "shanmoew-mizu", label: "shanmoew-mizu", light: ["#f2f9fa", "#ffffff", "#102c35", "#add8e6"], dark: ["#0c1a20", "#13262e", "#e3f3f6", "#add8e6"] },
  { id: "hiana", label: "海纳橙", light: ["#f6f5f3", "#ffffff", "#1b1a19", "#f26b1d"], dark: ["#0e0d0c", "#1c1a19", "#f3f1ee", "#ff7a2e"] },
  { id: "nord", label: "Nord", light: ["#eceff4", "#ffffff", "#2e3440", "#5e81ac"], dark: ["#2e3440", "#3b4252", "#eceff4", "#88c0d0"] },
  { id: "catppuccin", label: "Catppuccin", light: ["#eff1f5", "#ffffff", "#4c4f69", "#8839ef"], dark: ["#1e1e2e", "#313244", "#cdd6f4", "#cba6f7"] },
  { id: "tokyo-night", label: "Tokyo Night", light: ["#e6e7ed", "#ffffff", "#343b58", "#2e7de9"], dark: ["#1a1b26", "#24283b", "#c0caf5", "#7aa2f7"] },
  { id: "dracula", label: "Dracula", light: ["#fffbeb", "#ffffff", "#1f1f1f", "#644ac9"], dark: ["#282a36", "#343746", "#f8f8f2", "#bd93f9"] },
  { id: "gruvbox", label: "Gruvbox", light: ["#fbf1c7", "#f9f5d7", "#3c3836", "#b57614"], dark: ["#282828", "#3c3836", "#ebdbb2", "#fabd2f"] },
  { id: "one", label: "One", light: ["#fafafa", "#ffffff", "#383a42", "#4078f2"], dark: ["#282c34", "#2f343e", "#abb2bf", "#61afef"] },
  { id: "solarized", label: "Solarized", light: ["#fdf6e3", "#eee8d5", "#073642", "#268bd2"], dark: ["#002b36", "#073642", "#93a1a1", "#268bd2"] },
  { id: "kanagawa", label: "Kanagawa", light: ["#f2ecbc", "#f9f4d2", "#545464", "#4d699b"], dark: ["#1f1f28", "#2a2a37", "#dcd7ba", "#7e9cd8"] },
  { id: "rose-pine", label: "Rosé Pine", light: ["#faf4ed", "#fffaf3", "#575279", "#907aa9"], dark: ["#191724", "#1f1d2e", "#e0def4", "#c4a7e7"] },
  { id: "vesper", label: "Vesper", light: ["#f6f1ea", "#ffffff", "#1c1c1c", "#c2662a"], dark: ["#101010", "#1a1a1a", "#e6e6e6", "#ffc799"] },
] as const;
export type PaletteId = (typeof PALETTES)[number]["id"] | "custom";
export const DEFAULT_PALETTE: PaletteId = "shanmoew-mizu";
export interface Prefs {
  skin: Skin;
  theme: ThemeChoice;
  palette: PaletteId;
  custom: CustomPalette | null;
  fonts: Partial<Record<FontSlot, CustomFont | null>>;
  /** 下面两个由前面的字段生成，给首帧脚本用 */
  customCss?: string;
  fontCss?: Partial<Record<FontSlot, string>>;
}

const KEY = "hiana-prefs";
const listeners = new Set<(p: Prefs) => void>();

export function readPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Prefs>;
    const custom = raw.custom && raw.custom.light && raw.custom.dark ? raw.custom : null;
    return {
      skin: raw.skin === "classic" ? "classic" : "glass",
      theme: raw.theme === "light" || raw.theme === "dark" ? raw.theme : "system",
      palette: raw.palette === "custom" && custom ? "custom" : PALETTES.some((x) => x.id === raw.palette) ? (raw.palette as PaletteId) : DEFAULT_PALETTE,
      custom,
      fonts: raw.fonts && typeof raw.fonts === "object" ? raw.fonts : {},
    };
  } catch {
    return { skin: "glass", theme: "system", palette: DEFAULT_PALETTE, custom: null, fonts: {} };
  }
}

const mq = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;

export function resolvedMode(p: Prefs): "light" | "dark" {
  if (p.theme === "system") return mq?.matches ? "dark" : "light";
  return p.theme;
}

/** 导入的配色和字体：每项一个 <style>（@import 只能写在样式表开头） */
function styleTag(id: string, css: string) {
  let el = document.getElementById(id);
  if (!css) return el?.remove();
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    document.head.append(el);
  }
  if (el.textContent !== css) el.textContent = css;
}

export function applyPrefs(p: Prefs) {
  const root = document.documentElement;
  const mode = resolvedMode(p);
  styleTag("hiana-custom", p.custom ? paletteCss(p.custom) : "");
  for (const slot of ["sans", "mono"] as const) {
    styleTag(`hiana-font-${slot}`, fontCss(slot, p.fonts[slot] ?? null));
    void loadUploadedFont(slot, p.fonts[slot] ?? null);
  }
  root.dataset.skin = p.skin;
  root.dataset.mode = mode;
  root.dataset.palette = p.palette;
  const computed = getComputedStyle(root).getPropertyValue("--bg").trim();
  const color = computed || (mode === "dark" ? "#0c1a20" : "#f2f9fa");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
}

export function setPrefs(next: Partial<Prefs>) {
  const p = { ...readPrefs(), ...next };
  const stored: Prefs = {
    ...p,
    customCss: p.custom ? paletteCss(p.custom) : "",
    fontCss: { sans: fontCss("sans", p.fonts.sans ?? null), mono: fontCss("mono", p.fonts.mono ?? null) },
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    /* 隐私模式存不了，只影响这一次 */
  }
  const run = () => applyPrefs(p);
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (doc.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) doc.startViewTransition(run);
  else run();
  for (const l of listeners) l(p);
}

/** 系统切换深浅色时跟着变（只在“跟随系统”时）。 */
mq?.addEventListener("change", () => {
  const p = readPrefs();
  if (p.theme === "system") applyPrefs(p);
});

export function usePrefs(): [Prefs, (next: Partial<Prefs>) => void] {
  const [p, setP] = useState(readPrefs);
  useEffect(() => {
    listeners.add(setP);
    return () => {
      listeners.delete(setP);
    };
  }, []);
  return [p, setPrefs];
}

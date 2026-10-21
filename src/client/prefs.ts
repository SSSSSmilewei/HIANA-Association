import { useEffect, useState } from "react";

/**
 * 外观偏好：皮肤（液态玻璃 / 经典直角）和深浅（跟随系统 / 浅色 / 深色）。
 * 只存在这台设备的浏览器里。首帧前由 index.html 里的小脚本先设好，避免闪一下。
 */
export type Skin = "glass" | "classic";
export type ThemeChoice = "system" | "light" | "dark";
export interface Prefs {
  skin: Skin;
  theme: ThemeChoice;
}

const KEY = "hiana-prefs";
const listeners = new Set<(p: Prefs) => void>();

export function readPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Prefs>;
    return {
      skin: raw.skin === "classic" ? "classic" : "glass",
      theme: raw.theme === "light" || raw.theme === "dark" ? raw.theme : "system",
    };
  } catch {
    return { skin: "glass", theme: "system" };
  }
}

const mq = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;

export function resolvedMode(p: Prefs): "light" | "dark" {
  if (p.theme === "system") return mq?.matches ? "dark" : "light";
  return p.theme;
}

export function applyPrefs(p: Prefs) {
  const root = document.documentElement;
  const mode = resolvedMode(p);
  root.dataset.skin = p.skin;
  root.dataset.mode = mode;
  const color = p.skin === "classic" ? (mode === "dark" ? "#111113" : "#ffffff") : mode === "dark" ? "#0e0d0c" : "#f6f5f3";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
}

export function setPrefs(next: Partial<Prefs>) {
  const p = { ...readPrefs(), ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
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

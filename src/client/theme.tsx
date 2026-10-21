import { useEffect, useState } from "react";

/** 主题：跟随系统 / 浅色 / 深色。选择存在本机浏览器里；页面加载前由 index.html 里的小脚本先设好，避免闪白。 */
export type ThemeChoice = "system" | "light" | "dark";
const KEY = "hiana-theme";

export function readTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
  const dark = choice === "dark" || (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#121316" : "#ffffff");
  try {
    if (choice === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    /* 隐私模式下存不了，只影响这一次 */
  }
}

const NEXT: Record<ThemeChoice, ThemeChoice> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<ThemeChoice, string> = { system: "跟随系统", light: "浅色", dark: "深色" };

function Icon({ choice }: { choice: ThemeChoice }) {
  if (choice === "light")
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="8" cy="8" r="3" />
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3" />
      </svg>
    );
  if (choice === "dark")
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z" />
      </svg>
    );
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 2.5v11" />
      <path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>(readTheme);
  useEffect(() => {
    applyTheme(choice);
    if (choice !== "system") return;
    // 跟随系统时，系统切换深浅色要同步更新页头颜色
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => applyTheme("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [choice]);
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setChoice(NEXT[choice])}
      aria-label={`外观：${LABEL[choice]}，点击切换到${LABEL[NEXT[choice]]}`}
      title="切换外观"
    >
      <Icon choice={choice} />
      {LABEL[choice]}
    </button>
  );
}

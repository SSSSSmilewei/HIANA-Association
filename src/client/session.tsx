import { createContext, useCallback, useContext } from "react";
import { navigate, useLocation } from "./router";
import type { Me } from "./types";

/**
 * 当前是谁：登录的成员（含管理员），或者游客（me.role 为 null）。
 * 游客能看首页、课程、公告；点到需要账号的操作时，用 useRequireLogin 送去登录页，登录后回到原来的页面。
 */

interface MeState {
  me: Me;
  setMe: (me: Me) => void;
}

export const MeContext = createContext<MeState>({ me: { role: null }, setMe: () => {} });

export function useMe(): MeState {
  return useContext(MeContext);
}

/** 展示用的名字：设了显示名就用显示名，否则用真名。只给首页欢迎语用。 */
export function displayNameOf(me: Me): string {
  return me.member?.displayName || me.member?.name || "";
}

/**
 * 登录后要回去的地址。只接受站内路径（以单个 / 开头），挡掉 //evil.com、/\evil.com 这类会跳到别的网站的写法，
 * 也不跳回登录页本身。
 */
export function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  if (/[\u0000-\u001f]/.test(raw)) return "/";
  if (raw === "/login" || raw.startsWith("/login?") || raw.startsWith("/login#")) return "/";
  return raw;
}

export function loginHref(next: string, mode?: "register"): string {
  const q = new URLSearchParams();
  if (mode) q.set("mode", mode);
  if (next && next !== "/") q.set("next", next);
  const s = q.toString();
  return s ? `/login?${s}` : "/login";
}

/**
 * 在需要账号的操作开头调用：游客会被送去登录页并返回 true（调用方直接 return）；已登录返回 false。
 *   const needLogin = useRequireLogin();
 *   const enroll = async () => { if (needLogin()) return; ... };
 */
export function useRequireLogin(): () => boolean {
  const { me } = useMe();
  const { path, search } = useLocation();
  return useCallback(() => {
    if (me.role) return false;
    navigate(loginHref(path + search));
    return true;
  }, [me.role, path, search]);
}

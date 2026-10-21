import type { CurrentUser } from "../env";
import { type Ctx, HttpError } from "../http";

/** 已登录的账号（学员、会长、老师都是）。 */
export function requireUser(c: Ctx): CurrentUser {
  if (c.session?.role !== "member" || !c.user) throw new HttpError(401, "请先登录");
  return c.user;
}

export function memberId(c: Ctx): string {
  return requireUser(c).id;
}

/** 管理员：users.role = 'admin' 的账号，或用 ADMIN_PASSWORD 登录的初始化会话。 */
export function requireAdmin(c: Ctx): { userId: string | null } {
  if (c.session?.role === "admin") return { userId: null };
  if (c.session?.role === "member" && c.user?.role === "admin") return { userId: c.user.id };
  if (!c.session) throw new HttpError(401, "请先登录");
  throw new HttpError(403, "这个操作需要管理员账号");
}

export function isAdmin(c: Ctx): boolean {
  return c.session?.role === "admin" || (c.session?.role === "member" && c.user?.role === "admin");
}

export const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

import type { CurrentUser } from "../env";
import { type Ctx, HttpError } from "../http";

/** 已登录的账号（学员、会长、老师都是）。游客调用时返回 401。 */
export function requireUser(c: Ctx): CurrentUser {
  if (!c.user) throw new HttpError(401, "请先登录");
  return c.user;
}

export function memberId(c: Ctx): string {
  return requireUser(c).id;
}

/** 当前账号的 id；游客是 null。给游客也能看的接口用。 */
export function viewerId(c: Ctx): string | null {
  return c.user?.id ?? null;
}

/** 管理员：users.role = 'admin' 的账号（会长、老师）。 */
export function requireAdmin(c: Ctx): { userId: string } {
  const u = requireUser(c);
  if (u.role !== "admin") throw new HttpError(403, "这个操作需要管理员账号");
  return { userId: u.id };
}

/** 签到这类只给校内账号的功能 */
export function requireCampus(c: Ctx): string {
  const u = requireUser(c);
  if (u.kind !== "campus") throw new HttpError(403, "校外账号不用签到");
  return u.id;
}

/** 能不能看到成员真名（“谁也在学”、报名名单、发布人）：校内账号和管理员能，游客和校外账号不能 */
export function seesNames(c: Ctx): boolean {
  return !!c.user && (c.user.kind === "campus" || c.user.role === "admin");
}

export function isAdmin(c: Ctx): boolean {
  return c.user?.role === "admin";
}

export const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

import { z } from "zod";
import { getSetting } from "../db";
import { HttpError, type Router, json } from "../http";
import { PasswordError, findByPasscode, findByStudentNoAndPassword, setOwnPassword } from "../members";
import {
  clearCookie,
  clientIp,
  issueSession,
  recordFailure,
  requireSecret,
  safeEqual,
  sha256Hex,
  tooManyFailures,
  wantsAppToken,
} from "../session";
import { memberId } from "./common";

/** 登录、激活、改密码。网页用 Cookie；App 在请求头带 X-Hiana-Client: app 时返回令牌。 */
export function authRoutes(api: Router) {
  api.get("/api/auth/me", async (c) => {
    if (!c.session) return json({ role: null });
    if (c.session.role === "admin") return json({ role: "admin", isAdmin: true, bootstrap: true });
    if (!c.user) {
      c.cookies.push(clearCookie(c.req));
      return json({ role: null });
    }
    const u = c.user;
    return json({
      role: "member",
      isAdmin: u.role === "admin",
      needsPassword: !u.hasPassword,
      member: { id: u.id, studentNo: u.studentNo, name: u.name, className: u.className },
    });
  });

  /** 日常登录：学号（老师可以是自己的账号名）+ 自己设的密码。 */
  api.post("/api/auth/member", async (c) => {
    const { studentNo, password } = z.object({ studentNo: z.string().trim().min(1).max(20), password: z.string().min(1).max(64) }).parse(await c.body());
    const ip = clientIp(c.req);
    if (await tooManyFailures(c.env.DB, ip)) throw new HttpError(429, "试错太多次了，10 分钟后再试");
    const row = await findByStudentNoAndPassword(c.env.DB, studentNo, password);
    if (!row) {
      await recordFailure(c.env.DB, ip);
      throw new HttpError(401, "学号或密码不对。还没设过密码的话，用会长发的口令激活账号");
    }
    const issued = await issueSession(c.env, c.req, { role: "member", uid: row.id });
    c.cookies.push(issued.cookie);
    return json({
      role: "member",
      isAdmin: row.role === "admin",
      needsPassword: false,
      member: { id: row.id, studentNo: row.student_no, name: row.name },
      ...(wantsAppToken(c.req) ? { token: issued.token } : {}),
    });
  });

  /** 第一次使用：用会长发的口令激活账号，之后马上设置密码。 */
  api.post("/api/auth/activate", async (c) => {
    const { code } = z.object({ code: z.string().trim().min(4).max(40) }).parse(await c.body());
    const ip = clientIp(c.req);
    if (await tooManyFailures(c.env.DB, ip)) throw new HttpError(429, "试错太多次了，10 分钟后再试");
    const row = await findByPasscode(c.env.DB, requireSecret(c.env), code);
    if (!row) {
      await recordFailure(c.env.DB, ip);
      throw new HttpError(401, "口令不对或已经用过了。设过密码的同学用学号和密码登录");
    }
    const issued = await issueSession(c.env, c.req, { role: "member", uid: row.id });
    c.cookies.push(issued.cookie);
    return json({
      role: "member",
      needsPassword: true,
      member: { id: row.id, studentNo: row.student_no, name: row.name },
      ...(wantsAppToken(c.req) ? { token: issued.token } : {}),
    });
  });

  /** 设置或修改密码：新密码输两次；已经有密码时要先输当前密码。 */
  api.post("/api/auth/password", async (c) => {
    const uid = memberId(c);
    const input = z.object({ password: z.string().max(64), confirm: z.string().max(64), current: z.string().max(64).optional() }).parse(await c.body());
    try {
      await setOwnPassword(c.env.DB, { userId: uid, ...input });
    } catch (err) {
      if (err instanceof PasswordError) throw new HttpError(400, err.message);
      throw err;
    }
    return json({ ok: true });
  });

  /** 初始化用：还没有任何管理员账号时，用 ADMIN_PASSWORD（或库里的摘要）登录后台，把自己设为管理员。 */
  api.post("/api/auth/admin", async (c) => {
    const { password } = z.object({ password: z.string().min(1).max(200) }).parse(await c.body());
    const secret = requireSecret(c.env);
    const fromEnv = c.env.ADMIN_PASSWORD?.trim();
    const storedHash = fromEnv ? null : await getSetting(c.env.DB, "admin_password_sha256");
    if (!fromEnv && !storedHash) throw new HttpError(500, "还没有设置 ADMIN_PASSWORD。", { config: true });
    const ip = clientIp(c.req);
    if (await tooManyFailures(c.env.DB, ip)) throw new HttpError(429, "试错太多次了，10 分钟后再试");
    const ok = fromEnv ? await safeEqual(secret, password, fromEnv) : await safeEqual(secret, await sha256Hex(password), (storedHash as string).toLowerCase());
    if (!ok) {
      await recordFailure(c.env.DB, ip);
      throw new HttpError(401, "密码不对");
    }
    const issued = await issueSession(c.env, c.req, { role: "admin" });
    c.cookies.push(issued.cookie);
    return json({ role: "admin", isAdmin: true, bootstrap: true });
  });

  api.post("/api/auth/logout", (c) => {
    c.cookies.push(clearCookie(c.req));
    return json({ ok: true });
  });
}

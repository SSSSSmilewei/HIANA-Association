import { z } from "zod";
import { getSetting } from "../db";
import { type Ctx, HttpError, type Router, json } from "../http";
import {
  AccountError,
  type AccountRow,
  findByAccountAndPassword,
  normalizeDisplayName,
  register,
  resetWithCode,
  setDisplayName,
  setOwnPassword,
  touchLastSeen,
} from "../members";
import { clearCookie, clientIp, issueSession, recordFailure, requireSecret, tooManyFailures, wantsAppToken } from "../session";
import { memberId, requireUser } from "./common";

/**
 * 注册、登录、重置密码、改密码。网页用 Cookie；App 在请求头带 X-Hiana-Client: app 时在返回体里拿到令牌。
 * 没登录就是游客：能看首页、课程、公告，不能做需要账号的事。游客不在数据库里留任何记录。
 */

/** 管理员在设置里可以关掉注册（settings.registration_open = "0"）；没设置过时是开放的。 */
export async function registrationOpen(db: D1Database): Promise<boolean> {
  return (await getSetting(db, "registration_open")) !== "0";
}

/** /api/auth/me 里的 member。校外账号的 studentNo 是空字符串（旧版 App 认这个字段）。 */
export function memberJson(u: { id: string; kind: string; studentNo: string; username: string | null; email: string | null; org: string | null; name: string; displayName: string | null; className: string | null }) {
  const external = u.kind === "external";
  return {
    id: u.id,
    kind: external ? "external" : "campus",
    studentNo: external ? "" : u.studentNo,
    username: u.username,
    email: u.email,
    org: u.org,
    name: u.name,
    displayName: u.displayName,
    className: u.className,
  };
}

/** 登录成功：签发会话，返回和 /api/auth/me 一样的结构。 */
async function signedIn(c: Ctx, row: AccountRow) {
  const issued = await issueSession(c.env, c.req, row.id, row.session_version);
  c.cookies.push(issued.cookie);
  return json({
    role: "member",
    isAdmin: row.role === "admin",
    member: memberJson({ ...row, studentNo: row.student_no, displayName: row.display_name, className: row.class_name }),
    ...(wantsAppToken(c.req) ? { token: issued.token } : {}),
  });
}

/** 把账号错误变成 HTTP 错误；邀请码、重置码不对时计入这个 IP 的试错次数。 */
async function accountError(c: Ctx, ip: string, err: unknown): Promise<never> {
  if (err instanceof AccountError) {
    if (err.badCode) await recordFailure(c.env.DB, ip);
    throw new HttpError(err.status, err.message);
  }
  throw err;
}

async function guardTries(c: Ctx): Promise<string> {
  const ip = clientIp(c.req);
  if (await tooManyFailures(c.env.DB, ip)) throw new HttpError(429, "试错太多次了，10 分钟后再试");
  return ip;
}

const Password = z.string().max(64);

export function authRoutes(api: Router) {
  api.get("/api/auth/me", async (c) => {
    if (!c.user) {
      // 带着失效的令牌来（账号停用、密码被重置）：顺手清掉 Cookie
      if (c.cookie("hiana_s")) c.cookies.push(clearCookie(c.req));
      return json({ role: null });
    }
    const u = c.user;
    return json({
      role: "member",
      isAdmin: u.role === "admin",
      member: memberJson(u),
    });
  });

  /** 登录页要知道的：现在开不开放注册。 */
  api.get("/api/auth/options", async (c) => json({ registrationOpen: await registrationOpen(c.env.DB) }));

  /**
   * 登录：账号 + 密码。账号可以是学号（校内）、用户名或邮箱（校外）。管理员也一样。
   * 旧版 App 传的是 studentNo，也认。
   */
  api.post("/api/auth/member", async (c) => {
    const body = z
      .object({ account: z.string().trim().min(1).max(100).optional(), studentNo: z.string().trim().min(1).max(100).optional(), password: z.string().min(1).max(64) })
      .parse(await c.body());
    const account = body.account ?? body.studentNo;
    if (!account) throw new HttpError(400, "请填写账号");
    const ip = await guardTries(c);
    const row = await findByAccountAndPassword(c.env.DB, account, body.password);
    if (!row) {
      await recordFailure(c.env.DB, ip);
      throw new HttpError(401, "账号或密码不对。还没有账号的话，用邀请码注册");
    }
    return signedIn(c, row);
  });

  /**
   * 注册，成功后直接登录。kind 默认 campus。
   *  - 校内：学号（9 位数字）、姓名、班级（选填）
   *  - 校外：用户名、昵称（name）、邮箱和学校 / 单位（选填）
   * 都要密码和对应类型的邀请码。
   */
  api.post("/api/auth/register", async (c) => {
    const input = z
      .object({
        kind: z.enum(["campus", "external"]).optional(),
        studentNo: z.string().max(20).optional(),
        username: z.string().max(40).optional(),
        email: z.string().max(200).optional(),
        org: z.string().max(100).optional(),
        name: z.string().max(60),
        className: z.string().max(60).optional(),
        password: Password,
        confirm: Password,
        invite: z.string().max(40).optional(),
      })
      .parse(await c.body());
    const ip = await guardTries(c);
    let row: AccountRow;
    try {
      row = await register(c.env.DB, requireSecret(c.env), input, { open: await registrationOpen(c.env.DB), firstAdminCode: c.env.FIRST_ADMIN_CODE });
    } catch (err) {
      return accountError(c, ip, err);
    }
    return signedIn(c, row);
  });

  /** 忘记密码：账号（学号 / 用户名 / 邮箱）+ 管理员给的重置码设新密码，成功后直接登录。旧版 App 传 studentNo。 */
  api.post("/api/auth/reset", async (c) => {
    const input = z
      .object({
        account: z.string().trim().min(1).max(100).optional(),
        studentNo: z.string().trim().min(1).max(100).optional(),
        code: z.string().trim().min(4).max(40),
        password: Password,
        confirm: Password,
      })
      .parse(await c.body());
    const account = input.account ?? input.studentNo;
    if (!account) throw new HttpError(400, "请填写账号");
    const ip = await guardTries(c);
    let row: AccountRow;
    try {
      row = await resetWithCode(c.env.DB, requireSecret(c.env), { account, code: input.code, password: input.password, confirm: input.confirm });
    } catch (err) {
      return accountError(c, ip, err);
    }
    return signedIn(c, row);
  });

  /** 修改密码：要先输当前密码。改完后其他设备退出登录，当前设备换一个新令牌继续用。 */
  api.post("/api/auth/password", async (c) => {
    const u = requireUser(c);
    const input = z.object({ current: Password, password: Password, confirm: Password }).parse(await c.body());
    const ip = await guardTries(c);
    let version: number;
    try {
      version = await setOwnPassword(c.env.DB, { userId: u.id, ...input });
    } catch (err) {
      if (err instanceof AccountError && err.message === "当前密码不对") await recordFailure(c.env.DB, ip);
      return accountError(c, ip, err);
    }
    const issued = await issueSession(c.env, c.req, u.id, version);
    c.cookies.push(issued.cookie);
    return json({ ok: true, ...(wantsAppToken(c.req) ? { token: issued.token } : {}) });
  });

  api.post("/api/auth/logout", (c) => {
    c.cookies.push(clearCookie(c.req));
    return json({ ok: true });
  });

  /**
   * 修改自己的显示名（只用于首页欢迎语，真名不变）。传空字符串恢复为真名。
   * 返回 displayName（null 表示用真名）。
   */
  api.put("/api/me/display-name", async (c) => {
    const uid = memberId(c);
    const { displayName } = z.object({ displayName: z.string().max(200) }).parse(await c.body());
    const r = normalizeDisplayName(displayName);
    if ("error" in r) throw new HttpError(400, r.error);
    await setDisplayName(c.env.DB, uid, r.value);
    return json({ displayName: r.value });
  });

  /** 首页打开时调用：返回上一次访问时间（毫秒，从没来过是 null），然后记下这次（每小时最多写一次）。 */
  api.post("/api/me/visit", async (c) => {
    const u = requireUser(c);
    return json({ lastSeenAt: await touchLastSeen(c.env.DB, u.id) });
  });
}

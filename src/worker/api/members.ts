import { z } from "zod";
import { cnDate } from "../../shared/heatmap";
import { getSetting, setSetting } from "../db";
import { PROVIDERS, ProviderError } from "../heatmap/providers";
import { bindSource, listBindings, loadSeries, syncUser, unbindSource } from "../heatmap/store";
import { HttpError, type Router, json } from "../http";
import { idleMembers, importMembers, listMembers, parseRoster, resetPasscode, setMemberRole, setMemberStatus } from "../members";
import { requireSecret } from "../session";
import { DAY_RE, memberId, requireAdmin, requireUser } from "./common";

const publicProviders = () =>
  PROVIDERS.map((p) => ({
    id: p.id,
    label: p.label,
    unit: p.unit,
    category: p.category,
    status: p.status,
    coverage: p.coverage,
    handleHint: p.handleHint,
    needsUserSecret: p.needsUserSecret ?? null,
  }));

/** 教学周：会长在后台设置开学日（第 1 周的周一），没设时不显示周次。 */
export function teachingWeek(semesterStart: string | null, today: string): number | null {
  if (!semesterStart || !DAY_RE.test(semesterStart)) return null;
  const diff = Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${semesterStart}T00:00:00Z`)) / 86_400_000);
  if (diff < 0) return null;
  const week = Math.floor(diff / 7) + 1;
  return week <= 30 ? week : null;
}

export function memberRoutes(api: Router) {
  /* ---------- 热力图 ---------- */

  api.get("/api/heatmap", async (c) => {
    const uid = memberId(c);
    const [series, bindings] = await Promise.all([loadSeries(c.env.DB, uid), listBindings(c.env.DB, uid)]);
    return json({ today: cnDate(Date.now()), series, bindings, providers: publicProviders() });
  });

  api.post("/api/heatmap/bindings", async (c) => {
    const uid = memberId(c);
    const input = z
      .object({ source: z.string().max(32), handle: z.string().trim().min(1).max(64), secret: z.string().trim().max(400).optional() })
      .parse(await c.body());
    try {
      await bindSource(c.env.DB, requireSecret(c.env), { userId: uid, ...input });
    } catch (err) {
      if (err instanceof ProviderError) throw new HttpError(400, err.message);
      throw err;
    }
    const synced = await syncUser(c.env.DB, { ...c.env, SESSION_SECRET: requireSecret(c.env) }, uid, (u, i) => fetch(u, i));
    const mine = synced.find((s) => s.source === input.source);
    return json({ ok: true, error: mine?.error ?? null, days: mine ? Object.keys(mine.days).length : 0 });
  });

  api.delete("/api/heatmap/bindings/:source", async (c) => {
    await unbindSource(c.env.DB, memberId(c), c.params.source);
    return json({ ok: true });
  });

  /* ---------- 公共设置 ---------- */

  /** 教学周和问候语用的信息。 */
  api.get("/api/calendar", async (c) => {
    requireUser(c);
    const today = cnDate(Date.now());
    const start = await getSetting(c.env.DB, "semester_start");
    return json({ today, semesterStart: start, week: teachingWeek(start, today) });
  });

  /**
   * App 启动时检查更新。会长在 settings 表里改这三项即可，不用重新部署：
   *  app_latest_version（如 1.0.1）、app_min_version（低于它就强制更新）、app_apk_url（APK 下载地址）。
   */
  api.get("/api/app/version", async (c) => {
    const [latest, min, apk] = await Promise.all([
      getSetting(c.env.DB, "app_latest_version"),
      getSetting(c.env.DB, "app_min_version"),
      getSetting(c.env.DB, "app_apk_url"),
    ]);
    return json({ latest: latest ?? "1.0.0", min: min ?? "1.0.0", apkUrl: apk ?? null });
  });

  /* ---------- 管理员：成员 ---------- */

  api.get("/api/admin/members", async (c) => {
    requireAdmin(c);
    return json(await listMembers(c.env.DB));
  });

  api.post("/api/admin/members/import", async (c) => {
    requireAdmin(c);
    const { text } = z.object({ text: z.string().max(100_000) }).parse(await c.body());
    const { rows, errors } = parseRoster(text);
    if (rows.length === 0) throw new HttpError(400, errors[0] ?? "没有识别到成员。每行写“学号 姓名 班级”。", { errors });
    const result = await importMembers(c.env.DB, requireSecret(c.env), rows);
    return json({ ...result, errors });
  });

  api.post("/api/admin/members/:id/reset", async (c) => {
    requireAdmin(c);
    const passcode = await resetPasscode(c.env.DB, requireSecret(c.env), c.params.id);
    if (!passcode) throw new HttpError(404, "找不到这个成员");
    return json({ passcode });
  });

  api.post("/api/admin/members/:id/status", async (c) => {
    const { userId } = requireAdmin(c);
    const { status } = z.object({ status: z.enum(["active", "archived"]) }).parse(await c.body());
    if (userId === c.params.id && status === "archived") throw new HttpError(400, "不能停用自己的账号");
    await setMemberStatus(c.env.DB, c.params.id, status);
    return json({ ok: true });
  });

  /** 设为管理员（会长、老师）或改回成员。不能把自己改回成员，避免把后台锁死。 */
  api.post("/api/admin/members/:id/role", async (c) => {
    const { userId } = requireAdmin(c);
    const { role } = z.object({ role: z.enum(["member", "admin"]) }).parse(await c.body());
    if (userId === c.params.id && role === "member") throw new HttpError(400, "不能取消自己的管理员身份，请让另一位管理员操作");
    if (!(await setMemberRole(c.env.DB, c.params.id, role))) throw new HttpError(404, "找不到这个成员");
    return json({ ok: true });
  });

  api.get("/api/admin/idle", async (c) => {
    requireAdmin(c);
    const days = Math.min(60, Math.max(1, Number(c.url.searchParams.get("days") ?? 7) || 7));
    return json(idleMembers(await listMembers(c.env.DB), days));
  });

  api.get("/api/admin/settings", async (c) => {
    requireAdmin(c);
    const keys = ["semester_start", "app_latest_version", "app_min_version", "app_apk_url"];
    const values = await Promise.all(keys.map((k) => getSetting(c.env.DB, k)));
    return json(Object.fromEntries(keys.map((k, i) => [k, values[i]])));
  });

  api.put("/api/admin/settings", async (c) => {
    requireAdmin(c);
    const body = z
      .object({
        semester_start: z.string().regex(DAY_RE, "开学日期格式是 2026-09-07").optional(),
        app_latest_version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
        app_min_version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
        app_apk_url: z.string().url().max(400).optional(),
      })
      .parse(await c.body());
    for (const [k, v] of Object.entries(body)) if (v !== undefined) await setSetting(c.env.DB, k, v);
    return json({ ok: true });
  });
}

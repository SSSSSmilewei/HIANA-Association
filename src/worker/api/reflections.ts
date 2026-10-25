import { z } from "zod";
import { addDays, cnDate } from "../../shared/heatmap";
import { recordActivityOnce } from "../activity";
import { HttpError, type Router, json } from "../http";
import { DAY_RE, memberId } from "./common";

/**
 * 晨思夜思：早上写今天要做什么，晚上写做了什么。课程表 App 的“晨间 / 晚间一分钟”写完会同步到这里，
 * 每个时段算一条“晨思夜思”记录进热力图。同一天同一时段再写就覆盖，热力图不重复计。
 */
export function reflectionRoutes(api: Router) {
  api.put("/api/reflections/:day/:slot", async (c) => {
    const uid = memberId(c);
    const day = c.params.day;
    const slot = c.params.slot;
    if (!DAY_RE.test(day)) throw new HttpError(400, "日期格式是 2026-10-25");
    if (slot !== "morning" && slot !== "evening") throw new HttpError(400, "时段只能是 morning 或 evening");
    const today = cnDate(Date.now());
    // 允许补写昨天（晚上过了零点才写的情况），不能写未来
    if (day > today || day < addDays(today, -1)) throw new HttpError(400, "只能写今天或昨天的");
    const { text, source } = z.object({ text: z.string().trim().min(1, "写一句再保存").max(2000), source: z.string().max(40).optional() }).parse(await c.body());
    const now = Date.now();
    await c.env.DB.prepare(
      `INSERT INTO reflections (user_id, day, slot, text, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, day, slot) DO UPDATE SET text = excluded.text, source = excluded.source, updated_at = excluded.updated_at`,
    )
      .bind(uid, day, slot, text, source ?? null, now)
      .run();
    await recordActivityOnce(c.env.DB, uid, "reflect", `${day}/${slot}`, day === today ? now : Date.parse(`${day}T23:00:00+08:00`));
    return json({ ok: true });
  });

  /** 最近的晨思夜思（默认 30 天），新的在前。 */
  api.get("/api/reflections", async (c) => {
    const uid = memberId(c);
    const days = Math.min(365, Math.max(1, Number(c.url.searchParams.get("days") ?? 30) || 30));
    const from = addDays(cnDate(Date.now()), -(days - 1));
    const rows = await c.env.DB.prepare("SELECT day, slot, text, updated_at FROM reflections WHERE user_id = ? AND day >= ? ORDER BY day DESC, slot DESC")
      .bind(uid, from)
      .all<{ day: string; slot: string; text: string; updated_at: number }>();
    return json(rows.results.map((r) => ({ day: r.day, slot: r.slot, text: r.text, updatedAt: r.updated_at })));
  });
}

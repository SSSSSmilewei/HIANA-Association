import { type Daily, cnDate } from "../shared/heatmap";

/**
 * 站内学习记录。每做一件学习相关的事记一条，热力图“协会平台”那一行按天汇总。
 * 只记“做了什么”，不记停留时长，也不算连续天数。
 */
export type ActivityKind =
  | "checkin" // 晚自习打卡
  | "lesson" // 完成一个课时
  | "exercise" // 练习做对
  | "ask" // 提问
  | "answer" // 回答别人
  | "plan" // 发布学习规划
  | "post"; // 发布内容

export async function recordActivity(db: D1Database, userId: string, kind: ActivityKind, ref: string | null = null, now = Date.now()) {
  await db
    .prepare("INSERT INTO activity_events (user_id, day, kind, ref, at) VALUES (?, ?, ?, ?, ?)")
    .bind(userId, cnDate(now), kind, ref, now)
    .run();
}

/** 同一件事（同一个课时、同一道题）一天只记一次，避免反复点刷出深色格子。 */
export async function recordActivityOnce(db: D1Database, userId: string, kind: ActivityKind, ref: string, now = Date.now()): Promise<boolean> {
  const day = cnDate(now);
  const seen = await db
    .prepare("SELECT 1 AS x FROM activity_events WHERE user_id = ? AND day = ? AND kind = ? AND ref = ? LIMIT 1")
    .bind(userId, day, kind, ref)
    .first<{ x: number }>();
  if (seen) return false;
  await recordActivity(db, userId, kind, ref, now);
  return true;
}

export async function siteDaily(db: D1Database, userId: string, fromDay: string): Promise<Daily> {
  const rows = await db
    .prepare("SELECT day, COUNT(*) AS n FROM activity_events WHERE user_id = ? AND day >= ? GROUP BY day")
    .bind(userId, fromDay)
    .all<{ day: string; n: number }>();
  const out: Daily = {};
  for (const r of rows.results) out[r.day] = r.n;
  return out;
}

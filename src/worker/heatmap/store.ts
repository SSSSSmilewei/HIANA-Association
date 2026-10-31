import { type Daily, type SourceSeries, addDays, cnDate } from "../../shared/heatmap";
import { siteDailyByCategory } from "../activity";
import { attendanceDailyMinutes } from "../attendance";
import { openSecret, sealSecret } from "../secret-box";
import { type Fetch, PROVIDERS, ProviderError, getProvider } from "./providers";
import { syncBindings } from "./sync";

/**
 * 热力图的数据库读写：绑定外部平台、同步、读出一个人的全部热力图数据。
 */

export interface BindingRow {
  source: string;
  handle: string;
  hasSecret: boolean;
  syncedAt: number | null;
  lastError: string | null;
}

export async function listBindings(db: D1Database, userId: string): Promise<BindingRow[]> {
  const rows = await db
    .prepare("SELECT source, handle, secret_enc, synced_at, last_error FROM bindings WHERE user_id = ? ORDER BY created_at")
    .bind(userId)
    .all<{ source: string; handle: string; secret_enc: string | null; synced_at: number | null; last_error: string | null }>();
  return rows.results.map((r) => ({ source: r.source, handle: r.handle, hasSecret: !!r.secret_enc, syncedAt: r.synced_at, lastError: r.last_error }));
}

export async function bindSource(
  db: D1Database,
  sessionSecret: string,
  input: { userId: string; source: string; handle: string; secret?: string },
  now = Date.now(),
) {
  const p = getProvider(input.source);
  if (!p) throw new ProviderError("不支持这个平台");
  if (p.status === "pending") throw new ProviderError(`${p.label} 暂不支持`);
  const handle = input.handle.trim();
  if (!handle || handle.length > 64) throw new ProviderError("请填写用户名");
  if (p.needsUserSecret && !input.secret?.trim()) {
    // 改用户名时可以不重填令牌，沿用已经存的
    const had = await db.prepare("SELECT secret_enc FROM bindings WHERE user_id = ? AND source = ?").bind(input.userId, p.id).first<{ secret_enc: string | null }>();
    if (!had?.secret_enc) throw new ProviderError(`${p.label} 需要令牌：${p.needsUserSecret}`);
  }
  const sealed = input.secret?.trim() ? await sealSecret(sessionSecret, input.secret.trim()) : null;
  await db
    .prepare(
      `INSERT INTO bindings (user_id, source, handle, secret_enc, created_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, source) DO UPDATE SET handle = excluded.handle,
         secret_enc = COALESCE(excluded.secret_enc, bindings.secret_enc), last_error = NULL`,
    )
    .bind(input.userId, p.id, handle, sealed, now)
    .run();
}

/** 解绑时连同攒下的历史一起删掉。 */
export async function unbindSource(db: D1Database, userId: string, source: string) {
  await db.batch([
    db.prepare("DELETE FROM bindings WHERE user_id = ? AND source = ?").bind(userId, source),
    db.prepare("DELETE FROM external_daily WHERE user_id = ? AND source = ?").bind(userId, source),
  ]);
}

/** 同步一个人的所有外部平台，结果写进 external_daily（只增改不删除）。 */
export async function syncUser(
  db: D1Database,
  env: { SESSION_SECRET: string; GITHUB_TOKEN?: string; WAKATIME_KEY?: string },
  userId: string,
  fetch: Fetch,
  now = Date.now(),
): Promise<SourceSeries[]> {
  const rows = await db
    .prepare("SELECT source, handle, secret_enc FROM bindings WHERE user_id = ?")
    .bind(userId)
    .all<{ source: string; handle: string; secret_enc: string | null }>();
  const bindings = await Promise.all(
    rows.results.map(async (r) => ({ source: r.source, handle: r.handle, secret: r.secret_enc ? (await openSecret(env.SESSION_SECRET, r.secret_enc)) ?? undefined : undefined })),
  );
  const sinceSeconds = Math.floor(Date.parse(`${addDays(cnDate(now), -371)}T00:00:00+08:00`) / 1000);
  const series = await syncBindings(bindings, { fetch, sinceSeconds, secrets: { GITHUB_TOKEN: env.GITHUB_TOKEN, WAKATIME_KEY: env.WAKATIME_KEY } }, now);
  const stmts: D1PreparedStatement[] = [];
  for (const s of series) {
    for (const [day, count] of Object.entries(s.days))
      stmts.push(
        db
          .prepare("INSERT INTO external_daily (user_id, source, day, count) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, source, day) DO UPDATE SET count = excluded.count")
          .bind(userId, s.source, day, count),
      );
    stmts.push(db.prepare("UPDATE bindings SET synced_at = ?, last_error = ? WHERE user_id = ? AND source = ?").bind(now, s.error ?? null, userId, s.source));
  }
  // D1 一次 batch 的语句数有上限，分批写
  for (let i = 0; i < stmts.length; i += 400) await db.batch(stmts.slice(i, i + 400));
  return series;
}

/** 读出一个人的热力图：协会平台一行 + 每个绑定的外部平台一行（含同步失败的原因）。 */
export async function loadSeries(db: D1Database, userId: string, today = cnDate(Date.now())): Promise<SourceSeries[]> {
  const from = addDays(today, -371);
  const [site, minutes, bindings, daily] = await Promise.all([
    siteDailyByCategory(db, userId, from),
    attendanceDailyMinutes(db, userId, from),
    listBindings(db, userId),
    db
      .prepare("SELECT source, day, count FROM external_daily WHERE user_id = ? AND day >= ?")
      .bind(userId, from)
      .all<{ source: string; day: string; count: number }>(),
  ]);
  const bySource = new Map<string, Daily>();
  for (const r of daily.results) {
    const d = bySource.get(r.source) ?? {};
    d[r.day] = r.count;
    bySource.set(r.source, d);
  }
  // 站内记录各占一行：协会学习时长（签到到签退）、晨思夜思、站内学习
  const out: SourceSeries[] = [
    { source: "site:attendance", label: "协会学习时长", unit: "分钟", days: minutes, group: "attendance" },
    { source: "site:reflection", label: "晨思夜思", unit: "次", days: site.reflection, group: "reflection" },
    { source: "site:study", label: "站内学习", unit: "次学习记录", days: site.study, group: "study" },
  ];
  const order = new Map(PROVIDERS.map((p, i) => [p.id, i]));
  for (const b of [...bindings].sort((x, y) => (order.get(x.source) ?? 99) - (order.get(y.source) ?? 99))) {
    const p = getProvider(b.source);
    out.push({
      source: b.source,
      label: p?.label ?? b.source,
      unit: p?.unit ?? "",
      days: bySource.get(b.source) ?? {},
      error: b.lastError ?? undefined,
      syncedAt: b.syncedAt ?? undefined,
      group: "external",
    });
  }
  return out;
}

/** 定时任务：每天给所有绑定了平台的成员同步一次。按人串行，避免同时打太多外部请求。 */
export async function syncEveryone(
  db: D1Database,
  env: { SESSION_SECRET: string; GITHUB_TOKEN?: string; WAKATIME_KEY?: string },
  fetch: Fetch,
  now = Date.now(),
): Promise<{ users: number; failures: number }> {
  const users = await db
    .prepare("SELECT DISTINCT b.user_id FROM bindings b JOIN users u ON u.id = b.user_id WHERE u.status = 'active'")
    .all<{ user_id: string }>();
  let failures = 0;
  for (const u of users.results) {
    const series = await syncUser(db, env, u.user_id, fetch, now);
    failures += series.filter((s) => s.error).length;
  }
  return { users: users.results.length, failures };
}

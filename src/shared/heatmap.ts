/**
 * 统一热力图：把站内学习记录和各个外部平台（GitHub、力扣、Codeforces……）的
 * 每日活动数合并成同一种格式，前后端共用。
 *
 * 约定：
 *  - 日期一律用北京时间（UTC+8）的 "YYYY-MM-DD"。
 *  - 每个来源各自算颜色深浅（提交数和做题数单位不同，不能直接相加）。
 *  - 总览那一行取“当天各来源里最深的一档”，并记下当天有几个来源有活动。
 */

export type Daily = Record<string, number>; // "2026-10-21" → 当天次数

export interface SourceSeries {
  source: string; // provider id，例如 "github"
  label: string; // 显示名，例如 "GitHub"
  unit: string; // 例如 "次提交"
  days: Daily;
  error?: string; // 同步失败时的原因；失败不影响其他来源
  syncedAt?: number;
  /** 分类：站内的签到 / 晨思夜思 / 学习，或外部平台。热力图可以按分类开关。 */
  group?: "attendance" | "reflection" | "study" | "external";
}

export type Level = 0 | 1 | 2 | 3 | 4;

const DAY_MS = 86_400_000;
const CN_OFFSET_MS = 8 * 3_600_000;

/** Unix 毫秒 → 北京时间日期字符串。 */
export function cnDate(ms: number): string {
  return new Date(ms + CN_OFFSET_MS).toISOString().slice(0, 10);
}

/** Unix 秒 → 北京时间日期字符串。 */
export function cnDateFromSeconds(sec: number): string {
  return cnDate(sec * 1000);
}

/** 日期字符串加减天数。 */
export function addDays(date: string, n: number): string {
  const t = Date.parse(`${date}T00:00:00Z`) + n * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}

/** 星期几，周一 = 0 … 周日 = 6（国内习惯周一开头）。 */
export function weekdayMon0(date: string): number {
  const d = new Date(`${date}T00:00:00Z`).getUTCDay(); // 周日 = 0
  return (d + 6) % 7;
}

/** 把一串时间戳（秒）按北京时间日期计数。 */
export function countBySecond(seconds: Iterable<number>): Daily {
  const out: Daily = {};
  for (const s of seconds) {
    if (!Number.isFinite(s)) continue;
    const k = cnDateFromSeconds(s);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export function addDaily(a: Daily, b: Daily): Daily {
  const out: Daily = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = (out[k] ?? 0) + v;
  return out;
}

/** 只保留 [from, to] 之间的日期（含两端）。 */
export function clip(days: Daily, from: string, to: string): Daily {
  const out: Daily = {};
  for (const [k, v] of Object.entries(days)) if (k >= from && k <= to && v > 0) out[k] = v;
  return out;
}

/**
 * 颜色分档：0 是没有活动；其余按这个来源自己的非零天数的四分位分成 1–4 档，
 * 和 GitHub 的做法一致。这样一个月只提交几次的人也能看到深浅变化。
 */
export function levelScale(days: Daily): (count: number) => Level {
  const values = Object.values(days)
    .filter((v) => v > 0)
    .sort((x, y) => x - y);
  if (values.length === 0) return () => 0;
  const q = (p: number) => values[Math.floor(p * (values.length - 1))];
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  const max = values[values.length - 1];
  return (count) => {
    if (count <= 0) return 0;
    if (count >= max) return 4; // 这个来源最活跃的那几天总是最深
    if (count <= q1) return 1;
    if (count <= q2) return 2;
    if (count <= q3) return 3;
    return 4;
  };
}

export interface Cell {
  date: string;
  count: number; // 单个来源：次数；总览：有活动的来源个数
  level: Level;
  inRange: boolean; // 第一列/最后一列里落在范围外的格子
}

export interface Grid {
  from: string;
  to: string;
  weeks: Cell[][]; // 每列一周，周一在上
  monthLabels: { week: number; label: string }[];
  activeDays: number;
  total: number;
}

const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

/** 截止到 to（含）往前 weeks 周的网格。 */
export function buildGrid(days: Daily, to: string, weeks = 53, levelOf?: (date: string, count: number) => Level): Grid {
  const lastMonday = addDays(to, -weekdayMon0(to));
  const firstMonday = addDays(lastMonday, -(weeks - 1) * 7);
  const scale = levelScale(clip(days, firstMonday, to));
  const lv = levelOf ?? ((_d: string, c: number) => scale(c));
  const cols: Cell[][] = [];
  const monthLabels: { week: number; label: string }[] = [];
  let activeDays = 0;
  let total = 0;
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const col: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(firstMonday, w * 7 + d);
      const inRange = date <= to;
      const count = inRange ? days[date] ?? 0 : 0;
      if (inRange && count > 0) {
        activeDays++;
        total += count;
      }
      col.push({ date, count, level: inRange ? lv(date, count) : 0, inRange });
    }
    const month = Number(col[0].date.slice(5, 7)) - 1;
    if (month !== lastMonth) {
      // 太靠近上一个标签就不标，免得挤在一起
      if (monthLabels.length === 0 || w - monthLabels[monthLabels.length - 1].week >= 3) monthLabels.push({ week: w, label: MONTHS[month] });
      lastMonth = month;
    }
    cols.push(col);
  }
  return { from: firstMonday, to, weeks: cols, monthLabels, activeDays, total };
}

/**
 * 总览：每天取各来源里最深的一档；count 记有活动的来源个数。
 * 失败的来源（有 error）不参与。
 */
export function overview(series: SourceSeries[], to: string, weeks = 53): Grid {
  const ok = series.filter((s) => !s.error);
  const grids = ok.map((s) => buildGrid(s.days, to, weeks));
  const sources: Daily = {};
  const best = new Map<string, Level>();
  for (const g of grids) {
    for (const col of g.weeks) {
      for (const c of col) {
        if (!c.inRange || c.count === 0) continue;
        sources[c.date] = (sources[c.date] ?? 0) + 1;
        best.set(c.date, Math.max(best.get(c.date) ?? 0, c.level) as Level);
      }
    }
  }
  return buildGrid(sources, to, weeks, (date) => best.get(date) ?? 0);
}

/** 最近 n 天（含今天）一次活动都没有？给会长后台的“最近没动静”名单用。 */
export function idleFor(series: SourceSeries[], today: string, n: number): boolean {
  const from = addDays(today, -(n - 1));
  return series.every((s) => Object.keys(clip(s.days, from, today)).length === 0);
}

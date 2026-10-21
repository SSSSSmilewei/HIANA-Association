import { type Daily, type SourceSeries, addDays, cnDate } from "../../shared/heatmap";
import { type ProviderContext, ProviderError, getProvider } from "./providers";

/**
 * 同步一个学员绑定的所有外部平台。
 * 一个平台失败只记在它自己的 error 里，不影响其他平台和站内记录。
 * 定时任务每天跑一次；学员绑定新平台时也可以立即跑一次。
 */

export interface Binding {
  source: string; // provider id
  handle: string;
  secret?: string; // 已解密的学员令牌（只在内存里）
}

const TIMEOUT_MS = 10_000;

export async function syncBindings(bindings: Binding[], ctx: ProviderContext, now = Date.now()): Promise<SourceSeries[]> {
  return Promise.all(
    bindings.map(async (b): Promise<SourceSeries> => {
      const p = getProvider(b.source);
      if (!p) return { source: b.source, label: b.source, unit: "", days: {}, error: "未知的平台", syncedAt: now };
      try {
        const days = await withTimeout(p.fetchDaily(b.handle, { ...ctx, userSecret: b.secret, now }), TIMEOUT_MS, `${p.label} 超时`);
        return { source: p.id, label: p.label, unit: p.unit, days: sanitize(days, cnDate(now)), syncedAt: now };
      } catch (err) {
        const msg = err instanceof ProviderError ? err.message : `${p.label} 同步失败`;
        if (!(err instanceof ProviderError)) console.error(JSON.stringify({ msg: "heatmap provider crashed", source: p.id, error: String(err) }));
        return { source: p.id, label: p.label, unit: p.unit, days: {}, error: msg, syncedAt: now };
      }
    }),
  );
}

/** 去掉非法日期、负数和明显离谱的值；只保留最近一年多。 */
export function sanitize(days: Daily, today = cnDate(Date.now())): Daily {
  const from = addDays(today, -400);
  const out: Daily = {};
  for (const [k, v] of Object.entries(days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || k < from || k > today) continue;
    const n = Math.floor(Number(v));
    if (n > 0 && n < 100_000) out[k] = n;
  }
  return out;
}

function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new ProviderError(message)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

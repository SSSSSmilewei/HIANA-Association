import { useCallback, useEffect, useRef, useState } from "react";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: init.body === undefined ? undefined : { "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("连不上服务器，检查一下网络", 0);
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const d = (data ?? {}) as { error?: string; issues?: string[] };
    const msg = d.error ?? (res.status >= 500 ? "服务器出了点问题，稍后再试" : `请求失败（${res.status}）`);
    throw new ApiError(msg, res.status, data as Record<string, unknown>);
  }
  return data as T;
}

/*
 * 读接口用的小缓存：先给上次的数据（页面马上有内容），同时悄悄重新请求。
 * mutate / invalidate 让改动后相关页面自动刷新。
 */
interface Entry {
  data?: unknown;
  error?: ApiError;
  at: number;
  promise?: Promise<unknown>;
}
const cache = new Map<string, Entry>();
const subs = new Map<string, Set<() => void>>();

function notify(key: string) {
  for (const fn of subs.get(key) ?? []) fn();
}

function load(key: string) {
  const e = cache.get(key) ?? { at: 0 };
  if (e.promise) return e.promise;
  const p = api<unknown>(key)
    .then((data) => {
      cache.set(key, { data, at: Date.now() });
    })
    .catch((error: ApiError) => {
      cache.set(key, { data: e.data, error, at: Date.now() });
    })
    .finally(() => notify(key));
  cache.set(key, { ...e, promise: p });
  return p;
}

/** 直接改缓存里的数据（乐观更新），不发请求。 */
export function mutate<T>(key: string, fn: (old: T | undefined) => T | undefined) {
  const e = cache.get(key);
  cache.set(key, { ...e, at: e?.at ?? 0, data: fn(e?.data as T | undefined), error: undefined });
  notify(key);
}

/** 让以 prefix 开头的缓存失效并重新请求（正在显示的会自动刷新）。 */
export function invalidate(...prefixes: string[]) {
  for (const key of [...cache.keys()]) {
    if (prefixes.some((p) => key.startsWith(p))) {
      if (subs.get(key)?.size) void load(key);
      else cache.delete(key);
    }
  }
}

export function clearCache() {
  cache.clear();
}

export function useApi<T>(path: string | null, opts: { refreshMs?: number } = {}) {
  const [, force] = useState(0);
  const pathRef = useRef(path);
  pathRef.current = path;

  useEffect(() => {
    if (!path) return;
    const fn = () => force((n) => n + 1);
    const set = subs.get(path) ?? new Set();
    set.add(fn);
    subs.set(path, set);
    const e = cache.get(path);
    if (!e || Date.now() - e.at > 2000) void load(path);
    let timer: ReturnType<typeof setInterval> | undefined;
    if (opts.refreshMs) timer = setInterval(() => document.visibilityState === "visible" && load(path), opts.refreshMs);
    const onFocus = () => document.visibilityState === "visible" && load(path);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      set.delete(fn);
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [path, opts.refreshMs]);

  const e = path ? cache.get(path) : undefined;
  const reload = useCallback(() => {
    if (pathRef.current) return load(pathRef.current);
  }, []);
  return {
    data: e?.data as T | undefined,
    error: e?.data === undefined ? e?.error : undefined,
    staleError: e?.error,
    loading: !!path && e?.data === undefined && !e?.error,
    reload,
  };
}

/* ---------- 日期和时间（一律北京时间） ---------- */

const CN = 8 * 3_600_000;
const WD = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export function cnToday(now = Date.now()): string {
  return new Date(now + CN).toISOString().slice(0, 10);
}
export function clock(ms: number): string {
  return new Date(ms + CN).toISOString().slice(11, 16);
}
export function weekday(day: string): string {
  const d = new Date(`${day}T00:00:00Z`).getUTCDay();
  return WD[(d + 6) % 7];
}
/** "2026-10-21" → "10 月 21 日 周三" */
export function longDay(day: string, withWeekday = true): string {
  const [, m, d] = day.split("-").map(Number);
  return `${m} 月 ${d} 日${withWeekday ? ` ${weekday(day)}` : ""}`;
}
/** "2026-10-21" → "10/21" */
export function shortDay(day: string): string {
  const [, m, d] = day.split("-");
  return `${m}/${d}`;
}
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
export function relativeTime(ms: number): string {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} 小时前`;
  return longDay(cnToday(ms), false);
}
export function minutesText(min: number): string {
  if (min < 60) return `${min} 分钟`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
}

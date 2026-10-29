import { type CourseMeta, pagePath } from "../shared/courses";
import { light } from "../shared/light";
import type { CoursePackage, Item, Practice } from "../shared/package";

/**
 * 课程包从哪来：
 *   builtin    仓库自带：/learn/<slug>/course.json（正文在 .md），导出用 /packages/<slug>.json
 *   published  管理员发布：/api/packages/<slug>（正文写在包里）
 *   local      本机导入：存在这台设备的 IndexedDB，进度存 localStorage，地址是 /courses/local-<slug>
 */

export const LOCAL_PREFIX = "local-";
export const isLocalSlug = (s: string) => s.startsWith(LOCAL_PREFIX);

/* ---------- IndexedDB（本机导入的课程包） ---------- */

const DB_NAME = "hiana-courses";
const STORE = "packages";

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "slug" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const r = fn(db.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function localPackages(): Promise<CoursePackage[]> {
  try {
    return (await tx<CoursePackage[]>("readonly", (s) => s.getAll())) ?? [];
  } catch {
    return [];
  }
}

export async function saveLocal(pkg: CoursePackage) {
  await tx("readwrite", (s) => s.put(pkg));
  localListeners.forEach((fn) => fn());
}

export async function removeLocal(slug: string) {
  await tx("readwrite", (s) => s.delete(slug));
  try {
    const all = readLocalState();
    delete all[slug];
    localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(all));
  } catch {
    /* 忽略 */
  }
  localListeners.forEach((fn) => fn());
}

const localListeners = new Set<() => void>();
export function onLocalChange(fn: () => void) {
  localListeners.add(fn);
  return () => {
    localListeners.delete(fn);
  };
}

export function localMeta(pkg: CoursePackage): CourseMeta & { local: true } {
  return { ...light(pkg), slug: LOCAL_PREFIX + pkg.slug, local: true };
}

/* ---------- 本机课程的进度 ---------- */

const LOCAL_STATE_KEY = "hiana-local-progress";
export interface LocalState {
  done: Record<string, number>;
  solved: Record<string, string[]>;
}

function readLocalState(): Record<string, LocalState> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STATE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function localState(slug: string): LocalState {
  const s = readLocalState()[slug];
  return { done: s?.done ?? {}, solved: s?.solved ?? {} };
}

export function writeLocalState(slug: string, fn: (s: LocalState) => LocalState) {
  const all = readLocalState();
  all[slug] = fn(localState(slug));
  try {
    localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(all));
  } catch {
    /* 存不了也没关系 */
  }
}

/* ---------- 读整包 ---------- */

const pkgCache = new Map<string, Promise<CoursePackage>>();

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { credentials: "same-origin" });
  if (!r.ok || !(r.headers.get("content-type") ?? "").includes("json")) throw new Error(r.status === 404 || r.ok ? "没有这门课" : `加载失败（${r.status}）`);
  return r.json() as Promise<T>;
}

/** 完整课程（介绍、条目、练手题）。slug 是路由里的写法（本机课程带 local- 前缀）。 */
export function loadPackage(slug: string): Promise<CoursePackage> {
  let p = pkgCache.get(slug);
  if (!p) {
    if (isLocalSlug(slug)) {
      p = tx<CoursePackage | undefined>("readonly", (s) => s.get(slug.slice(LOCAL_PREFIX.length))).then((x) => {
        if (!x) throw new Error("这台设备上没有这门课");
        return x;
      });
    } else {
      // 先当仓库自带的课取静态文件，没有再找发布的课程包
      p = fetchJson<CoursePackage>(`/learn/${slug}/course.json`).catch(() => fetchJson<CoursePackage>(`/api/packages/${slug}`));
    }
    p.catch(() => pkgCache.delete(slug));
    pkgCache.set(slug, p);
  }
  return p;
}

export function forgetPackage(slug: string) {
  pkgCache.delete(slug);
}

const pageCache = new Map<string, Promise<string>>();

/** 一页正文（Markdown）：包里有 body 就用，否则取仓库里的 .md */
export function loadPage(slug: string, pkg: CoursePackage, pageId: string): Promise<string> {
  for (const m of pkg.modules)
    for (const it of m.items)
      for (const p of it.pages) if (p.id === pageId && p.body !== undefined) return Promise.resolve(p.body);
  const url = pagePath(slug, pageId);
  let p = pageCache.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok || (r.headers.get("content-type") ?? "").includes("html")) throw new Error(r.ok || r.status === 404 ? "没有这一页" : `加载失败（${r.status}）`);
      return r.text();
    });
    p.catch(() => pageCache.delete(url));
    pageCache.set(url, p);
  }
  return p;
}

/** 导出：自包含的课程包（正文写进 body） */
export async function exportPackage(slug: string): Promise<CoursePackage> {
  if (isLocalSlug(slug)) return loadPackage(slug);
  return fetchJson<CoursePackage>(`/packages/${slug}.json`).catch(() => fetchJson<CoursePackage>(`/api/packages/${slug}`));
}

export function downloadJson(name: string, data: unknown) {
  const blob = new Blob([`${JSON.stringify(data, null, 1)}\n`], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- 查找 ---------- */

export function findItem(pkg: CoursePackage, id: string): Item | undefined {
  for (const m of pkg.modules) for (const it of m.items) if (it.id === id) return it;
}

/** 路由里的 :page 可以是页面 id，也可以是没有页面的条目 id */
export function locate(pkg: CoursePackage, id: string): { item: Item; pageId: string | null } | undefined {
  for (const m of pkg.modules)
    for (const it of m.items) {
      if (it.pages.some((p) => p.id === id)) return { item: it, pageId: id };
      if (it.id === id && it.pages.length === 0) return { item: it, pageId: null };
    }
}

/** 条目的入口地址：第一页，没有页面就是条目本身 */
export function itemHref(slug: string, it: { id: string; pages: { id: string }[] }): string {
  return `/courses/${slug}/learn/${it.pages[0]?.id ?? it.id}`;
}

export function practiceOf(pkg: CoursePackage): { item: Item; q: Practice }[] {
  return pkg.modules.flatMap((m) => m.items.flatMap((item) => item.practice.map((q) => ({ item, q }))));
}

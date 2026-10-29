import type { CodePractice } from "../../shared/package";

/**
 * 代码练手题在浏览器里判：每种语言一个 Web Worker，运行时从 jsDelivr 按需下载（第一次用时才下）。
 *   python      Pyodide：每个测试给标准输入，比较标准输出
 *   javascript  同上；readLine() 读一行输入，console.log 写输出
 *   sql         sql.js：每次新建库、跑 setup，比较你的查询结果和参考答案的结果
 * 超时就结束 Worker（死循环也停得下来），下次再新建。
 */

const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/";
const SQLJS = "https://cdn.jsdelivr.net/npm/sql.js@1.15.2/dist/";

export interface TestResult {
  name: string;
  ok: boolean;
  /** 实际输出（SQL 是结果表的文字形式） */
  got: string;
  want: string;
  error?: string;
}

export interface RunResult {
  ok: boolean;
  results: TestResult[];
  /** 运行时没加载起来、超时之类 */
  error?: string;
}

const PY_WORKER = `
importScripts(${JSON.stringify(`${PYODIDE}pyodide.js`)});
const ready = loadPyodide({ indexURL: ${JSON.stringify(PYODIDE)} });
onmessage = async (e) => {
  const { code, tests } = e.data;
  let py;
  try { py = await ready; } catch (err) { postMessage({ fatal: "Python 运行环境加载失败：" + err.message }); return; }
  postMessage({ loaded: true });
  const out = [];
  for (const t of tests) {
    let stdout = "", stderr = "", fed = false;
    py.setStdin({ stdin: () => { if (fed) return null; fed = true; return t.stdin; } });
    py.setStdout({ batched: (s) => { stdout += s + "\\n"; } });
    py.setStderr({ batched: (s) => { stderr += s + "\\n"; } });
    const g = py.globals.get("dict")();
    try { await py.runPythonAsync(code, { globals: g }); }
    catch (err) { stderr += String(err.message || err).split("\\n").filter((l) => !/^  File "\\/lib\\//.test(l)).slice(-6).join("\\n"); }
    finally { g.destroy(); }
    out.push({ stdout, stderr });
  }
  postMessage({ out });
};`;

const JS_WORKER = `
onmessage = (e) => {
  const { code, tests } = e.data;
  postMessage({ loaded: true });
  const out = [];
  for (const t of tests) {
    let stdout = "", stderr = "";
    const lines = t.stdin.split("\\n");
    if (lines[lines.length - 1] === "") lines.pop();
    const fmt = (a) => a.map((x) => typeof x === "string" ? x : JSON.stringify(x)).join(" ");
    const con = { log: (...a) => { stdout += fmt(a) + "\\n"; }, error: (...a) => { stderr += fmt(a) + "\\n"; } };
    try { new Function("console", "readLine", "input", code)(con, () => lines.shift() ?? null, t.stdin); }
    catch (err) { stderr += String(err && err.stack || err).split("\\n").slice(0, 3).join("\\n"); }
    out.push({ stdout, stderr });
  }
  postMessage({ out });
};`;

const SQL_WORKER = `
importScripts(${JSON.stringify(`${SQLJS}sql-wasm.js`)});
const ready = initSqlJs({ locateFile: (f) => ${JSON.stringify(SQLJS)} + f });
function run(SQL, setup, q) {
  const db = new SQL.Database();
  try { db.run(setup); const r = db.exec(q); return r.length ? r[r.length - 1] : { columns: [], values: [] }; }
  finally { db.close(); }
}
onmessage = async (e) => {
  const { setup, code, solution } = e.data;
  let SQL;
  try { SQL = await ready; } catch (err) { postMessage({ fatal: "SQL 运行环境加载失败：" + err.message }); return; }
  postMessage({ loaded: true });
  let want, got, error;
  try { want = run(SQL, setup, solution); } catch (err) { postMessage({ fatal: "参考答案跑不通：" + err.message }); return; }
  try { got = run(SQL, setup, code); } catch (err) { error = err.message; }
  postMessage({ sql: { want, got, error } });
};`;

type Lang = CodePractice["lang"];
const SOURCES: Record<Lang, string> = { python: PY_WORKER, javascript: JS_WORKER, sql: SQL_WORKER };
const workers = new Map<Lang, Worker>();
const loaded = new Set<Lang>();

function worker(lang: Lang): Worker {
  let w = workers.get(lang);
  if (!w) {
    w = new Worker(URL.createObjectURL(new Blob([SOURCES[lang]], { type: "text/javascript" })));
    workers.set(lang, w);
  }
  return w;
}

function kill(lang: Lang) {
  workers.get(lang)?.terminate();
  workers.delete(lang);
  loaded.delete(lang);
}

/** 第一次要下载运行时，给长一点 */
const LOAD_MS = 90_000;
const RUN_MS = 8_000;

// biome-ignore lint/suspicious/noExplicitAny: Worker 消息
function call(lang: Lang, msg: unknown, onLoaded?: () => void): Promise<any> {
  const w = worker(lang);
  return new Promise((resolve, reject) => {
    let timer = setTimeout(() => fail("运行时加载太久了，检查一下网络"), loaded.has(lang) ? RUN_MS : LOAD_MS);
    const fail = (m: string) => {
      clearTimeout(timer);
      kill(lang);
      reject(new Error(m));
    };
    w.onmessage = (e) => {
      const d = e.data;
      if (d.loaded) {
        loaded.add(lang);
        onLoaded?.();
        clearTimeout(timer);
        timer = setTimeout(() => fail(`运行超过 ${RUN_MS / 1000} 秒，是不是死循环了？`), RUN_MS);
        return;
      }
      clearTimeout(timer);
      if (d.fatal) {
        kill(lang);
        reject(new Error(d.fatal));
      } else resolve(d);
    };
    w.onerror = (e) => fail(e.message || "运行出错");
    w.postMessage(msg);
  });
}

/** 输出比较：统一换行，去掉每行末尾空白和结尾空行 */
export function normalizeOutput(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

interface Table {
  columns: string[];
  values: unknown[][];
}

function tableText(t: Table | undefined): string {
  if (!t) return "";
  return [t.columns.join(" | "), ...t.values.map((r) => r.map((v) => (v === null ? "NULL" : String(v))).join(" | "))].join("\n");
}

function sameRows(a: Table, b: Table, ordered: boolean): boolean {
  if (a.columns.length !== b.columns.length || a.values.length !== b.values.length) return false;
  const key = (r: unknown[]) => JSON.stringify(r.map((v) => (typeof v === "number" ? Math.round(v * 1e6) / 1e6 : v)));
  const x = a.values.map(key);
  const y = b.values.map(key);
  if (!ordered) {
    x.sort();
    y.sort();
  }
  return x.every((v, i) => v === y[i]);
}

export function isLoaded(lang: Lang) {
  return loaded.has(lang);
}

export async function runCode(q: CodePractice, code: string, onLoaded?: () => void): Promise<RunResult> {
  try {
    if (q.lang === "sql") {
      const { sql } = await call("sql", { setup: q.setup ?? "", code, solution: q.solution ?? "" }, onLoaded);
      const want = tableText(sql.want);
      if (sql.error) return { ok: false, results: [{ name: "查询结果", ok: false, got: "", want, error: sql.error }] };
      const ok = sameRows(sql.got, sql.want, q.ordered ?? false);
      return { ok, results: [{ name: q.ordered ? "查询结果（要求顺序一致）" : "查询结果", ok, got: tableText(sql.got), want }] };
    }
    const { out } = await call(q.lang, { code, tests: q.tests }, onLoaded);
    const results: TestResult[] = q.tests.map((t, i) => {
      const got = normalizeOutput(out[i].stdout);
      const want = normalizeOutput(t.stdout);
      return { name: t.name || `测试 ${i + 1}`, ok: got === want && !out[i].stderr.trim(), got, want, error: out[i].stderr.trim() || undefined };
    });
    return { ok: results.every((r) => r.ok), results };
  } catch (e) {
    return { ok: false, results: [], error: (e as Error).message };
  }
}

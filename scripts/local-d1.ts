/**
 * 用 bun:sqlite 模拟 Cloudflare D1，本地开发服务器和测试共用。
 */
import { Database } from "bun:sqlite";

type Value = string | number | bigint | null | Uint8Array;
function toSql(v: unknown): Value {
  if (v === undefined) throw new TypeError("D1_TYPE_ERROR: Type 'undefined' not supported");
  if (typeof v === "boolean") return v ? 1 : 0;
  return v as Value;
}

class Statement {
  constructor(
    private db: Database,
    private sql: string,
    private args: Value[] = [],
  ) {}
  bind(...values: unknown[]) {
    return new Statement(this.db, this.sql, values.map(toSql));
  }
  execSync() {
    const q = this.db.query(this.sql);
    if (q.columnNames.length > 0) return { results: q.all(...this.args) as Record<string, unknown>[], success: true, meta: {} };
    const r = q.run(...this.args);
    return { results: [], success: true, meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } };
  }
  async first<T>() {
    const r = this.execSync().results[0];
    return (r ?? null) as T | null;
  }
  async all<T>() {
    return this.execSync() as unknown as D1Result<T>;
  }
  async run<T>() {
    return this.execSync() as unknown as D1Result<T>;
  }
}

export class LocalD1 {
  constructor(private db: Database) {}
  prepare(sql: string) {
    return new Statement(this.db, sql);
  }
  async batch(stmts: Statement[]) {
    return this.db.transaction(() => stmts.map((s) => s.execSync()))();
  }
}


/** 测试用：内存数据库。 */
export function memoryD1(): D1Database {
  return new LocalD1(new Database(":memory:")) as unknown as D1Database;
}

// Local-only D1 adapter backed by real SQLite. Production uses a Cloudflare D1 binding.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export function localD1(filename) {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(filename), { recursive: true });
  const sqlite = new DatabaseSync(filename);
  sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
  const prepare = (sql, params = []) => {
    const args = /\?\d+/.test(sql) ? [Object.fromEntries(params.map((v, i) => [String(i + 1), v]))] : params;
    return {
    bind(...values) { return prepare(sql, values); },
    async first(column) {
      const row = sqlite.prepare(sql).get(...args) || null;
      return column && row ? row[column] : row;
    },
    async all() { return { results: sqlite.prepare(sql).all(...args), success: true }; },
    async run() {
      const result = sqlite.prepare(sql).run(...args);
      return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
    },
    _run() {
      const stmt = sqlite.prepare(sql);
      const results = stmt.all(...args);
      return { results, success: true, meta: { changes: Number(sqlite.prepare('SELECT changes() AS n').get().n) } };
    },
    };
  };
  return {
    prepare,
    async batch(statements) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const results = statements.map(stmt => stmt._run());
        sqlite.exec('COMMIT');
        return results;
      } catch (e) { sqlite.exec('ROLLBACK'); throw e; }
    },
    async exec(sql) { sqlite.exec(sql); },
    close() { sqlite.close(); },
  };
}

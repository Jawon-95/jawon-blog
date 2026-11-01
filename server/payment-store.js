import { HttpError } from './pay.js';

export const schema = `CREATE TABLE IF NOT EXISTS gateway_orders (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  email TEXT,
  details TEXT NOT NULL DEFAULT '{}',
  session_id TEXT UNIQUE,
  checkout_url TEXT,
  status TEXT NOT NULL DEFAULT 'creating',
  livemode INTEGER,
  created_at INTEGER NOT NULL,
  paid_at INTEGER,
  delivered_at INTEGER,
  delivery_attempts INTEGER NOT NULL DEFAULT 0,
  delivery_error TEXT,
  UNIQUE(client_id, order_id)
)`;
const ready = new WeakMap();

export async function paymentDB(env) {
  const db = env.PAYMENTS_DB;
  if (!db) throw new HttpError(503, 'PAYMENTS_DB is not configured.');
  if (!ready.has(db)) {
    const pending = db.prepare(schema).run().catch(e => { ready.delete(db); throw e; });
    ready.set(db, pending);
  }
  await ready.get(db);
  return db;
}

export async function findPayment(env, id) {
  if (!/^[a-f0-9]{32}$/.test(id || '')) throw new HttpError(400, 'Invalid payment id.');
  return (await paymentDB(env)).prepare('SELECT * FROM gateway_orders WHERE id = ?').bind(id).first();
}

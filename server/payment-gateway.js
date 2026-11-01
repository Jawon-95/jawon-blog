import { stripe, siteOrigin, settledAmount, HttpError } from './pay.js';
import { paymentApps } from './payment-apps.js';
import { paymentDB, findPayment } from './payment-store.js';
import { sha256, signedHeaders, verifyRequest } from './payment-auth.js';

export const CHECKOUT_NAME = 'software customization';
export const isTestAllowed = env => env.PAY_ALLOW_TEST === '1';

export function appConfig(env, client) {
  const config = Object.hasOwn(paymentApps, client) ? paymentApps[client] : null;
  if (!config) throw new HttpError(404, 'Unknown payment client.');
  const secret = env[config.secretEnv];
  if (!secret || secret.length < 32) throw new HttpError(503, `${config.secretEnv} must contain at least 32 characters.`);
  const origin = new URL(env[config.originEnv] || config.defaultOrigin);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
  if ((origin.protocol !== 'https:' && !(local && isTestAllowed(env))) || origin.username || origin.password
    || origin.pathname !== '/' || origin.search || origin.hash) throw new HttpError(503, 'Invalid payment client origin.');
  return { ...config, secret, origin: origin.origin };
}

export async function authenticatedBody(request, env) {
  const client = request.headers.get('X-Payment-Client') || '';
  const app = appConfig(env, client);
  const raw = await request.text();
  if (raw.length > 16384) throw new HttpError(413, 'Request too large.');
  if (!await verifyRequest(request, app.secret, client, raw)) throw new HttpError(401, 'Invalid payment signature.');
  let body;
  try { body = JSON.parse(raw); } catch { throw new HttpError(400, 'Invalid JSON.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Invalid JSON object.');
  return { client, body };
}

export function validateAmount(env, value) {
  const max = Math.round((Number(env.PAY_MAX_AMOUNT) || 5000) * 100);
  if (!Number.isSafeInteger(value) || value < 100 || value > max) throw new HttpError(400, `Amount must be an integer between 100 and ${max} USD cents.`);
  return value;
}

export function paymentView(row) {
  return {
    payment_id: row.id, order_id: row.order_id, session_id: row.session_id,
    amount_cents: row.amount_cents, currency: row.currency,
    paid: row.status === 'paid', status: row.status, livemode: Boolean(row.livemode),
  };
}

export async function createPayment(env, client, input, details = {}) {
  if (String(env.STRIPE_SECRET_KEY || '').startsWith('sk_test_') && !isTestAllowed(env)) throw new HttpError(503, 'Test payments are disabled.');
  const amount = validateAmount(env, input.amount_cents);
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(input.order_id || '')) throw new HttpError(400, 'Invalid order id.');
  if (input.currency !== 'usd') throw new HttpError(400, 'Only USD is supported.');
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (email && (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email))) throw new HttpError(400, 'Invalid email.');
  if (client !== 'blog') appConfig(env, client);
  const hash = await sha256(JSON.stringify({ amount, currency: 'usd', email, details }));
  const db = await paymentDB(env);
  const id = crypto.randomUUID().replaceAll('-', '');
  await db.prepare(`INSERT INTO gateway_orders (id, client_id, order_id, request_hash, amount_cents, currency, email, details, created_at)
    VALUES (?, ?, ?, ?, ?, 'usd', ?, ?, ?) ON CONFLICT(client_id, order_id) DO NOTHING`)
    .bind(id, client, input.order_id, hash, amount, email || null, JSON.stringify(details), Date.now()).run();
  let row = await db.prepare('SELECT * FROM gateway_orders WHERE client_id = ? AND order_id = ?').bind(client, input.order_id).first();
  if (row.request_hash !== hash) throw new HttpError(409, 'Order already exists with different payment parameters.');
  if (!row.session_id) {
    // Stripe only guarantees retention of an idempotency key for 24 hours. Never silently charge again after that window.
    if (Date.now() - row.created_at > 23 * 3600000) throw new HttpError(409, 'Payment creation requires manual reconciliation. Create a new business order after checking Stripe.');
    const origin = siteOrigin(null, env);
    const returnBase = client === 'blog' ? (details.kind === 'js-tool' ? '/js-tool' : '/pay') : `/pay/${client}`;
    const success = client === 'blog' ? `${origin}${returnBase}?session_id={CHECKOUT_SESSION_ID}` : `${origin}${returnBase}?payment=${row.id}`;
    const cancel = client === 'blog' ? `${origin}${returnBase}` : `${origin}${returnBase}?payment=${row.id}&canceled=1`;
    const session = await stripe(env).checkout.sessions.create({
      mode: 'payment',
      adaptive_pricing: { enabled: false },
      line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: amount, product_data: { name: CHECKOUT_NAME } } }],
      // Keep the account email in our ledger. Prefilling customer_email can immediately
      // launch Link's verification flow instead of showing the normal payment form.
      // Leave Link and the other dashboard-enabled payment methods available.
      client_reference_id: row.id,
      metadata: { payment_id: row.id },
      success_url: success, cancel_url: cancel,
    }, { idempotencyKey: `gateway-v1-${row.id}` });
    if (!session.livemode && !isTestAllowed(env)) throw new HttpError(503, 'Test payments are disabled.');
    await db.prepare(`UPDATE gateway_orders SET session_id = ?, checkout_url = ?, status = 'pending', livemode = ?
      WHERE id = ? AND session_id IS NULL`).bind(session.id, session.url, session.livemode ? 1 : 0, row.id).run();
    row = await findPayment(env, row.id);
  }
  return { ...paymentView(row), url: row.checkout_url };
}

export async function reconcilePayment(env, row, suppliedSession) {
  if (!row?.session_id) return row;
  const session = suppliedSession || await stripe(env).checkout.sessions.retrieve(row.session_id);
  if (session.id !== row.session_id || session.metadata?.payment_id !== row.id || session.client_reference_id !== row.id) {
    throw new HttpError(409, 'Payment reference mismatch.');
  }
  if (!session.livemode && !isTestAllowed(env)) throw new HttpError(409, 'Test payments are disabled.');
  if (Boolean(session.livemode) !== Boolean(row.livemode)) throw new HttpError(409, 'Payment mode mismatch.');
  const { amount, currency } = settledAmount(session);
  if (amount !== row.amount_cents || currency !== row.currency) throw new HttpError(409, 'Payment amount mismatch.');
  const db = await paymentDB(env);
  if (session.payment_status === 'paid') {
    await db.prepare("UPDATE gateway_orders SET status = 'paid', paid_at = COALESCE(paid_at, ?) WHERE id = ?")
      .bind(Date.now(), row.id).run();
  } else if (session.status === 'expired') {
    await db.prepare("UPDATE gateway_orders SET status = 'expired' WHERE id = ? AND status != 'paid'").bind(row.id).run();
  }
  return findPayment(env, row.id);
}

export async function notifyProduct(env, row) {
  if (row.client_id === 'blog' || row.status !== 'paid' || row.delivered_at) return;
  const app = appConfig(env, row.client_id);
  const db = await paymentDB(env);
  const url = new URL(app.notifyPath, app.origin);
  const body = JSON.stringify(paymentView(row));
  await db.prepare('UPDATE gateway_orders SET delivery_attempts = delivery_attempts + 1 WHERE id = ?').bind(row.id).run();
  try {
    const response = await fetch(url, {
      method: 'POST', headers: await signedHeaders(app.secret, row.client_id, 'POST', url.pathname, body),
      body, redirect: 'manual', signal: AbortSignal.timeout(10000),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.received !== true) throw new Error(`Product callback failed (${response.status}).`);
    await db.prepare('UPDATE gateway_orders SET delivered_at = ?, delivery_error = NULL WHERE id = ?').bind(Date.now(), row.id).run();
  } catch (e) {
    await db.prepare('UPDATE gateway_orders SET delivery_error = ? WHERE id = ?').bind(String(e.message).slice(0, 300), row.id).run();
    throw new HttpError(502, 'Payment received; product notification will be retried.');
  }
}

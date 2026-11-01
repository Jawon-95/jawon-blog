import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { localD1 } from '../scripts/local-d1.mjs';
import { signedHeaders, verifyRequest } from '../server/payment-auth.js';
import { CHECKOUT_NAME, createPayment, reconcilePayment, notifyProduct } from '../server/payment-gateway.js';
import { findPayment, paymentDB } from '../server/payment-store.js';
import { onRequestPost as create } from '../functions/api/payments/create.js';
import { onRequestPost as status } from '../functions/api/payments/status.js';
import { onRequestPost as webhook } from '../functions/api/pay/stripe-webhook.js';
import { onRequestPost as checkout } from '../functions/api/checkout.js';
import { onRequestGet as sessionResult } from '../functions/api/session.js';
import { onRequestGet as returnPage } from '../functions/pay/[client].js';

const realFetch = globalThis.fetch;
let env, db, sessions, calls, callbackOK;
beforeEach(() => {
  db = localD1(':memory:');
  env = { PAYMENTS_DB: db, STRIPE_SECRET_KEY: 'sk_test_unified_gateway_unit_tests', PAY_ALLOW_TEST: '1',
    STRIPE_WEBHOOK_SECRET: 'whsec_unit_test_secret', PAY_TOPRO_SECRET: 'a'.repeat(64), SITE_URL: 'https://www.braveasy.com', PAY_TOPRO_ORIGIN: 'https://product.test' };
  sessions = new Map(); calls = []; callbackOK = true;
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url || input.href);
    if (url.hostname === 'api.stripe.com') {
      if (init.method === 'POST') {
        const p = new URLSearchParams(init.body);
        calls.push(p);
        const id = `cs_test_${crypto.randomUUID().replaceAll('-', '')}`;
        const s = { id, object: 'checkout.session', url: `https://checkout.stripe.com/c/pay/${id}`, livemode: false,
          status: 'open', payment_status: 'unpaid', amount_total: Number(p.get('line_items[0][price_data][unit_amount]')), currency: 'usd',
          client_reference_id: p.get('client_reference_id'), metadata: { payment_id: p.get('metadata[payment_id]') },
          success_url: p.get('success_url'), cancel_url: p.get('cancel_url'), created: Math.floor(Date.now() / 1000) };
        sessions.set(id, s);
        return Response.json(s);
      }
      return Response.json(sessions.get(url.pathname.split('/').at(-1)));
    }
    if (url.hostname === 'product.test') {
      assert.equal(url.pathname, '/api/pay/gateway-notify');
      const request = new Request(url, init);
      assert.equal(await verifyRequest(request, env.PAY_TOPRO_SECRET, 'topro', init.body), true);
      return Response.json({ received: callbackOK }, { status: callbackOK ? 200 : 503 });
    }
    throw new Error(`Unexpected network request to ${url.origin}`);
  };
});
afterEach(() => { globalThis.fetch = realFetch; db.close(); });

const input = () => ({ order_id: crypto.randomUUID().replaceAll('-', ''), amount_cents: 600, currency: 'usd', email: 'buyer@example.test' });
async function signed(path, body, options = {}) {
  const raw = JSON.stringify(body);
  const headers = await signedHeaders(env.PAY_TOPRO_SECRET, 'topro', 'POST', path, raw, options.timestamp);
  return new Request(`https://www.braveasy.com${path}`, { method: 'POST', headers, body: options.body || raw });
}
function stripeEvent(s, type = 'checkout.session.completed') {
  const payload = JSON.stringify({ id: 'evt_test', object: 'event', type, data: { object: s } });
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: env.STRIPE_WEBHOOK_SECRET });
  return new Request('https://www.braveasy.com/api/pay/stripe-webhook', { method: 'POST', headers: { 'stripe-signature': signature }, body: payload });
}

test('all checkout entries use exact title, omit both descriptions, and use www returns', async () => {
  await createPayment(env, 'topro', input());
  for (const body of [{ plan: 'monthly', amount: 1, item: 'override' }, { amount: 3.25, item: 'override', note: 'private note', description: 'override' }]) {
    const response = await checkout({ env, request: new Request('https://untrusted.test/api/checkout', { method: 'POST', body: JSON.stringify(body) }) });
    assert.equal(response.status, 200);
  }
  assert.equal(calls.length, 3);
  assert.equal(calls[1].get('line_items[0][price_data][unit_amount]'), '600');
  assert.equal(calls[2].get('line_items[0][price_data][unit_amount]'), '325');
  for (const p of calls) {
    assert.equal(p.get('line_items[0][price_data][product_data][name]'), 'software customization');
    assert.equal(p.has('line_items[0][price_data][product_data][description]'), false);
    assert.equal(p.has('payment_intent_data[description]'), false);
    assert.equal(p.get('adaptive_pricing[enabled]'), 'false');
    assert.equal(new URL(p.get('success_url')).origin, 'https://www.braveasy.com');
    assert.equal(new URL(p.get('cancel_url')).origin, 'https://www.braveasy.com');
  }
});

test('signed API rejects changed body, missing credentials, old timestamp and cross-path replay', async () => {
  const path = '/api/payments/create';
  assert.equal((await create({ env, request: new Request(`https://www.braveasy.com${path}`, { method: 'POST', body: '{}' }) })).status, 404);
  assert.equal((await create({ env, request: await signed(path, input(), { body: '{}' }) })).status, 401);
  assert.equal((await create({ env, request: await signed(path, input(), { timestamp: String(Math.floor(Date.now() / 1000) - 600) }) })).status, 401);
  const raw = JSON.stringify(input());
  const headers = await signedHeaders(env.PAY_TOPRO_SECRET, 'topro', 'POST', '/api/payments/status', raw);
  assert.equal((await create({ env, request: new Request(`https://www.braveasy.com${path}`, { method: 'POST', headers, body: raw }) })).status, 401);
});

test('amount/currency validation and immutable business order parameters', async () => {
  for (const amount_cents of [0, 99, -100, 100.5, 500001, '600']) await assert.rejects(createPayment(env, 'topro', { ...input(), amount_cents }));
  await assert.rejects(createPayment(env, 'topro', { ...input(), currency: 'eur' }));
  const data = input();
  const a = await createPayment(env, 'topro', data);
  const b = await createPayment(env, 'topro', data);
  assert.equal(a.session_id, b.session_id); assert.equal(calls.length, 1);
  await assert.rejects(createPayment(env, 'topro', { ...data, amount_cents: 1540 }), e => e.status === 409);
  const publicResponse = await checkout({ env, request: new Request('https://www.braveasy.com/api/checkout', { method: 'POST', body: '{"amount":1.001}' }) });
  assert.equal(publicResponse.status, 400);
});

test('paid webhook persists receipt, delivers callback and ignores duplicate event', async () => {
  const payment = await createPayment(env, 'topro', input());
  const s = sessions.get(payment.session_id); s.payment_status = 'paid'; s.status = 'complete';
  const first = await webhook({ env, request: stripeEvent(s) }); assert.equal(first.status, 200);
  let row = await findPayment(env, payment.payment_id);
  assert.equal(row.status, 'paid'); assert.ok(row.delivered_at); assert.equal(row.delivery_attempts, 1);
  assert.equal((await webhook({ env, request: stripeEvent(s) })).status, 200);
  row = await findPayment(env, row.id); assert.equal(row.delivery_attempts, 1);
});

test('unpaid async checkout does not grant; async success grants; invalid webhook signature rejected', async () => {
  const p = await createPayment(env, 'topro', input()); const s = sessions.get(p.session_id);
  assert.equal((await webhook({ env, request: stripeEvent(s) })).status, 200);
  assert.equal((await findPayment(env, p.payment_id)).delivered_at, null);
  s.payment_status = 'paid'; s.status = 'complete';
  assert.equal((await webhook({ env, request: stripeEvent(s, 'checkout.session.async_payment_succeeded') })).status, 200);
  assert.ok((await findPayment(env, p.payment_id)).delivered_at);
  assert.equal((await webhook({ env, request: new Request('https://www.braveasy.com/api/pay/stripe-webhook', { method: 'POST', body: '{}' }) })).status, 400);
});

test('failed product delivery returns failure to Stripe, persists error and succeeds on retry', async () => {
  const p = await createPayment(env, 'topro', input()); const s = sessions.get(p.session_id); s.payment_status = 'paid';
  callbackOK = false;
  assert.equal((await webhook({ env, request: stripeEvent(s) })).status, 502);
  let row = await findPayment(env, p.payment_id); assert.equal(row.status, 'paid'); assert.equal(row.delivered_at, null); assert.ok(row.delivery_error);
  callbackOK = true;
  assert.equal((await webhook({ env, request: stripeEvent(s) })).status, 200);
  row = await findPayment(env, row.id); assert.ok(row.delivered_at); assert.equal(row.delivery_attempts, 2); assert.equal(row.delivery_error, null);
});

test('status query recovers without webhook and public blog lookup cannot read external product orders', async () => {
  const p = await createPayment(env, 'topro', input()); sessions.get(p.session_id).payment_status = 'paid';
  const response = await status({ env, request: await signed('/api/payments/status', { payment_id: p.payment_id }) });
  assert.equal(response.status, 200); assert.equal((await response.json()).paid, true);
  assert.ok((await findPayment(env, p.payment_id)).delivered_at);
  const result = await sessionResult({ env, request: new Request(`https://www.braveasy.com/api/session?session_id=${p.session_id}`) }); assert.equal(result.status, 404);
  const blog = await createPayment(env, 'blog', input(), { kind: 'js-tool', plan: 'monthly' });
  sessions.get(blog.session_id).payment_status = 'paid';
  const receipt = await sessionResult({ env, request: new Request(`https://www.braveasy.com/api/session?session_id=${blog.session_id}`) });
  const data = await receipt.json(); assert.equal(receipt.status, 200); assert.ok(data.license); assert.equal(data.item, CHECKOUT_NAME);
  const foreign = await status({ env, request: await signed('/api/payments/status', { payment_id: blog.payment_id }) }); assert.equal(foreign.status, 404);
});

test('amount/reference/mode mismatch never grants; test mode is opt-in', async () => {
  const p = await createPayment(env, 'topro', input()); const row = await findPayment(env, p.payment_id);
  const s = sessions.get(p.session_id);
  for (const change of [{ amount_total: 100 }, { currency: 'eur' }, { client_reference_id: 'wrong' }, { id: 'cs_test_wrong' }, { livemode: true }]) {
    await assert.rejects(reconcilePayment(env, row, { ...s, payment_status: 'paid', ...change }));
  }
  delete env.PAY_ALLOW_TEST;
  await assert.rejects(createPayment(env, 'topro', input()));
  await assert.rejects(reconcilePayment(env, row));
  assert.equal((await findPayment(env, p.payment_id)).status, 'pending');
});

test('browser returns use only registered origin and order, canceled never implies paid', async () => {
  const data = input(); const p = await createPayment(env, 'topro', data);
  const response = await returnPage({ env, params: { client: 'topro' }, request: new Request(`https://www.braveasy.com/pay/topro?payment=${p.payment_id}&canceled=1&redirect=https://evil.test&format=json`) });
  assert.equal(response.status, 200); assert.equal((await response.json()).destination, 'https://product.test/pricing?canceled=1');
  assert.equal((await findPayment(env, p.payment_id)).status, 'pending');
  const success = await returnPage({ env, params: { client: 'topro' }, request: new Request(`https://www.braveasy.com/pay/topro?payment=${p.payment_id}&format=json`) });
  const state = await success.json(); assert.equal(state.destination, `https://product.test/pricing?order=${data.order_id}`); assert.equal(state.paid, false);
  const page = await returnPage({ env, params: { client: 'topro' }, request: new Request(`https://www.braveasy.com/pay/topro?payment=${p.payment_id}`) });
  const html = await page.text(); assert.ok(html.includes('<h1 id="title">Confirming your payment</h1>')); assert.ok(html.includes('seconds=3')); assert.ok(page.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
  sessions.get(p.session_id).payment_status = 'paid';
  await reconcilePayment(env, await findPayment(env, p.payment_id));
  const paidReturn = await returnPage({ env, params: { client: 'topro' }, request: new Request(`https://www.braveasy.com/pay/topro?payment=${p.payment_id}&canceled=1&format=json`) });
  const paidState = await paidReturn.json(); assert.equal(paidState.paid, true); assert.equal(paidState.canceled, false);
  assert.equal(paidState.destination, `https://product.test/pricing?order=${data.order_id}`);
  await assert.rejects(createPayment({ ...env, SITE_URL: 'http://www.braveasy.com' }, 'topro', input()));
});

test('ambiguous creation older than Stripe idempotency retention requires reconciliation', async () => {
  const data = input(); const p = await createPayment(env, 'topro', data);
  await (await paymentDB(env)).prepare('UPDATE gateway_orders SET session_id = NULL, created_at = ? WHERE id = ?').bind(Date.now() - 24 * 3600000, p.payment_id).run();
  await assert.rejects(createPayment(env, 'topro', data), e => e.status === 409);
});

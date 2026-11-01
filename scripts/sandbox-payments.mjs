// Real Stripe SANDBOX end-to-end runner. Never accepts a live key and never deploys.
// Starts the blog API, isolated TOPRO Wrangler/D1, and a temporary public webhook tunnel.
// Complete the checkout URLs printed by this script with Stripe's 4242 test card.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { localD1 } from './local-d1.mjs';
import { signedHeaders } from '../server/payment-auth.js';
import { serveBlogBuild } from './serve-blog-build.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.loadEnvFile(path.join(root, '.env.local'));
const key = process.env.STRIPE_SECRET_KEY || '';
if (!key.startsWith('sk_test_')) throw new Error('Sandbox runner refuses to use a non-test Stripe key.');
const topro = process.env.TOPRO_PROJECT || path.resolve(root, '../TankiOnline/TOPRO/topro-server-cf-nuxt');
const cli = path.join(topro, 'node_modules/wrangler/bin/wrangler.js');
if (!fs.existsSync(path.join(topro, 'dist/_worker.js/index.js'))) throw new Error('Build TOPRO first (npm run build).');
const run = path.join(root, '.wrangler', 'sandbox-payments', String(Date.now()));
fs.mkdirSync(run, { recursive: true });
const db = localD1(path.join(run, 'payments.sqlite'));
const secret = crypto.randomUUID() + crypto.randomUUID();
const adminPassword = crypto.randomUUID();
const env = { STRIPE_SECRET_KEY: key, PAY_ALLOW_TEST: '1', PAYMENTS_DB: db, PAY_TOPRO_SECRET: secret, PAY_TOPRO_ORIGIN: 'http://127.0.0.1:3200' };
const stripe = new Stripe(key);
const children = [];
const report = { started_at: new Date().toISOString(), environment: 'Stripe sandbox only', checks: [], webhook_events: [], checkouts: [] };
let topLogs = '', endpoint, apiServer, controlServer, stop, stopped = false;
const state = { stage: 'starting', email: `payments-${Date.now()}@example.test`, password: crypto.randomUUID() + '!aA1', checkouts: [] };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, label, timeout = 120000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { try { const result = await fn(); if (result) return result; } catch {} await wait(1000); }
  throw new Error(`Timed out: ${label}`);
}
function passed(label) { report.checks.push(label); console.log(`PASS: ${label}`); }
function child(executable, args, options = {}) {
  const p = spawn(executable, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], ...options });
  children.push(p); return p;
}
async function topRequest(route, body, cookie, admin = false) {
  const response = await fetch(`http://127.0.0.1:3200${route}`, {
    method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }), ...(admin && { password: adminPassword }) },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  assert.equal(response.status, 200, JSON.stringify(data));
  return { response, data };
}
async function inspectSession(payment) {
  const session = await stripe.checkout.sessions.retrieve(payment.session_id);
  assert.equal(session.livemode, false);
  const items = await stripe.checkout.sessions.listLineItems(session.id, { expand: ['data.price.product'] });
  assert.equal(items.data.length, 1);
  const product = items.data[0].price.product;
  assert.equal(product.name, 'software customization'); assert.equal(product.description, null);
  assert.equal(session.amount_total, payment.amount_cents);
  assert.equal(new URL(session.success_url).origin, env.SITE_URL);
  assert.equal(new URL(session.cancel_url).origin, env.SITE_URL);
  return session;
}
function publishCheckout(label, payment) {
  const checkout = { label, url: payment.checkout_url, session_id: payment.session_id, amount_cents: payment.amount_cents, payment_id: payment.id };
  state.checkouts.push(checkout); report.checkouts.push({ label, session_id: payment.session_id, amount_cents: payment.amount_cents });
  state.stage = label;
  console.log(`CHECKOUT ${label}: ${payment.checkout_url}`);
}
async function latestTopOrder() { return db.prepare("SELECT * FROM gateway_orders WHERE client_id = 'topro' ORDER BY created_at DESC LIMIT 1").first(); }
async function paidSession(id) { const s = await stripe.checkout.sessions.retrieve(id); return s.payment_status === 'paid' && s; }

async function cleanup() {
  if (stopped) return; stopped = true;
  if (endpoint) await stripe.webhookEndpoints.del(endpoint.id).catch(() => {});
  for (const item of report.checkouts) {
    try { const s = await stripe.checkout.sessions.retrieve(item.session_id); if (s.status === 'open') await stripe.checkout.sessions.expire(s.id); } catch {}
  }
  apiServer?.close(); controlServer?.close();
  for (const p of children.reverse()) {
    if (p.pid && p.exitCode === null) {
      if (process.platform === 'win32') spawnSync('taskkill.exe', ['/PID', String(p.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      else p.kill('SIGTERM');
    }
  }
  db.close();
}
process.on('SIGINT', () => { cleanup().finally(() => process.exit(130)); });

try {
  const apiRoutes = {
    '/api/checkout': '../functions/api/checkout.js', '/api/session': '../functions/api/session.js',
    '/api/payments/create': '../functions/api/payments/create.js', '/api/payments/status': '../functions/api/payments/status.js',
    '/api/pay/stripe-webhook': '../functions/api/pay/stripe-webhook.js',
  };
  apiServer = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1:3001');
      const client = /^\/pay\/([a-z0-9-]+)$/.exec(url.pathname)?.[1];
      const file = client ? '../functions/pay/[client].js' : apiRoutes[url.pathname];
      if (!file) {
        if (req.method === 'GET' && serveBlogBuild(root, url.pathname, res)) return;
        res.writeHead(404).end('Not found'); return;
      }
      const mod = await import(new URL(file, import.meta.url));
      const chunks = []; for await (const c of req) chunks.push(c);
      const request = new Request(url, { method: req.method, headers: req.headers, ...(!['GET', 'HEAD'].includes(req.method) && { body: Buffer.concat(chunks) }) });
      const handler = mod[`onRequest${req.method[0] + req.method.slice(1).toLowerCase()}`];
      if (!handler) { res.writeHead(405).end(); return; }
      const response = await handler({ request, env, params: { client } });
      if (url.pathname === '/api/pay/stripe-webhook') {
        try { const event = JSON.parse(Buffer.concat(chunks).toString()); report.webhook_events.push({ id: event.id, type: event.type, response: response.status }); } catch {}
      }
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
    } catch (e) { res.writeHead(500).end(e.message); }
  });
  await new Promise(resolve => apiServer.listen(3001, '127.0.0.1', resolve));
  controlServer = http.createServer((req, res) => {
    if (req.url === '/stop' && req.method === 'POST') { res.end('Stopping'); stop?.(); return; }
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ...state, report }));
  });
  await new Promise(resolve => controlServer.listen(3002, '127.0.0.1', resolve));

  const persist = path.join(run, 'topro-state');
  const seed = spawnSync(process.execPath, [cli, 'd1', 'execute', 'topro', '--local', '--persist-to', persist, '--file', 'srever-data/topro.sql'], { cwd: topro, windowsHide: true, encoding: 'utf8' });
  if (seed.status !== 0) throw new Error('Failed to initialize isolated local TOPRO database. ' + (seed.stderr || '').slice(-1500));
  const top = child(process.execPath, [cli, 'pages', 'dev', 'dist', '--port', '3200', '--inspector-port', '9234', '--persist-to', persist,
    '--binding', `PAY_TOPRO_SECRET=${secret}`, '--binding', 'PAYMENT_GATEWAY_URL=http://127.0.0.1:3001', '--binding', 'PAY_ALLOW_TEST=1',
    '--binding', 'MAIL_LOG_ONLY=1', '--binding', `ADMIN_PW=${adminPassword}`], { cwd: topro });
  top.stdout.on('data', data => { topLogs += data.toString(); }); top.stderr.on('data', data => { topLogs += data.toString(); });
  await until(async () => (await fetch('http://127.0.0.1:3200/api/account/me')).ok, 'TOPRO Wrangler startup');

  const tunnel = child(process.env.CLOUDFLARED_PATH || 'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe', ['tunnel', '--url', 'http://127.0.0.1:3001', '--no-autoupdate', '--protocol', 'http2']);
  let tunnelLogs = '';
  tunnel.stderr.on('data', data => { tunnelLogs += data.toString(); }); tunnel.stdout.on('data', data => { tunnelLogs += data.toString(); });
  env.SITE_URL = await until(() => tunnelLogs.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0], 'temporary webhook tunnel');
  await until(async () => (await fetch(`${env.SITE_URL}/api/pay/stripe-webhook`, { method: 'POST', body: '{}' })).status === 503, 'public tunnel connection');
  endpoint = await stripe.webhookEndpoints.create({ url: `${env.SITE_URL}/api/pay/stripe-webhook`, enabled_events: ['checkout.session.completed', 'checkout.session.async_payment_succeeded'], description: 'Temporary unified payment sandbox E2E; automatically removed after test' });
  assert.equal(endpoint.livemode, false); env.STRIPE_WEBHOOK_SECRET = endpoint.secret;
  passed('isolated Wrangler/D1 and real Stripe sandbox webhook ready');

  await topRequest('/api/account/code', { email: state.email, purpose: 'register' });
  const code = await until(() => topLogs.match(/\b(\d{6})\b(?=\s*\r?\n\s*The code expires)/)?.[1], 'local registration code');
  const registration = await topRequest('/api/account/register', { email: state.email, password: state.password, code });
  const cookie = registration.response.headers.get('set-cookie').split(';')[0];
  passed('real TOPRO registration and HttpOnly login session');
  console.log(`TEST LOGIN: http://127.0.0.1:3200/account | ${state.email} | ${state.password}`);

  await topRequest('/api/pay/order', { months: 1, amount: 1 }, cookie);
  const first = await latestTopOrder(); await inspectSession(first); publishCheckout('first-purchase', first);
  await until(async () => {
    const row = await db.prepare('SELECT * FROM gateway_orders WHERE id = ?').bind(first.id).first();
    return row.delivered_at && row;
  }, 'complete first checkout in browser and receive genuine Stripe webhook', 1200000);
  const firstState = (await topRequest('/api/account/me', undefined, cookie)).data;
  assert.equal(firstState.orders.length, 1); assert.equal(firstState.license.pendingMs, 30 * 86400000);
  assert.ok(report.webhook_events.some(e => e.type === 'checkout.session.completed' && e.response === 200));
  const firstLicense = firstState.license.license;
  const firstSession = await stripe.checkout.sessions.retrieve(first.session_id);
  assert.equal((await stripe.paymentIntents.retrieve(firstSession.payment_intent)).description, null);
  passed('genuine Stripe webhook grants first license without browser polling; checkout/PaymentIntent descriptions empty');

  await topRequest('/api/pay/order', { months: 3 }, cookie);
  const second = await latestTopOrder(); await inspectSession(second);
  env.PAY_TOPRO_ORIGIN = 'http://127.0.0.1:1'; // Deliberately fail one real webhook delivery, then recover through status query.
  publishCheckout('renewal-with-recovery', second);
  await until(() => paidSession(second.session_id), 'complete renewal checkout in browser', 1200000);
  await until(async () => (await db.prepare('SELECT delivery_error FROM gateway_orders WHERE id = ?').bind(second.id).first()).delivery_error, 'persisted failed callback');
  env.PAY_TOPRO_ORIGIN = 'http://127.0.0.1:3200';
  await topRequest(`/api/pay/order?id=${second.order_id}`, undefined, cookie);
  const secondState = (await topRequest('/api/account/me', undefined, cookie)).data;
  assert.equal(secondState.orders.length, 2); assert.equal(secondState.license.license, firstLicense); assert.equal(secondState.license.pendingMs, 120 * 86400000);
  passed('real renewal retains same license; failed callback recovered through authenticated gateway query');

  const row = await db.prepare('SELECT * FROM gateway_orders WHERE id = ?').bind(second.id).first();
  const notification = JSON.stringify({ payment_id: row.id, order_id: row.order_id, session_id: row.session_id, amount_cents: row.amount_cents, currency: row.currency, paid: true, status: 'paid', livemode: false });
  const responses = await Promise.all(Array.from({ length: 5 }, async () => fetch('http://127.0.0.1:3200/api/pay/gateway-notify', { method: 'POST', body: notification,
    headers: await signedHeaders(secret, 'topro', 'POST', '/api/pay/gateway-notify', notification) })));
  assert.ok(responses.every(response => response.ok));
  assert.equal((await topRequest('/api/account/me', undefined, cookie)).data.license.pendingMs, 120 * 86400000);
  const admin = (await topRequest('/api/admin/accounts', undefined, null, true)).data;
  assert.equal(admin.find(a => a.email === state.email).orders.length, 2);
  const rotated = (await topRequest('/api/account/rotate-license', {}, cookie)).data;
  assert.notEqual(rotated.license, firstLicense);
  assert.equal((await topRequest('/api/account/me', undefined, cookie)).data.license.pendingMs, 120 * 86400000);
  passed('concurrent duplicate callbacks do not extend twice; admin history and license replacement remain correct');

  const blogResponse = await fetch('http://127.0.0.1:3001/api/checkout', { method: 'POST', body: JSON.stringify({ plan: 'monthly', amount: 1, item: 'attempted override' }) });
  const blogPayment = await blogResponse.json(); assert.equal(blogResponse.status, 200);
  const third = await db.prepare('SELECT * FROM gateway_orders WHERE id = ?').bind(blogPayment.payment_id).first(); await inspectSession(third); publishCheckout('blog-js-tool', third);
  await until(() => paidSession(third.session_id), 'complete blog JS tool checkout in browser', 1200000);
  const receipt = await (await fetch(`http://127.0.0.1:3001/api/session?session_id=${third.session_id}`)).json();
  assert.equal(receipt.paid, true); assert.ok(receipt.license); assert.equal(receipt.amount, 6);
  passed('real blog JS tool purchase still returns activation key with server-fixed price');

  const customResponse = await fetch('http://127.0.0.1:3001/api/checkout', { method: 'POST', body: JSON.stringify({ amount: 1.23, item: 'ignored title', note: 'sandbox internal note' }) });
  const customPayment = await customResponse.json(); assert.equal(customResponse.status, 200);
  const fourth = await db.prepare('SELECT * FROM gateway_orders WHERE id = ?').bind(customPayment.payment_id).first(); await inspectSession(fourth);
  publishCheckout('custom-amount', fourth);
  await until(() => paidSession(fourth.session_id), 'complete custom amount checkout in browser', 1200000);
  const customReceipt = await (await fetch(`http://127.0.0.1:3001/api/session?session_id=${fourth.session_id}`)).json();
  assert.equal(customReceipt.paid, true); assert.equal(customReceipt.amount, 1.23); assert.equal(customReceipt.license, undefined);
  passed('real custom-amount payment is $1.23 with fixed title, empty description and correct receipt');
  report.completed_at = new Date().toISOString(); report.result = 'passed';
  fs.writeFileSync(path.join(run, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(root, '.wrangler', 'sandbox-payments', 'latest-report.json'), JSON.stringify(report, null, 2));
  state.stage = 'complete'; console.log(`ALL SANDBOX CHECKS PASSED. Report: ${path.join(run, 'report.json')}`);
  console.log('Servers remain available for return-page inspection. POST http://127.0.0.1:3002/stop to clean up.');
  await new Promise(resolve => { stop = resolve; });
} catch (e) {
  report.result = 'failed'; report.error = e.message; state.stage = 'failed';
  fs.writeFileSync(path.join(run, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(run, 'topro.log'), topLogs.replaceAll(secret, '[test secret]').replaceAll(adminPassword, '[test admin password]'));
  console.error(e.message); process.exitCode = 1;
} finally { await cleanup(); }

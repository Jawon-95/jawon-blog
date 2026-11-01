// Smoke-test the actual Cloudflare Pages Functions bundle against real Stripe TEST API.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { signedHeaders } from '../server/payment-auth.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.loadEnvFile(path.join(root, '.env.local'));
const key = process.env.STRIPE_SECRET_KEY || '';
if (!key.startsWith('sk_test_')) throw new Error('Cloudflare smoke test requires a Stripe test key.');
const topro = process.env.TOPRO_PROJECT || path.resolve(root, '../TankiOnline/TOPRO/topro-server-cf-nuxt');
const port = Number(process.env.PAYMENTS_SMOKE_PORT) || 3331;
const origin = `http://127.0.0.1:${port}`;
const secret = crypto.randomUUID() + crypto.randomUUID();
const stripe = new Stripe(key);
const sessions = [];
let logs = '';
const p = spawn(process.execPath, [path.join(topro, 'node_modules/wrangler/bin/wrangler.js'), 'pages', 'dev', 'build',
  '--port', String(port), '--inspector-port', '9235', '--compatibility-date', '2026-03-01', '--compatibility-flags', 'nodejs_compat',
  '--d1', 'PAYMENTS_DB', '--persist-to', path.join(root, '.wrangler', 'pages-smoke', String(Date.now())),
  '--binding', `STRIPE_SECRET_KEY=${key}`, '--binding', 'STRIPE_WEBHOOK_SECRET=whsec_local_smoke_only',
  '--binding', 'PAY_ALLOW_TEST=1', '--binding', `SITE_URL=${origin}`, '--binding', `PAY_TOPRO_SECRET=${secret}`,
  '--binding', 'PAY_TOPRO_ORIGIN=http://127.0.0.1:3200'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
p.stdout.on('data', data => { logs += data.toString(); }); p.stderr.on('data', data => { logs += data.toString(); });
const checks = [];
async function signed(pathname, body) {
  const raw = JSON.stringify(body);
  return fetch(origin + pathname, { method: 'POST', body: raw, headers: await signedHeaders(secret, 'topro', 'POST', pathname, raw) });
}
try {
  const deadline = Date.now() + 120000;
  let ready = false;
  while (Date.now() < deadline) {
    try { if ((await fetch(origin)).ok) { ready = true; break; } } catch {}
    if (p.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.equal(ready, true, 'Cloudflare Pages runtime did not start.');
  const unauth = await fetch(origin + '/api/payments/create', { method: 'POST', body: '{}' });
  assert.equal(unauth.status, 404); assert.match((await unauth.json()).error, /client/); checks.push('actual Pages Functions reject unauthenticated product requests');
  const webhook = await fetch(origin + '/api/pay/stripe-webhook', { method: 'POST', body: '{}' });
  assert.equal(webhook.status, 400); checks.push('actual Pages webhook rejects missing Stripe signature');
  const create = await signed('/api/payments/create', { order_id: crypto.randomUUID().replaceAll('-', ''), amount_cents: 600, currency: 'usd' });
  const payment = await create.json(); assert.equal(create.status, 200, JSON.stringify(payment)); sessions.push(payment.session_id);
  const checkout = await stripe.checkout.sessions.retrieve(payment.session_id);
  assert.equal(checkout.livemode, false); assert.equal(checkout.amount_total, 600); assert.equal(new URL(checkout.success_url).origin, origin);
  checks.push('actual Pages + D1 + WebCrypto create a real sandbox Checkout');
  const query = await signed('/api/payments/status', { payment_id: payment.payment_id });
  assert.equal(query.status, 200); assert.equal((await query.json()).paid, false); checks.push('actual Pages signed status query works');
  const page = await fetch(`${origin}/pay/topro?payment=${payment.payment_id}`);
  assert.equal(page.status, 200); assert.match(page.headers.get('content-type'), /text\/html/); assert.match(await page.text(), /<h1 id="title">Confirming your payment<\/h1>/);
  checks.push('dynamic product return path renders pending HTML without claiming success');
  const blog = await fetch(origin + '/api/checkout', { method: 'POST', body: '{"plan":"monthly","amount":1}' });
  const blogPayment = await blog.json(); assert.equal(blog.status, 200, JSON.stringify(blogPayment)); sessions.push(blogPayment.session_id);
  assert.equal(blogPayment.amount_cents, 600);
  assert.equal((await fetch(origin + '/js-tool')).status, 200); checks.push('blog static page and public checkout coexist with gateway functions');
  const report = { completed_at: new Date().toISOString(), result: 'passed', environment: 'local Cloudflare Pages/workerd + isolated D1 + Stripe sandbox', checks };
  const directory = path.join(root, '.wrangler', 'pages-smoke'); fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'latest-report.json'), JSON.stringify(report, null, 2));
  for (const check of checks) console.log(`PASS: ${check}`);
} catch (e) {
  console.error(logs.replaceAll(key, '[Stripe test key]').replaceAll(secret, '[test client secret]').slice(-6000));
  throw e;
} finally {
  for (const id of sessions) await stripe.checkout.sessions.expire(id).catch(() => {});
  if (p.pid && p.exitCode === null) {
    if (process.platform === 'win32') spawnSync('taskkill.exe', ['/PID', String(p.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else p.kill('SIGTERM');
  }
}

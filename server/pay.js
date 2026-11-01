/**
 * functions/api/* 共用的 Stripe 工具（Cloudflare Pages Functions）。
 * 放在 functions/ 目录之外，避免被当成接口路由。
 *
 * 环境变量（本地写在 .env.local，线上在 Cloudflare Pages → 设置 → 变量和机密）：
 *   STRIPE_SECRET_KEY   必填，sk_test_... / sk_live_...
 *   SITE_URL            可选，本站地址，默认取请求域名
 */
import Stripe from 'stripe';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const clients = new Map();
export function stripe(env) {
  const key = env.STRIPE_SECRET_KEY;
  if (!key) throw new HttpError(500, 'STRIPE_SECRET_KEY is not configured on the server.');
  if (!clients.has(key)) clients.set(key, new Stripe(key, { httpClient: Stripe.createFetchHttpClient() }));
  return clients.get(key);
}

export function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function errorResponse(e) {
  if (e instanceof HttpError) return json({ error: e.message }, e.status);
  if (e?.type === 'StripeInvalidRequestError') return json({ error: e.message }, 400);
  console.error(e);
  return json({ error: 'Payment service error, please try again later.' }, 500);
}

export function siteOrigin(request, env) {
  return (env.SITE_URL || new URL(request.url).origin).replace(/\/+$/, '');
}

/**
 * 订单金额（最小货币单位）和币种，按下单时的币种计算。
 * Stripe 开启 Adaptive Pricing（买家用本地货币付款）时，原币种金额在 currency_conversion 里。
 */
export function settledAmount(session) {
  const conv = session.currency_conversion;
  return conv?.source_currency
    ? { amount: conv.amount_total, currency: conv.source_currency }
    : { amount: session.amount_total, currency: session.currency };
}

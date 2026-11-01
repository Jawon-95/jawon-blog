/**
 * POST /api/checkout  创建 Stripe Checkout 会话，返回 { url }，前端跳转过去付款。
 *   { plan: 'monthly' | 'quarterly' | 'annual' }   购买 JS Convert Tool，价格以 src/data/business.js 为准
 *   { amount, item?, note?, email? }               /pay 页面：定制开发、技术咨询等自定义金额付款
 */
import { plans } from '../../src/data/business.js';
import { json, errorResponse, HttpError } from '../../server/pay.js';
import { createPayment } from '../../server/payment-gateway.js';

function clip(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Invalid request.');
    const plan = body.plan && plans.find(p => p.id === body.plan);
    if (body.plan && !plan) throw new HttpError(400, 'Unknown plan.');
    const amount = plan ? plan.price : Number(body.amount);
    if (!Number.isFinite(amount) || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001) throw new HttpError(400, 'Invalid USD amount.');
    // Notes stay in the merchant order record and never override the checkout title or description.
    const details = plan ? { kind: 'js-tool', plan: plan.id } : { kind: 'custom', item: clip(body.item, 120), note: clip(body.note, 500) };
    return json(await createPayment(env, 'blog', {
      order_id: body.order_id || crypto.randomUUID().replaceAll('-', ''),
      amount_cents: Math.round(amount * 100), currency: 'usd', email: clip(body.email, 254),
    }, details));
  } catch (e) {
    return errorResponse(e);
  }
}

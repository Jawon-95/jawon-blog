/**
 * POST /api/checkout  创建 Stripe Checkout 会话，返回 { url }，前端跳转过去付款。
 *   { plan: 'monthly' | 'quarterly' | 'annual' }   购买 JS Convert Tool，价格以 src/data/business.js 为准
 *   { amount, item?, note?, email? }               /pay 页面：定制开发、技术咨询等自定义金额付款
 */
import { plans, product, business } from '../../src/data/business.js';
import { stripe, json, errorResponse, siteOrigin, HttpError } from '../../server/pay.js';

function clip(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function customPayment(body, origin, env) {
  const amount = Number(body.amount);
  const max = Number(env.PAY_MAX_AMOUNT) || 5000;
  if (!Number.isFinite(amount) || amount < 1 || amount > max) {
    throw new HttpError(400, `Amount must be between $1 and $${max}.`);
  }
  const item = clip(body.item, 120) || `Payment to ${business.name}`;
  const note = clip(body.note, 500);
  const email = clip(body.email, 200);
  const metadata = { kind: 'custom', item, ...(note && { note }) };
  return {
    mode: 'payment',
    line_items: [{
      quantity: 1,
      price_data: { currency: 'usd', unit_amount: Math.round(amount * 100), product_data: { name: item } },
    }],
    metadata,
    payment_intent_data: { metadata, description: item },
    ...(/^\S+@\S+\.\S+$/.test(email) && { customer_email: email }),
    success_url: `${origin}/pay?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pay`,
  };
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const origin = siteOrigin(request, env);
    if (!body.plan) {
      const session = await stripe(env).checkout.sessions.create(customPayment(body, origin, env));
      return json({ url: session.url });
    }
    const plan = plans.find((p) => p.id === body.plan);
    if (!plan) throw new HttpError(400, 'Unknown plan.');

    const metadata = { kind: 'js-tool', plan: plan.id, item: `${product.name} · ${plan.name}` };
    const session = await stripe(env).checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(plan.price * 100),
          product_data: {
            name: `${product.name} — ${plan.name} license`,
            description: `Unlimited use for ${plan.period}. One-time payment, no auto-renewal.`,
          },
        },
      }],
      metadata,
      payment_intent_data: { metadata, description: metadata.item },
      success_url: `${origin}${product.path}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${product.path}#pricing`,
    });
    return json({ url: session.url });
  } catch (e) {
    return errorResponse(e);
  }
}

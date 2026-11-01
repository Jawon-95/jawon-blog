/**
 * GET /api/session?session_id=cs_...  查询付款结果（JS Convert Tool 或 /pay 自定义金额）。
 * JS Convert Tool 已付款时直接返回激活码（由 Session ID 固定生成，刷新不变）。
 */
import { plans } from '../../src/data/business.js';
import { makeLicense } from '../../src/components/JsTool/licenseCore.mjs';
import { stripe, json, errorResponse, settledAmount, HttpError } from '../../server/pay.js';

function expiryFrom(createdSec, months) {
  const d = new Date(createdSec * 1000);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10).replaceAll('-', '');
}

export async function onRequestGet({ request, env }) {
  try {
    const id = new URL(request.url).searchParams.get('session_id') || '';
    if (!/^cs_(test|live)_\w+$/.test(id)) throw new HttpError(400, 'Invalid session id.');
    const s = await stripe(env).checkout.sessions.retrieve(id);
    const kind = s.metadata?.kind;
    const plan = plans.find((p) => p.id === s.metadata?.plan);
    if (!(kind === 'custom' || (kind === 'js-tool' && plan))) throw new HttpError(404, 'Order not found.');

    const paid = s.payment_status === 'paid';
    const { amount, currency } = settledAmount(s);
    const out = {
      paid,
      status: s.status,
      amount: (amount ?? 0) / 100,
      currency,
      item: s.metadata.item,
      email: s.customer_details?.email || '',
      livemode: s.livemode,
    };
    if (paid && plan) {
      const expiry = expiryFrom(s.created, plan.months);
      out.license = makeLicense(expiry, s.id);
      out.expiry = `${expiry.slice(0, 4)}-${expiry.slice(4, 6)}-${expiry.slice(6, 8)}`;
    }
    return json(out);
  } catch (e) {
    return errorResponse(e);
  }
}

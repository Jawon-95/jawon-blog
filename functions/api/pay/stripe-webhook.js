import Stripe from 'stripe';
import { stripe, json, errorResponse, HttpError } from '../../../server/pay.js';
import { findPayment } from '../../../server/payment-store.js';
import { reconcilePayment, notifyProduct } from '../../../server/payment-gateway.js';

export async function onRequestPost({ request, env }) {
  try {
    if (!env.STRIPE_WEBHOOK_SECRET) throw new HttpError(503, 'STRIPE_WEBHOOK_SECRET is not configured.');
    let event;
    try {
      event = await stripe(env).webhooks.constructEventAsync(await request.text(), request.headers.get('stripe-signature'),
        env.STRIPE_WEBHOOK_SECRET, undefined, Stripe.createSubtleCryptoProvider());
    } catch { throw new HttpError(400, 'Invalid Stripe signature.'); }
    if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) return json({ received: true });
    const session = event.data.object;
    // Other/legacy integrations can share this Stripe account. Only handle our own payment records.
    if (!session.metadata?.payment_id) return json({ received: true });
    const row = await findPayment(env, session.metadata.payment_id);
    if (!row) throw new HttpError(404, 'Payment not found.');
    // An event can race the creation HTTP response. Stripe retries until the session has been recorded.
    if (!row.session_id) throw new HttpError(503, 'Payment creation has not finished.');
    await notifyProduct(env, await reconcilePayment(env, row, session));
    return json({ received: true });
  } catch (e) { return errorResponse(e); }
}

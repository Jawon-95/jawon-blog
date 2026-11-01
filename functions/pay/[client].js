import { errorResponse, HttpError, json } from '../../server/pay.js';
import { appConfig, reconcilePayment, notifyProduct } from '../../server/payment-gateway.js';
import { findPayment } from '../../server/payment-store.js';
import { paymentReturnPage } from '../../server/payment-return.js';

// Browser return only. Stripe webhooks never redirect. Return URLs come from trusted server configuration.
export async function onRequestGet({ request, env, params }) {
  try {
    const client = params.client;
    const app = appConfig(env, client);
    const query = new URL(request.url).searchParams;
    let row = await findPayment(env, query.get('payment'));
    if (!row || row.client_id !== client) throw new HttpError(404, 'Payment not found.');
    const canceled = query.get('canceled') === '1' && row.status !== 'paid';
    if (!canceled) {
      try { row = await reconcilePayment(env, row); }
      catch (e) {
        if (e.status === 409) throw e;
        // A temporary Stripe/network failure must not turn a pending payment into a success message.
        console.error('[payments] Return confirmation temporarily unavailable', row.id);
      }
      try { await notifyProduct(env, row); } catch (e) { if (e.status !== 502) throw e; }
    }
    const destination = new URL(canceled ? app.cancelPath : app.successPath, app.origin);
    if (canceled) destination.searchParams.set('canceled', '1');
    else destination.searchParams.set('order', row.order_id);
    const state = { paid: row.status === 'paid', status: row.status, canceled, destination: destination.href };
    if (query.get('format') === 'json') return json(state);
    return paymentReturnPage(state);
  } catch (e) { return errorResponse(e); }
}

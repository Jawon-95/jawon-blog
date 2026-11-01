import { json, errorResponse, HttpError } from '../../../server/pay.js';
import { authenticatedBody, reconcilePayment, notifyProduct, paymentView } from '../../../server/payment-gateway.js';
import { findPayment } from '../../../server/payment-store.js';

export async function onRequestPost({ request, env }) {
  try {
    const { client, body } = await authenticatedBody(request, env);
    let row = await findPayment(env, body.payment_id);
    if (!row || row.client_id !== client) throw new HttpError(404, 'Payment not found.');
    row = await reconcilePayment(env, row);
    // Authenticated status queries are also a recovery path if the webhook could not reach a product.
    // The caller can fulfill from this signed-in backend query even if the callback remains unavailable.
    try { await notifyProduct(env, row); } catch (e) { if (e.status !== 502) throw e; }
    return json(paymentView(row));
  } catch (e) { return errorResponse(e); }
}

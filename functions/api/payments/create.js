import { json, errorResponse } from '../../../server/pay.js';
import { authenticatedBody, createPayment } from '../../../server/payment-gateway.js';

export async function onRequestPost({ request, env }) {
  try {
    const { client, body } = await authenticatedBody(request, env);
    return json(await createPayment(env, client, body));
  } catch (e) { return errorResponse(e); }
}

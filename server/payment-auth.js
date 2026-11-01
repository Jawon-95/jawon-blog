// v1 signing contract shared with product backends. Never expose these secrets to browsers.
const encoder = new TextEncoder();

export async function sha256(value) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))].map(v => v.toString(16).padStart(2, '0')).join('');
}

function message(client, timestamp, method, path, body) {
  return `payment-v1\n${client}\n${timestamp}\n${method.toUpperCase()}\n${path}\n${body}`;
}

async function key(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signedHeaders(secret, client, method, path, body, timestamp = String(Math.floor(Date.now() / 1000))) {
  const signature = await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(message(client, timestamp, method, path, body)));
  return {
    'Content-Type': 'application/json',
    'X-Payment-Client': client,
    'X-Payment-Timestamp': timestamp,
    'X-Payment-Signature': [...new Uint8Array(signature)].map(v => v.toString(16).padStart(2, '0')).join(''),
  };
}

export async function verifyRequest(request, secret, client, body) {
  const timestamp = request.headers.get('X-Payment-Timestamp') || '';
  const signature = request.headers.get('X-Payment-Signature') || '';
  if (!secret || request.headers.get('X-Payment-Client') !== client || !/^\d{10}$/.test(timestamp)
    || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const url = new URL(request.url);
  return crypto.subtle.verify('HMAC', await key(secret), Uint8Array.from(signature.match(/../g), v => parseInt(v, 16)),
    encoder.encode(message(client, timestamp, request.method, url.pathname + url.search, body)));
}

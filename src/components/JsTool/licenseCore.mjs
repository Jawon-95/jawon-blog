/**
 * 激活码格式：JWS-<到期日YYYYMMDD>-<随机5位>-<校验6位>
 * 例：JWS-20271231-K3F9Q-1A2B3C
 *
 * 注意：这是纯前端校验，只能防君子不防小人。
 * 正式收款后建议换成服务端校验（如 Stripe webhook + 数据库）。
 */

const SALT = 'JawonStudio::js-tool::v1';

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function checksum(expiry, rand) {
  const a = fnv1a(`${SALT}|${expiry}|${rand}`);
  const b = fnv1a(`${rand}|${expiry}|${SALT}|${a}`);
  return ((a ^ b) >>> 0).toString(36).toUpperCase().padStart(6, '0').slice(-6);
}

/** 校验激活码，返回 { valid, expiry(Date|null), expired } */
export function parseLicense(key) {
  const m = /^JWS-(\d{8})-([A-Z0-9]{5})-([A-Z0-9]{6})$/.exec((key || '').trim().toUpperCase());
  if (!m) return { valid: false, expiry: null, expired: false };
  const [, expiry, rand, sum] = m;
  if (checksum(expiry, rand) !== sum) return { valid: false, expiry: null, expired: false };
  const date = new Date(`${expiry.slice(0, 4)}-${expiry.slice(4, 6)}-${expiry.slice(6, 8)}T23:59:59`);
  if (isNaN(date.getTime())) return { valid: false, expiry: null, expired: false };
  return { valid: true, expiry: date, expired: date.getTime() < Date.now() };
}

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * 生成激活码（供 scripts/gen-license.mjs 和 api/session.js 使用）。
 * 传入 seed（如 Stripe Checkout Session ID）时结果固定，同一订单刷新页面拿到的是同一个码。
 */
export function makeLicense(expiryYYYYMMDD, seed) {
  let rand = '';
  let h = seed ? fnv1a(`${SALT}|seed|${seed}`) : 0;
  for (let i = 0; i < 5; i++) {
    if (seed) {
      h = fnv1a(`${h}|${seed}|${i}`);
      rand += CHARS[h % CHARS.length];
    } else {
      rand += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
  }
  return `JWS-${expiryYYYYMMDD}-${rand}-${checksum(expiryYYYYMMDD, rand)}`;
}

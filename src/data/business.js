/**
 * 商家 / 产品信息集中配置。
 * 首页、产品页、联系页、政策页都从这里读取，改一处全站生效。
 */

export const business = {
  name: 'JawonStudio',
  owner: 'Jawon',
  email: 'topro@braveasy.com',
  discord: 'jawon.vip',
  github: 'https://github.com/Jawon-95',
  // 承诺的回复/发货时效（小时）
  responseHours: 48,
};

export const product = {
  name: 'JS Convert Tool',
  path: '/js-tool',
  tagline: 'Convert, escape, regex-ify and obfuscate JavaScript in one click.',
  description:
    'A browser-based utility for JavaScript developers and userscript authors. ' +
    'Paste your code, choose a conversion, and the result is copied to your clipboard instantly. ' +
    'Everything runs locally in your browser — your code is never uploaded.',
  features: [
    {
      title: 'JS → String',
      desc: 'Escape any JavaScript into a safe, single-line string literal.',
    },
    {
      title: 'String → CharCode',
      desc: 'Turn text into a String.fromCharCode(...) expression.',
    },
    {
      title: 'JS → Regex',
      desc: 'Build a regex that matches minified code even when variable names change.',
    },
    {
      title: 'Multi-layer eval encrypt',
      desc: 'Wrap code in 1–5 layers of hex-encoded eval to deter casual reading.',
    },
  ],
};

/**
 * 价格与 https://topro.braveasy.com/pricing 保持一致。
 * 购买按钮调用 /api/checkout 创建 Stripe 结账，服务端也从这里读取价格，改价只需改这里。
 */
export const plans = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: 6,
    period: 'month',
    months: 1,
    perMonth: 6,
    note: 'Standard price',
  },
  {
    id: 'quarterly',
    name: 'Quarterly',
    price: 15.4,
    period: '3 months',
    months: 3,
    perMonth: 5.1,
    note: '~14% off · save $2.6',
  },
  {
    id: 'annual',
    name: 'Annual',
    price: 56.6,
    period: '12 months',
    months: 12,
    perMonth: 4.7,
    note: '~21% off · save $15.4',
    best: true,
  },
];

/** 前端发起 Stripe 结账：成功则跳转到 Stripe 支付页，失败抛出带原因的错误 */
export async function startCheckout(body) {
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, order_id: crypto.randomUUID().replaceAll('-', '') }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || `Payment service unavailable (${res.status}).`);
  window.location.assign(data.url);
}

export function formatMoney(amount, currency = 'usd') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount);
  } catch {
    return `${amount} ${currency.toUpperCase()}`;
  }
}

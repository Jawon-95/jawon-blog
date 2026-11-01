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
 * stripeLink：开通 Stripe 后，把对应的 Payment Link 填进来，
 * 购买按钮会自动跳转到 Stripe 结账；留空时按钮会改为发邮件购买。
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
    stripeLink: '',
  },
  {
    id: 'quarterly',
    name: 'Quarterly',
    price: 15.4,
    period: '3 months',
    months: 3,
    perMonth: 5.1,
    note: '~14% off · save $2.6',
    stripeLink: '',
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
    stripeLink: '',
  },
];

export function buyHref(plan) {
  if (plan.stripeLink) return plan.stripeLink;
  const subject = `Buy ${product.name} - ${plan.name} ($${plan.price})`;
  return `mailto:${business.email}?subject=${encodeURIComponent(subject)}`;
}

// 生成 JS Convert Tool 激活码
// 用法：node scripts/gen-license.mjs <monthly|quarterly|annual|YYYYMMDD> [数量]
import { makeLicense, parseLicense } from '../src/components/JsTool/licenseCore.mjs';

const MONTHS = { monthly: 1, quarterly: 3, annual: 12 };
const [arg = 'monthly', count = '1'] = process.argv.slice(2);

let expiry = arg;
if (MONTHS[arg]) {
  const d = new Date();
  d.setMonth(d.getMonth() + MONTHS[arg]);
  expiry = d.toISOString().slice(0, 10).replaceAll('-', '');
}
if (!/^\d{8}$/.test(expiry)) {
  console.error('用法：node scripts/gen-license.mjs <monthly|quarterly|annual|YYYYMMDD> [数量]');
  process.exit(1);
}

for (let i = 0; i < Number(count); i++) {
  const key = makeLicense(expiry);
  if (!parseLicense(key).valid) throw new Error('self-check failed');
  console.log(key);
}

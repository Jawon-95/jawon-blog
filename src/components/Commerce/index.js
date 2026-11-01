import { useEffect, useState } from 'react';
import Link from '@docusaurus/Link';
import { business, plans, product, startCheckout, formatMoney } from '@site/src/data/business';
import styles from './styles.module.css';

export function PricingCards() {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const buy = async (plan) => {
    setBusy(plan.id);
    setError('');
    try {
      await startCheckout({ plan: plan.id });
    } catch (e) {
      setError(e.message);
      setBusy('');
    }
  };
  return (
    <>
    <div className={styles.plans}>
      {plans.map((p) => (
        <div key={p.id} className={`${styles.plan} ${p.best ? styles.best : ''}`}>
          {p.best && <span className={styles.ribbon}>Best value</span>}
          <h3>{p.name}</h3>
          <div className={styles.price}>
            <span className={styles.amount}>${p.price}</span>
            <span className={styles.per}>/ {p.period}</span>
          </div>
          <div className={styles.sub}>≈ ${p.perMonth} / month</div>
          <div className={styles.note}>{p.note}</div>
          <ul className={styles.incl}>
            <li>All 4 conversion tools</li>
            <li>Unlimited conversions</li>
            <li>Updates during the license period</li>
            <li>Email &amp; Discord support</li>
          </ul>
          <button
            type="button"
            className={`button button--block ${p.best ? 'button--primary' : 'button--secondary'}`}
            disabled={!!busy}
            onClick={() => buy(p)}>
            {busy === p.id ? 'Redirecting…' : `Buy ${p.name}`}
          </button>
        </div>
      ))}
    </div>
    {error && (
      <p className={styles.error}>
        {error} You can also <a href={`mailto:${business.email}`}>email us</a> to buy.
      </p>
    )}
    </>
  );
}

export function PurchaseFacts() {
  return (
    <p className={styles.facts}>
      Prices in USD. One-time payment per license period, no automatic renewal.
      Secure checkout by Stripe — your activation key is shown right after payment.{' '}
      <Link to="/refund">7-day money-back guarantee</Link>.
    </p>
  );
}

const TRUST = [
  { to: '/refund', title: 'Refund Policy', text: '7-day money-back guarantee' },
  { to: '/privacy', title: 'Privacy Policy', text: 'Your code never leaves your browser' },
  { to: '/terms', title: 'Terms of Service', text: 'License & usage terms' },
];

export function TrustLinks() {
  return (
    <div className={styles.trust}>
      {TRUST.map((t) => (
        <Link key={t.to} to={t.to} className={styles.trustItem}>
          <b>{t.title} →</b>
          <small>{t.text}</small>
        </Link>
      ))}
    </div>
  );
}

export function SellerBox() {
  return (
    <div className={styles.seller}>
      <div>
        <h3>Who is selling</h3>
        <p>
          <b>{business.name}</b> is an independent software studio run by {business.owner}.
          We build and sell small developer tools. {product.name} is our first paid product.
        </p>
      </div>
      <div>
        <h3>How to reach us</h3>
        <p>
          Email: <a href={`mailto:${business.email}`}>{business.email}</a><br />
          Discord: <b>{business.discord}</b><br />
          We reply within {business.responseHours} hours.
        </p>
      </div>
    </div>
  );
}

// 与 src/components/JsTool/index.js 中保存激活码的 key 一致
const LICENSE_KEY = 'jws-js-tool-license';

/** Stripe 付款后回到 /js-tool?session_id=...，在页面顶部显示付款结果和激活码 */
export function PurchaseResult() {
  const [state, setState] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('session_id');
    if (!id) return;
    setState({ loading: true });
    fetch(`/api/session?session_id=${encodeURIComponent(id)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || `Request failed (${r.status}).`);
        setState({ data });
      })
      .catch((e) => setState({ error: e.message }));
  }, []);

  if (!state) return null;
  const { data, error, loading } = state;

  function activate() {
    try { localStorage.setItem(LICENSE_KEY, data.license); } catch { /* 隐私模式下忽略 */ }
    window.location.replace(product.path);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(data.license);
      setCopied(true);
    } catch { /* ignore */ }
  }

  return (
    <div className={styles.result} role="status">
      {loading && <p>Confirming your payment…</p>}
      {error && (
        <p>
          We couldn&apos;t load this payment: {error} If you were charged, email{' '}
          <a href={`mailto:${business.email}`}>{business.email}</a>.
        </p>
      )}
      {data && !data.paid && <p>Stripe has not confirmed this payment yet. Refresh this page in a minute.</p>}
      {data?.paid && (
        <>
          <div className={styles.resultHead}>
            <b>Payment received — thank you!</b>
            <span>
              {formatMoney(data.amount, data.currency)} · {data.item}
              {!data.livemode && ' · test mode'}
            </span>
          </div>
          <span className={styles.resultLabel}>Your activation key · valid until {data.expiry}</span>
          <code className={styles.resultKey}>{data.license}</code>
          <div className={styles.resultActions}>
            <button type="button" className="button button--primary" onClick={activate}>Activate now</button>
            <button type="button" className="button button--secondary" onClick={copy}>{copied ? 'Copied ✓' : 'Copy key'}</button>
          </div>
          <small>Save this key{data.email ? ` — a receipt was sent to ${data.email}` : ''}.</small>
        </>
      )}
    </div>
  );
}

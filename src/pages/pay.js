import { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';
import { business, startCheckout, formatMoney } from '@site/src/data/business';
import styles from './pay.module.css';

/**
 * /pay 自定义金额付款：定制开发、技术咨询，或者只是想请我喝杯咖啡。
 * 可用 ?amount=20&item=... 预填；付款完成后回到 /pay?session_id=... 显示结果。
 */

const PRESETS = [5, 10, 20, 50];

const SERVICES = [
  { title: 'Custom software', text: 'Scripts, browser extensions, automation and small desktop or web tools built to order.' },
  { title: 'Technical consulting', text: 'Stuck on JavaScript, reverse engineering, servers or deployment? Book some of my time.' },
  { title: 'Say thanks', text: 'If an article or tool here saved you time, a small tip keeps the lights on.' },
];

const STEPS = [
  { title: 'Talk to me first', text: 'For paid work, describe what you need by email or Discord. We agree on scope and price before you pay.' },
  { title: 'Pay the agreed amount', text: 'Enter the amount and a short note, then pay securely with Stripe.' },
  { title: 'I get to work', text: `Reply with your receipt so I can match the payment. I respond within ${business.responseHours} hours.` },
];

function Result({ sessionId }) {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    fetch(`/api/session?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || `Request failed (${r.status}).`);
        setState({ data });
      })
      .catch((e) => setState({ error: e.message }));
  }, [sessionId]);

  const { loading, error, data } = state;
  if (loading) return <p className={styles.muted}>Confirming your payment…</p>;
  if (error) {
    return (
      <p className={styles.error}>
        We couldn&apos;t load this payment: {error} If you were charged, email{' '}
        <a href={`mailto:${business.email}`}>{business.email}</a>.
      </p>
    );
  }
  if (!data.paid) return <p className={styles.muted}>Stripe has not confirmed this payment yet. Refresh in a minute.</p>;
  return (
    <div className={styles.result}>
      <span className={styles.check} aria-hidden>✓</span>
      <Heading as="h2">Thank you — payment received</Heading>
      <div className={styles.paid}>{formatMoney(data.amount, data.currency)}</div>
      <p className={styles.muted}>
        {data.item}
        {!data.livemode && ' · test mode'}
      </p>
      <p>
        {data.email ? `A receipt was sent to ${data.email}. ` : ''}
        If this was for custom work, reply to me with the receipt — email{' '}
        <a href={`mailto:${business.email}`}>{business.email}</a> or Discord <b>{business.discord}</b>.
      </p>
      <Link className="button button--secondary" to="/pay">Make another payment</Link>
    </div>
  );
}

function PayForm() {
  const [form, setForm] = useState({ amount: '', item: '', note: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setForm((f) => ({ ...f, amount: q.get('amount') || '', item: q.get('item') || '' }));
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const amount = Number(form.amount);
  const valid = Number.isFinite(amount) && amount >= 1;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await startCheckout(form);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.field}>
        <span>Amount (USD)</span>
        <div className={styles.money}>
          <b>$</b>
          <input type="number" inputMode="decimal" min="1" step="0.01" required placeholder="0.00"
            value={form.amount} onChange={set('amount')} />
        </div>
      </label>
      <div className={styles.presets}>
        {PRESETS.map((n) => (
          <button key={n} type="button" className={Number(form.amount) === n ? styles.presetOn : ''}
            onClick={() => setForm({ ...form, amount: String(n) })}>
            ${n}
          </button>
        ))}
      </div>
      <label className={styles.field}>
        <span>What is it for? <i>optional</i></span>
        <input maxLength={120} placeholder="e.g. Custom script, consulting, tip" value={form.item} onChange={set('item')} />
      </label>
      <label className={styles.field}>
        <span>Note <i>optional</i></span>
        <textarea maxLength={500} rows={3} placeholder="Your Discord / order details / anything that helps me find your request"
          value={form.note} onChange={set('note')} />
      </label>
      <label className={styles.field}>
        <span>Email for the receipt <i>optional</i></span>
        <input type="email" maxLength={200} placeholder="you@example.com" value={form.email} onChange={set('email')} />
      </label>
      <button type="submit" className="button button--primary button--lg button--block" disabled={!valid || busy}>
        {busy ? 'Redirecting to Stripe…' : valid ? `Pay ${formatMoney(amount)}` : 'Pay'}
      </button>
      {error && <p className={styles.error}>{error}</p>}
      <p className={styles.fine}>
        🔒 Secure checkout by Stripe — cards, Apple Pay, Google Pay and more. By paying you agree to the{' '}
        <Link to="/terms">Terms</Link> and <Link to="/refund">Refund Policy</Link>.
      </p>
    </form>
  );
}

export default function PayPage() {
  const [sessionId, setSessionId] = useState(null);
  useEffect(() => setSessionId(new URLSearchParams(window.location.search).get('session_id')), []);

  return (
    <Layout title="Custom Work" description={`Custom software, consulting and tips — pay ${business.name} any amount.`}>
      <main className={`container ${styles.page}`}>
        <header className={styles.header}>
          <span className="jw-kicker">Custom work · Consulting · Tips</span>
          <Heading as="h1" className={`jw-display ${styles.title}`}>Work with me</Heading>
          <p className={styles.lead}>
            Need something built, or want a second pair of eyes on a tricky problem? Agree on a price with me,
            then pay any amount here. Liked something on this site? A small tip is always appreciated.
          </p>
        </header>

        <div className={styles.grid}>
          <div className={styles.info}>
            <div className={styles.services}>
              {SERVICES.map((s) => (
                <div key={s.title} className={styles.service}>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              ))}
            </div>

            <Heading as="h2" className={styles.h2}>How it works</Heading>
            <ol className={styles.steps}>
              {STEPS.map((s) => (
                <li key={s.title}>
                  <b>{s.title}</b>
                  <span>{s.text}</span>
                </li>
              ))}
            </ol>

            <p className={styles.contact}>
              Email <a href={`mailto:${business.email}`}>{business.email}</a> · Discord <b>{business.discord}</b>
            </p>
          </div>

          <aside className={`jw-glass ${styles.card}`}>{sessionId ? <Result sessionId={sessionId} /> : <PayForm />}</aside>
        </div>
      </main>
    </Layout>
  );
}

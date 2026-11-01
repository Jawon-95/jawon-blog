import Link from '@docusaurus/Link';
import { business, plans, product, buyHref } from '@site/src/data/business';
import styles from './styles.module.css';

export function PricingCards() {
  return (
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
          <a className={`button button--block ${p.best ? 'button--primary' : 'button--secondary'}`} href={buyHref(p)}>
            Buy {p.name}
          </a>
        </div>
      ))}
    </div>
  );
}

export function PurchaseFacts() {
  return (
    <p className={styles.facts}>
      Prices in USD. One-time payment per license period, no automatic renewal.
      Your activation key is delivered by email within {business.responseHours} hours.{' '}
      <Link to="/refund">7-day money-back guarantee</Link>.
    </p>
  );
}

const TRUST = [
  { to: '/contact', icon: '✉️', title: 'Contact', text: business.email },
  { to: '/refund', icon: '↩️', title: 'Refund Policy', text: '7-day money-back guarantee' },
  { to: '/privacy', icon: '🔒', title: 'Privacy Policy', text: 'Your code never leaves your browser' },
  { to: '/terms', icon: '📄', title: 'Terms of Service', text: 'License & usage terms' },
];

export function TrustLinks() {
  return (
    <div className={styles.trust}>
      {TRUST.map((t) => (
        <Link key={t.to} to={t.to} className={styles.trustItem}>
          <span className={styles.trustIcon} aria-hidden>{t.icon}</span>
          <span>
            <b>{t.title}</b>
            <small>{t.text}</small>
          </span>
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

import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';
import JsTool from '@site/src/components/JsTool';
import { business, product, plans } from '@site/src/data/business';
import { PricingCards, PurchaseFacts, PurchaseResult, SellerBox, TrustLinks } from '@site/src/components/Commerce';
import styles from './js-tool.module.css';

const lowest = Math.min(...plans.map((p) => p.perMonth));

const STEPS = [
  { title: 'Choose a plan', text: 'Pick Monthly, Quarterly or Annual below and pay securely with Stripe.' },
  { title: 'Get your key', text: 'Your activation key appears on screen as soon as the payment succeeds.' },
  { title: 'Activate', text: 'Paste the key into the bar above the tools. Unlimited use until it expires.' },
];

function Section({ id, kicker, title, children }) {
  return (
    <section className={styles.section}>
      <span className="jw-kicker">{kicker}</span>
      <Heading as="h2" id={id} className={styles.h2}>{title}</Heading>
      {children}
    </section>
  );
}

export default function JsToolPage() {
  return (
    <Layout title={product.name} description={`${product.name} — ${product.tagline}`}>
      <main className={`container ${styles.page}`}>
        <header className={styles.header}>
          <span className="jw-kicker">Developer tool · by {business.name}</span>
          <Heading as="h1" className={`jw-display ${styles.title}`}>{product.name}</Heading>
          <p className={styles.lead}>{product.description}</p>
          <div className={styles.chips}>
            <span>3 free conversions / day</span>
            <span>Runs 100% in your browser</span>
            <span>From ${lowest} / month</span>
            <Link to="/refund">7-day refund</Link>
          </div>
        </header>

        <PurchaseResult />
        <section className={`jw-glass ${styles.tool}`}>
          <JsTool />
        </section>

        <Section kicker="Features" title="What you get">
          <div className={styles.features}>
            {product.features.map((f, i) => (
              <div key={f.title} className={styles.feature}>
                <span className={styles.num}>0{i + 1}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="pricing" kicker="Pricing" title="One-time payment, no subscription">
          <PricingCards />
          <PurchaseFacts />
        </Section>

        <Section kicker="How it works" title="From payment to activation">
          <ol className={styles.steps}>
            {STEPS.map((s) => (
              <li key={s.title}>
                <b>{s.title}</b>
                <span>{s.text}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="contact" kicker="Support" title="Questions? Talk to a human">
          <SellerBox />
          <TrustLinks />
        </Section>
      </main>
    </Layout>
  );
}

import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';
import JsTool from '@site/src/components/JsTool';
import { business, product } from '@site/src/data/business';
import { PricingCards, PurchaseFacts, SellerBox, TrustLinks } from '@site/src/components/Commerce';
import styles from './js-tool.module.css';

const STEPS = [
  { title: 'Choose a plan', text: 'Pick Monthly, Quarterly or Annual below and complete the payment.' },
  { title: 'Receive your key', text: `We email your activation key within ${business.responseHours} hours.` },
  { title: 'Activate', text: 'Paste the key into the bar above the tools. Unlimited use until the key expires.' },
];

export default function JsToolPage() {
  return (
    <Layout title={product.name} description={`${product.name} — ${product.tagline}`}>
      <header className={styles.header}>
        <div className="container">
          <span className={styles.eyebrow}>Sold by {business.name}</span>
          <Heading as="h1" className={styles.title}>{product.name}</Heading>
          <p className={styles.lead}>{product.description}</p>
          <div className={styles.chips}>
            <span>From $4.7 / month</span>
            <span>3 free conversions / day</span>
            <span>No data uploaded</span>
            <Link to="/refund">7-day refund</Link>
          </div>
        </div>
      </header>

      <main className="container">
        <section className={styles.section}>
          <JsTool />
        </section>

        <section className={styles.section}>
          <Heading as="h2" id="pricing" className={styles.h2}>Pricing</Heading>
          <PricingCards />
          <PurchaseFacts />
        </section>

        <section className={styles.section}>
          <Heading as="h2" className={styles.h2}>How purchasing works</Heading>
          <ol className={styles.steps}>
            {STEPS.map((s) => (
              <li key={s.title}>
                <b>{s.title}</b>
                <span>{s.text}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section}>
          <SellerBox />
        </section>

        <section className={styles.section}>
          <TrustLinks />
        </section>
      </main>
    </Layout>
  );
}

import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import { business, product, plans } from '@site/src/data/business';
import { PricingCards, PurchaseFacts, TrustLinks } from '@site/src/components/Commerce';
import styles from './index.module.css';

const lowest = Math.min(...plans.map((p) => p.perMonth));

function CodePreview() {
  return (
    <div className={styles.preview} aria-hidden>
      <div className={styles.previewBar}>
        <i /><i /><i />
        <span>{product.name}</span>
      </div>
      <pre className={styles.previewBody}>
        <span className={styles.c}>// input</span>{'\n'}
        alert("Hi");{'\n\n'}
        <span className={styles.c}>// JS → String</span>{'\n'}
        alert(\"Hi\");{'\n\n'}
        <span className={styles.c}>// String → CharCode</span>{'\n'}
        String.fromCharCode(72,105){'\n\n'}
        <span className={styles.c}>// eval encrypt · 1 layer</span>{'\n'}
        window[String.fromCharCode(101,118,{'\n'}
        {'  '}97,108)]("\x61\x6c\x65\x72…");
      </pre>
    </div>
  );
}

function Hero() {
  return (
    <header className={styles.hero}>
      <div className={`container ${styles.heroInner}`}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>{business.name} · Developer tools</span>
          <Heading as="h1" className={styles.title}>{product.name}</Heading>
          <p className={styles.lead}>{product.tagline}</p>
          <p className={styles.desc}>{product.description}</p>
          <div className={styles.cta}>
            <Link className="button button--primary button--lg" to={product.path}>
              Try it free →
            </Link>
            <Link className="button button--outline button--lg" to={`${product.path}#pricing`}>
              From ${lowest}/month
            </Link>
          </div>
          <p className={styles.small}>3 free conversions per day · no account needed · runs 100% in your browser</p>
        </div>
        <CodePreview />
      </div>
    </header>
  );
}

function Features() {
  return (
    <section className={styles.section}>
      <div className="container">
        <Heading as="h2" className={styles.h2}>What you get</Heading>
        <div className={styles.features}>
          {product.features.map((f) => (
            <Link key={f.title} to={product.path} className={styles.feature}>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${product.name} by ${business.name}`}
      description={`${siteConfig.title} — ${product.tagline}`}>
      <Hero />
      <main>
        <Features />
        <section className={`${styles.section} ${styles.alt}`}>
          <div className="container">
            <Heading as="h2" id="pricing" className={styles.h2}>Pricing</Heading>
            <p className={styles.sectionLead}>Every plan includes every feature. Pick how long you want it.</p>
            <PricingCards />
            <PurchaseFacts />
          </div>
        </section>
        <section className={styles.section}>
          <div className="container">
            <Heading as="h2" className={styles.h2}>Buy with confidence</Heading>
            <TrustLinks />
          </div>
        </section>
        <section className={styles.blogStrip}>
          <div className="container">
            Also by {business.owner}: technical notes on JavaScript, Android, servers and more.{' '}
            <Link to={siteConfig.themeConfig.startPath}>Read the blog →</Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}

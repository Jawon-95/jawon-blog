import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { usePluginData } from '@docusaurus/useGlobalData';
import { useAllDocsData } from '@docusaurus/plugin-content-docs/client';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import AutoScroller from '@site/src/components/AutoScroller';
import { product, plans } from '@site/src/data/business';
import styles from './index.module.css';

const lowest = Math.min(...plans.map((p) => p.perMonth));

const OFFERS = [
  {
    to: product.path,
    icon: '</>',
    tag: 'Developer tool',
    title: product.name,
    text: product.tagline,
    meta: `Free trial · from $${lowest}/mo`,
  },
  {
    to: '/pay',
    icon: '✦',
    tag: 'Custom work',
    title: 'Custom software & consulting',
    text: 'Scripts, browser tools and automation built to order, or help with a tricky problem. Tips welcome too.',
    meta: 'Any amount · pay online',
  },
];

// 最近更新的文章：标题/摘要来自 plugins/recentArticles.js，链接来自文档插件
function useRecentArticles() {
  const recent = usePluginData('docusaurus-plugin-recent-articles') ?? [];
  const docsData = useAllDocsData();
  const paths = {};
  for (const plugin of Object.values(docsData)) {
    for (const version of plugin.versions) {
      for (const doc of version.docs) paths[doc.id] = doc.path;
    }
  }
  return recent.filter((a) => paths[a.id]).map((a) => ({ ...a, href: paths[a.id] }));
}

function OfferCard({ offer, single }) {
  return (
    <Link to={offer.to} className={`${styles.card} ${single ? styles.single : styles.offer}`}>
      <div className={styles.offerTop}>
        <span className={styles.icon} aria-hidden>{offer.icon}</span>
        <span className={styles.tag}>{offer.tag}</span>
      </div>
      <h3>{offer.title}</h3>
      <p>{offer.text}</p>
      <span className={styles.meta}>{offer.meta}</span>
    </Link>
  );
}

function Panel({ title, link, linkText, children, className }) {
  return (
    <section className={`jw-glass ${styles.panel} ${className || ''}`}>
      <div className={styles.panelHead}>
        <h2>{title}</h2>
        <Link to={link}>{linkText} →</Link>
      </div>
      {children}
    </section>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  const articles = useRecentArticles();
  return (
    <Layout description={`${siteConfig.title} — ${siteConfig.tagline}`}>
      <main className={styles.home}>
        <div className={`container ${styles.inner}`}>
          <header className={styles.hero}>
            <span className="jw-kicker">Notes · Tools · Custom work</span>
            <Heading as="h1" className={`jw-display ${styles.title}`}>{siteConfig.title}</Heading>
            <p className={styles.lead}>总结一些常见问题和知识，让我们搬砖的速度更快！</p>
            <div className={styles.actions}>
              <Link className="button button--primary button--lg" to={siteConfig.themeConfig.startPath}>
                开始阅读
              </Link>
              <Link className="button button--secondary button--lg" to={product.path}>
                浏览工具
              </Link>
            </div>
          </header>

          <div className={styles.panels}>
            <Panel title="最新文章" link={siteConfig.themeConfig.startPath} linkText="全部文章">
              <AutoScroller label="最新文章">
                {articles.map((a) => (
                  <Link key={a.id} to={a.href} className={`${styles.card} ${styles.post}`}>
                    <span className={styles.date}>{a.date}</span>
                    <h3>{a.title}</h3>
                    {a.excerpt && <p>{a.excerpt}</p>}
                  </Link>
                ))}
              </AutoScroller>
            </Panel>

            <Panel title="工具与服务" link="/pay" linkText="定制开发" className={styles.side}>
              {/* 只有一张卡片时静态展示，多于一张才自动滚动 */}
              {OFFERS.length > 1 ? (
                <AutoScroller label="工具与服务">{OFFERS.map((o) => <OfferCard key={o.to} offer={o} />)}</AutoScroller>
              ) : (
                <div className={styles.static}>{OFFERS.map((o) => <OfferCard key={o.to} offer={o} single />)}</div>
              )}
            </Panel>
          </div>
        </div>
      </main>
    </Layout>
  );
}

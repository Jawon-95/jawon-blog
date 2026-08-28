import React from 'react';
import Link from '@docusaurus/Link';
import {useDocsVersion} from '@docusaurus/plugin-content-docs/client';
import {usePluginData} from '@docusaurus/useGlobalData';
import styles from './styles.module.css';

// 将侧边栏树展平为 docId -> href
function flattenSidebarLinks(items) {
  const links = [];
  for (const item of items) {
    if (item.type === 'link') {
      links.push({docId: item.docId, href: item.href});
    } else if (item.type === 'category') {
      links.push(...flattenSidebarLinks(item.items));
    }
  }
  return links;
}

export default function RecentArticles() {
  // 仅在文档页面中使用（docs/简介.md），useDocsVersion 依赖文档上下文
  const version = useDocsVersion();
  // 数据由自定义插件 docusaurus-plugin-recent-articles 在构建时生成
  const recent = usePluginData('docusaurus-plugin-recent-articles') ?? [];

  const hrefMap = Object.fromEntries(
    flattenSidebarLinks(Object.values(version.docsSidebars ?? {}).flat()).map(
      ({docId, href}) => [docId, href],
    ),
  );

  const articles = recent
    .map((item) => {
      const doc = version.docs[item.id];
      if (!doc || !hrefMap[item.id]) {
        return null;
      }
      return {
        title: doc.title,
        description: doc.description,
        href: hrefMap[item.id],
        date: item.date,
      };
    })
    .filter(Boolean);

  if (articles.length === 0) {
    return null;
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>最近更新</h2>
      <div className={styles.grid}>
        {articles.map((article) => (
          <Link key={article.href} to={article.href} className={styles.card}>
            <span className={styles.cardDate}>{article.date}</span>
            <h3 className={styles.cardTitle}>{article.title}</h3>
            {article.description && (
              <p className={styles.cardDesc}>{article.description}</p>
            )}
            <span className={styles.cardMore}>阅读全文 →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

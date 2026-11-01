// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import { themes as prismThemes } from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

let date = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai' })
  .format(new Date()).replaceAll("/", "-");

const siteUrl = 'https://www.braveasy.com';

// 本地开发时把 /api/* 转发给 scripts/dev-api.mjs（线上由 Cloudflare Pages Functions 运行 functions/ 目录）
function devApiProxy() {
  return {
    name: 'dev-api-proxy',
    configureWebpack(_config, isServer) {
      if (isServer) return {};
      return {
        devServer: {
          proxy: [{ context: ['/api'], target: `http://localhost:${process.env.DEV_API_PORT || 3001}` }],
        },
      };
    },
  };
}

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'JawonStudio',
  tagline: 'Developer tools & technical notes by Jawon',
  favicon: 'img/favicon.png',
  url: siteUrl,
  baseUrl: '/',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'zh',
    locales: ['zh'],
  },

  staticDirectories: ['static'],

  // Google AdSense - 注入到每个页面的 <head> 中
  scripts: [
    {
      src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2220563956316376',
      async: true,
      crossorigin: 'anonymous',
    },
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          showLastUpdateTime: true,
        },
        blog: false,  // 仅文档模式
        // blog: {
        //   showReadingTime: true,
        //   feedOptions: {
        //     type: ['rss', 'atom'],
        //     xslt: true,
        //   },
        //   onInlineTags: 'warn',
        //   onInlineAuthors: 'warn',
        //   onUntruncatedBlogPosts: 'warn',
        // },
        theme: {
          customCss: [
            './src/css/colors.css',
            './src/css/layout.css',
          ],
        },
      }),
    ],
  ],

  /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
  themeConfig: {
    colorMode: {
      // 与 TOPRO 官网一致默认深色，可在右上角切换浅色
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: false,
    },
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: 'JawonStudio',
      logo: {
        alt: 'JawonStudio Logo',
        src: 'img/logo.png',
      },
      hideOnScroll: true,
      items: [
        { to: '/docs/简介', label: 'Blog', position: 'left' },
        { to: '/js-tool', label: 'JS Convert Tool', position: 'left' },
        { to: '/pay', label: 'Custom Work', position: 'left' },
      ],
    },
    startPath: '/docs/简介',
    footer: {
      style: 'light',
      links: [
        { label: 'Blog', to: '/docs/简介' },
        { label: 'JS Convert Tool', to: '/js-tool' },
        { label: 'Custom Work', to: '/pay' },
        { label: 'Refund Policy', to: '/refund' },
        { label: 'Privacy Policy', to: '/privacy' },
        { label: 'Terms of Service', to: '/terms' },
        { label: 'topro@braveasy.com', href: 'mailto:topro@braveasy.com' },
      ],
      copyright: `© ${new Date().getFullYear()} JawonStudio · Last updated ${date}`,
    },
    prism: {
      theme: prismThemes.oneLight,
      darkTheme: prismThemes.oneDark,
    },

    giscus: {
      repo: "Jawon-95/jawon-blog",
      repoId: "R_kgDORF-svA",
      category: 'General',
      categoryId: "DIC_kwDONV8hTc4Cl9O0",
      lang: "zh-CN",
    }
  },

  plugins: [
    devApiProxy,
    // 自定义插件：扫描 docs 生成「最近更新」文章列表（供 RecentArticles 组件使用）
    [
      require.resolve('./plugins/recentArticles'),
      {
        maxItems: 12,
      },
    ],
  ],

  themes: [
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      ({
        hashed: true,
        language: ["en", "zh"],
        docsRouteBasePath: "/",
        highlightSearchTermsOnTargetPage: true,
      }),
    ],
  ],
};

export default config;

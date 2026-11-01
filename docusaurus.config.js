// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import { themes as prismThemes } from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

let date = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai' })
  .format(new Date()).replaceAll("/", "-");

const siteUrl = 'https://jawon.braveasy.com';

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
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
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
        { to: '/js-tool', label: 'JS Convert Tool', position: 'left' },
        { to: '/js-tool#pricing', label: 'Pricing', position: 'left' },
        { to: '/docs/简介', label: 'Blog', position: 'left' },
        { to: '/contact', label: 'Contact', position: 'right' },
        {
          href: 'https://github.com/Jawon-95/jawon-blog',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    startPath: '/docs/简介',
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Products',
          items: [
            { label: 'JS Convert Tool', to: '/js-tool' },
            { label: 'Pricing', to: '/js-tool#pricing' },
          ],
        },
        {
          title: 'Support',
          items: [
            { label: 'Contact', to: '/contact' },
            { label: 'Refund Policy', to: '/refund' },
            { label: 'topro@braveasy.com', href: 'mailto:topro@braveasy.com' },
          ],
        },
        {
          title: 'Legal',
          items: [
            { label: 'Privacy Policy', to: '/privacy' },
            { label: 'Terms of Service', to: '/terms' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'Blog', to: '/docs/简介' },
            { label: 'GitHub', href: 'https://github.com/Jawon-95' },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} JawonStudio · Powered by docusaurus | Create at: 2025-1-17. Last Update: ${date}`,
    },
    prism: {
      theme: prismThemes.oneLight,
      darkTheme: prismThemes.vsDark,
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
    // 自定义插件：扫描 docs 生成「最近更新」文章列表（供 RecentArticles 组件使用）
    [
      require.resolve('./plugins/recentArticles'),
      {
        maxItems: 8,
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

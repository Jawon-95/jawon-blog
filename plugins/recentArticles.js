/**
 * 自定义 Docusaurus 插件：扫描 docs 目录，生成「最近更新」文章列表。
 * 数据在构建/启动时由 Docusaurus 自动生成，客户端组件通过
 * usePluginData('docusaurus-plugin-recent-articles') 读取。
 *
 * 排序依据：frontmatter 中的 date 字段（若存在）优先，否则使用文件修改时间。
 * 可通过插件配置调整：path（扫描目录）、maxItems（数量）、exclude（排除的文章 id）。
 */
const fs = require('fs');
const path = require('path');

// 递归收集所有 .md/.mdx 文件
function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (/\.mdx?$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 从 frontmatter 读取 date 字段
function readDate(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) {
    return null;
  }
  const line = m[1].split('\n').find((l) => /^date\s*:/.test(l));
  if (!line) {
    return null;
  }
  const raw = line.replace(/^date\s*:\s*/, '').trim().replace(/^["']|["']$/g, '');
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : formatDate(d);
}

// 标题：frontmatter title > 正文第一行的一级标题 > 文件名
function readTitle(content, file) {
  const fm = /^---\n([\s\S]*?)\n---/.exec(content);
  const line = fm && fm[1].split('\n').find((l) => /^title\s*:/.test(l));
  if (line) {
    return line.replace(/^title\s*:\s*/, '').trim().replace(/^["']|["']$/g, '');
  }
  const first = stripFrontmatter(content).split('\n').find((l) => l.trim());
  const h1 = first && /^#\s+(.+)/.exec(first.trim());
  return h1 ? h1[1].trim() : path.basename(file).replace(/\.mdx?$/, '');
}

function stripFrontmatter(content) {
  return content.replace(/^---\n[\s\S]*?\n---\n?/, '');
}

// 摘要：正文中第一段普通文字（跳过标题、图片、代码、表格、import 等）
function readExcerpt(content) {
  let inCode = false;
  for (const raw of stripFrontmatter(content).split('\n')) {
    const line = raw.trim();
    if (line.startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode || !line || /^(#|!\[|\||<|import |export |---)/.test(line)) {
      continue;
    }
    const text = line
      .replace(/^[>*\-+\d.\s]+/, '')
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/[*_`~]/g, '')
      .trim();
    if (text.length >= 4) {
      return text.length > 90 ? `${text.slice(0, 90)}…` : text;
    }
  }
  return '';
}

module.exports = function recentArticlesPlugin(context, options = {}) {
  const {
    path: sourceDir = 'docs',
    maxItems = 8,
    exclude = ['简介'],
  } = options;

  return {
    name: 'docusaurus-plugin-recent-articles',
    async loadContent() {
      const source = path.resolve(context.siteDir, sourceDir);
      return walk(source)
        .map((file) => {
          const content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
          const id = path
            .relative(source, file)
            .replace(/\\/g, '/')
            .replace(/\.mdx?$/, '');
          const date = readDate(content) || formatDate(fs.statSync(file).mtime);
          return {
            id,
            date,
            title: readTitle(content, file),
            excerpt: readExcerpt(content),
          };
        })
        .filter((a) => !exclude.includes(a.id))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, maxItems);
    },
    async contentLoaded({ content, actions }) {
      actions.setGlobalData(content);
    },
  };
};

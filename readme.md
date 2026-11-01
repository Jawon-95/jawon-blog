# 项目说明

### JawonStudio

这是一个基于 [Docusaurus](https://docusaurus.io/) 的个人博客。

### 部署步骤

一键安装依赖

```bash
# 安装依赖（--legacy-peer-deps 忽略版本限制）
npm install --legacy-peer-deps
```

如果安装时卡住，可以尝试临时切换镜像

```bash
# 切换淘宝镜像
npm config set registry https://registry.npmmirror.com
# 切换官方镜像
npm config set registry https://registry.npmjs.org
```

### 指令集成

```bash
# 一键上传：
npm run push

# 一键拉取：
npm run pull

# 一键生成：
npm run build

# 一键预览：
npm run start

# 手动上传：
git add .; git commit -m '1'; git push origin master

# 手动拉取：
git fetch origin master; git reset --hard origin/master
```

### 注意事项

#### 文件名缺陷

docusaurus 自身缺陷：文章的文件名如果含有**英文括号**（如 `xxx(4).md`），对应页面的路由会匹配失败，显示找不到页面（其路由依赖的 path-to-regexp 会把括号当作正则分组）。

规避方式：此类文件在 frontmatter 中手动指定不带括号的 `slug`，例如 `slug: /xxx-4`。当前仓库内的文章文件名均使用全角括号，不受影响。

#### 文章标题

如果文章中第一行的格式为一级标题，那么第一行将成为此篇文章的的标题，否则标题为该文章的文件名。

### 售卖 JS Convert Tool

- 商家信息、价格、Stripe Payment Link 统一在 `src/data/business.js` 中修改。
- 生成激活码：

```bash
node scripts/gen-license.mjs annual
```

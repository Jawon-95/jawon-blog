# Vercel部署前后端共存项目

本篇文章记录一下使用 Vercel 平台，基于 express 部署一个前后端并存的项目。

## 项目结构

```bash
│  index.js
│  package-lock.json
│  package.json
│
├─frontend
│      index.html
│
└─node_modules
```

## 构建步骤

### 初始化 npm 项目

```bash
npm init -y
```

### 安装 express

```bash
npm i express
```

### 添加前端页面

在根目录创建 frontend 文件夹，用于存放前端页面，例如 frontend 下的 html 文件。

```
├─frontend
│      index.html
```

### 创建入口文件

在根目录创建 index.js 文件，写入以下代码。

```js
const express = require('express');
const path = require('path');
const app = express();

/**
 * 设置作为静态资源响应的目录，如果请求路径指向静态资源，
 * 则返回静态资源，否则继续向下寻找对应的路由。
*/
app.use(express.static(path.join(__dirname, './frontend')));

// 对于其他请求，自定义响应结果
app.get('*', (req, res) => {
    console.log('received URL: ' + req.url);
    res.send('<h1 style="text-align:center">404 Not Found</h1>');
});

let port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running at: http://localhost:${port}`);
});

module.exports = app;
```

### 创建 vercel 配置文件

在根目录创建 vercel.json 文件，写入以下代码。

```json
{
    "version": 2,
    "builds": [
        {
            "src": "index.js",
            "use": "@now/node"
        }
    ],
    "routes": [
        {
            "src": "/(.*)",
            "dest": "index.js"
        }
    ]
}
```

### 创建 gitignore

在根目录创建 .gitignore 文件，忽略没必要上传的文件或目录。

```bash
node_modules/
.vercel
```

最后，将项目推送至 github 仓库，使用 vercel 连接该仓库，一键部署即可（此步骤网上有大量教程）。部署成功后，访问生成的域名，能够正常显示前端页面，访问未知路径，能够正常显示预设置的 404 not found（对于国内无法访问 vercel 生成的域名的问题，可参考 [docusaurus+github+vercel+cloudflare 免费部署博客](https://jawon.netlify.app/docs/%E6%9C%8D%E5%8A%A1%E5%99%A8%E7%9B%B8%E5%85%B3/%E7%BD%91%E7%AB%99%E6%90%AD%E5%BB%BA/docusaurus+github+vercel%) 中的解决方案）。

但是但是但是，这种部署方式有一个缺陷，那就是大文件无法加载，差不多大小为几兆的图片就会加载失败，因为 vercel 平台的限制，但如果不使用 express，部署成纯静态页面的话就不会有这个问题！！！

---

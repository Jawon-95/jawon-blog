// 本地调试 functions/api/ 接口：按 Cloudflare Pages Functions 的方式调用 onRequestXxx，监听 3001 端口。
// `npm run start` 时 Docusaurus 会把 /api/* 代理到这里（见 docusaurus.config.js 中的 devApiProxy）。
// 用法：npm run dev:api   （环境变量从项目根目录的 .env.local 读取）
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env.local');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
const PORT = Number(process.env.DEV_API_PORT) || 3001;

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const name = /^\/api\/([\w-]+)\/?$/.exec(url.pathname)?.[1];
  const file = name && path.join(root, 'functions', 'api', `${name}.js`);
  if (!file || !fs.existsSync(file)) {
    res.writeHead(404).end('Not found');
    return;
  }
  try {
    const mod = await import(`${pathToFileURL(file).href}?t=${fs.statSync(file).mtimeMs}`);
    const method = req.method[0] + req.method.slice(1).toLowerCase();
    const handler = mod[`onRequest${method}`] || mod.onRequest;
    if (!handler) {
      res.writeHead(405).end('Method not allowed');
      return;
    }
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
    });
    const response = await handler({ request, env: process.env, params: {}, waitUntil: () => {} });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    console.error(e);
    res.writeHead(500).end(String(e));
  }
}).listen(PORT, () => {
  console.log(`dev api listening on http://localhost:${PORT}`);
  if (!process.env.STRIPE_SECRET_KEY) console.warn('⚠ STRIPE_SECRET_KEY 未设置，请在 .env.local 中填写');
});

import fs from 'node:fs';
import path from 'node:path';

export function serveBlogBuild(root, pathname, response) {
  const base = path.resolve(root, 'build');
  const target = path.resolve(base, `.${decodeURIComponent(pathname)}`);
  if (target !== base && !target.startsWith(base + path.sep)) return false;
  const file = [target, path.join(target, 'index.html'), `${target}.html`].find(f => fs.existsSync(f) && fs.statSync(f).isFile());
  if (!file) return false;
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
  response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  response.end(fs.readFileSync(file));
  return true;
}

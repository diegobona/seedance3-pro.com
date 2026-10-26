import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, resolve, sep } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
createServer(async (request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname); } catch { response.writeHead(400).end(); return; }
  if (pathname.startsWith('/api/')) { response.writeHead(404).end(); return; }
  if (pathname.endsWith('/')) pathname += 'index.html';
  else if (!extname(pathname)) pathname += '.html';
  const target = resolve(root, '.' + pathname);
  if (!target.startsWith(root.endsWith(sep) ? root : root + sep) || !types[extname(target)]) { response.writeHead(404).end(); return; }
  try {
    const body = await readFile(target);
    response.writeHead(200, { 'content-type': types[extname(target)], 'cache-control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch { response.writeHead(404).end(); }
}).listen(5357, '127.0.0.1', () => console.log('Static trust-page preview: http://127.0.0.1:5357'));

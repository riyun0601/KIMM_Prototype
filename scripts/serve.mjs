import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const apps = new Set(['cad', 'cam', 'flow', 'structure', 'sys']);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.pdf': 'application/pdf', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
try {
  await access(path.join(root, 'index.html'));
} catch {
  console.error('먼저 node scripts/build-all.mjs 또는 node scripts/build-all.mjs --local 을 실행하세요.');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  const fail = (status, message) => { res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(message); };
  if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); return fail(405, 'Method not allowed'); }
  try {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { return fail(400, 'Invalid URL'); }
    if (pathname.includes('\\') || pathname.includes('\0')) return fail(400, 'Invalid path');
    const segments = pathname.split('/').filter(Boolean);
    if (segments.some(segment => segment.startsWith('.') || segment.includes(':'))) return fail(404, 'Not found');
    let file = path.resolve(root, `.${pathname}`);
    const relative = path.relative(root, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) return fail(403, 'Forbidden');
    let info = await stat(file).catch(() => null);
    if (info?.isDirectory()) {
      if (!pathname.endsWith('/')) {
        const url = new URL(req.url, 'http://localhost');
        res.writeHead(301, { Location: `${url.pathname}/${url.search}` });
        return res.end();
      }
      file = path.join(file, 'index.html');
      info = await stat(file).catch(() => null);
    }
    // Match the per-app Netlify rewrites without serving HTML for missing assets.
    if (!info && apps.has(segments[0]) && !path.extname(pathname)) {
      file = path.join(root, segments[0], 'index.html');
      info = await stat(file).catch(() => null);
    }
    if (!info?.isFile()) return fail(404, 'Not found');
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Accept-Ranges', 'bytes');
    if (path.extname(file) === '.pdf') res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(path.basename(file))}`);
    let start = 0, end = info.size - 1;
    if (req.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!range || (!range[1] && !range[2])) { res.setHeader('Content-Range', `bytes */${info.size}`); return fail(416, 'Invalid range'); }
      start = range[1] ? Number(range[1]) : Math.max(0, info.size - Number(range[2]));
      end = range[1] && range[2] ? Math.min(Number(range[2]), end) : end;
      if (start > end || start >= info.size) { res.setHeader('Content-Range', `bytes */${info.size}`); return fail(416, 'Invalid range'); }
      res.statusCode = 206;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${info.size}`);
    }
    res.setHeader('Content-Length', Math.max(0, end - start + 1));
    if (req.method === 'HEAD' || !info.size) return res.end();
    const stream = createReadStream(file, { start, end });
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) fail(500, 'Server error');
    else res.destroy();
  }
});
server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log(`KIMM Cyber Lab: http://127.0.0.1:${server.address().port}/`));

import http from 'node:http';
import { createGzip } from 'node:zlib';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../' + (process.env.PREVIEW_DIR || 'preview'),
);
const port = Number(process.env.PORT || 3000);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json',
  '.gif': 'image/gif',
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://localhost:${port}`);
      const target = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (target !== root && !target.startsWith(root + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      let file = target;
      let info;
      try {
        info = await stat(file);
      } catch (error) {
        if (process.env.SPA_FALLBACK !== '1') throw error;
        file = path.join(root, 'index.html');
        info = await stat(file);
      }
      if (info.isDirectory()) {
        file = path.join(file, 'index.html');
        info = await stat(file);
      }
      if (!info.isFile()) throw new Error('Not a file');
      const compress =
        /gzip/.test(req.headers['accept-encoding'] || '') &&
        ['.html', '.js', '.css', '.json', '.svg', '.xml', '.txt'].includes(path.extname(file));
      res.writeHead(200, {
        ...(compress ? { 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' } : {}),
        'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      const stream = createReadStream(file).on('error', () => res.destroy());
      if (compress) stream.pipe(createGzip()).pipe(res);
      else stream.pipe(res);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    }
  })
  .listen(port, '127.0.0.1', () =>
    console.log(`APEX Studio preview: http://localhost:${port}/pl/`),
  );

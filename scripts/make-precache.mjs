import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/web/out');
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)],
      ),
    )
  ).flat();
}
const list = (await files(root))
  .map((f) => '/' + path.relative(root, f).split(path.sep).join('/'))
  .filter((f) => !f.endsWith('.txt') && !['/sw.js', '/precache.json'].includes(f));
const urls = list
  .map((f) => (f.endsWith('/index.html') ? f.slice(0, -10) : f === '/index.html' ? '/' : f))
  .map((url) => (process.env.NEXT_PUBLIC_BASE_PATH || '') + url)
  .map((url) => encodeURI(url));
await writeFile(path.join(root, 'precache.json'), JSON.stringify(urls));
const fingerprint = createHash('sha256').update(JSON.stringify(urls));
for (const file of list) fingerprint.update(await readFile(path.join(root, file.slice(1))));
const digest = fingerprint.digest('hex').slice(0, 12);
const sw = await readFile(path.resolve(root, '../public/sw.js'), 'utf8');
await writeFile(path.join(root, 'sw.js'), sw.replaceAll('__BUILD_ID__', digest));
console.log(`PWA precache: ${urls.length} resources`);

import { cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const [source, target] of [
  ['apps/web/out', 'preview'],
  ['apps/admin/dist/browser', 'preview-admin'],
]) {
  await rm(path.join(root, target), { recursive: true, force: true });
  await cp(path.join(root, source), path.join(root, target), { recursive: true });
}
console.log('Web and admin previews copied.');

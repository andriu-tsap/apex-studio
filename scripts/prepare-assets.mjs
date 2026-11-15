import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(path.join(root, 'apps/web/public'), { recursive: true });
await copyFile(
  path.join(root, 'apps/widget/src/widget.js'),
  path.join(root, 'apps/web/public/widget.js'),
);

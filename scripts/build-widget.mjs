import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/widget');
await mkdir(path.join(root, 'dist'), { recursive: true });
await copyFile(path.join(root, 'src/widget.js'), path.join(root, 'dist/widget.js'));

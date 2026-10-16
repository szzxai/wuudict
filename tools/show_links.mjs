import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const h = fs.readFileSync(path.join(root, 'data/raw/wugniu_live/home.html'), 'utf8');
const ls = [...h.matchAll(/href="([^"]*)"/g)].map(m => m[1]);
console.log([...new Set(ls)].join('\n'));

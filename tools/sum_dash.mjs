import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const t = fs.readFileSync(path.join(root, 'data/raw/tok_audit.txt'), 'utf8').split('\n');
const i = t.findIndex(x => x.includes('dash'));
fs.writeFileSync(path.join(root, 'data/raw/tok_dash.txt'), t.slice(i).join('\n'), 'utf8');
console.log('written', t.length - i);

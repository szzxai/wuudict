import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const out = [];
for (const e of ent) {
  if (/[\uE000-\uF8FF\uFFFD]/.test(e.i || '')) out.push(e.w + ' | ' + e.r + ' | ' + e.i + ' | ' + JSON.stringify([...(e.i)].map(c => 'U+' + c.codePointAt(0).toString(16)).join(' ')));
}
fs.writeFileSync(path.join(root, 'data/raw/pua.txt'), out.join('\n'), 'utf8');
console.log(out.length);

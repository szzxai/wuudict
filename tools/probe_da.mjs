import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const chars = load('data/chars.js');
const ent = load('data/entries.js');
const c = chars.find(x => x.c === '搭');
console.log('搭 g labels codepoints:');
for (const [lab, idxs] of c.g) {
  console.log(' ', JSON.stringify(lab), [...lab].map(x => 'U+' + x.codePointAt(0).toString(16)).join(' '), 'n=' + idxs.length, 'first=' + idxs[0]);
}
for (const [lab, idxs] of c.g) {
  if (idxs[0] !== undefined) { const e = ent[idxs[0]]; console.log('sample', lab, '→', JSON.stringify(e).slice(0, 100)); }
}

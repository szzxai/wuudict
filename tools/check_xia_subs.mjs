import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
// 列出所有仍含「匣」的词条文本，看语境
let o = [];
for (const e of ent) {
  const s = (e.d.join('|') + '||' + e.x.join('|'));
  if (s.includes('匣')) o.push(e.w + ' ⇒ ' + s.slice(0, 150));
}
fs.writeFileSync('tools/check_xia_out.txt', o.join('\n'), 'utf8');
console.log('含匣词条文本数:', o.length);
console.log(o.slice(0, 12).join('\n'));

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const o = [];
for (const e of ent) {
  if (/^[—\u4E00\u2500\u2014]/.test(e.w)) {
    const cps = [...e.w].slice(0, 2).map(c => 'U+' + c.codePointAt(0).toString(16)).join(' ');
    o.push(e.w + ' | ' + cps + ' | ' + e.r);
  }
}
console.log(o.length);
console.log(o.slice(0, 15).join('\n'));
// 也统计非首位的 —
const mid = ent.filter(e => /[—]/.test(e.w.slice(1))).length;
console.log('非首位含—:', mid);
// 子 的单字词条
for (const e of ent) if (e.w === '子') console.log('子:', e.r, '|', e.i);
// chars 子 g
const chars = load('data/chars.js');
const c = chars.find(x => x.c === '子');
console.log('chars 子 g labels:', c ? JSON.stringify(c.g.map(g => g[0])) : '无');

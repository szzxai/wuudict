import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const chars = load('data/chars.js');
const o = [];
const W = s => o.push(s);

const e = ent[1520];
W('BEFORE: ' + JSON.stringify(e).slice(0, 300));
// 1) 词条名：匣→也
e.w = '东山老虎吃人，西山老虎也要吃人';
// 2) 拼音清理：去掉逗号后的杂散 "2"
e.r = 'ton1 se1 lau1 hou3 chiq7 gnin2, si1 se1 lau1 ghou3 ghaeq8 iau5 chiq7 gnin2';
// 3) 音标：按对照表音系逐音节生成（调值取本字调 ct：1:55 2:223 3:51 5:523 6:31 7:43 8:23）
//   ton1→tʰoŋ55  se1→sᴇ55  lau1→læ55  hou3→həu51  chiq7→tɕʰiəʔ43  gnin2→ȵin223
//   si1→sɿ55  ghou3→ɦəu51  ghaeq8→ɦaʔ23  iau5→iæ523
e.i = 'tʰoŋ55 sᴇ55 læ55 həu51 tɕʰiəʔ43 ȵin223, sɿ55 sᴇ55 læ55 ɦəu51 ɦaʔ23 iæ523 tɕʰiəʔ43 ȵin223';
W('AFTER:  ' + JSON.stringify(e).slice(0, 300));

// 4) 字头迁移：匣 ← 除 1520；也 ← 挂 1520
const xia = chars.find(c => c.c === '匣');
const ye = chars.find(c => c.c === '也');
for (const g of xia.g) {
  const k = g[1].indexOf(1520);
  if (k >= 0) { g[1].splice(k, 1); W('匣组移除 1520'); }
}
if (!ye.g.length) ye.g = [['ghaeq8', []]];
ye.g[0][1].push(1520);
W('匣 g=' + JSON.stringify(xia.g[0][1].map(i => ent[i].w)));
W('也 g=' + JSON.stringify(ye.g[0][1].map(i => ent[i].w)));

fs.writeFileSync(path.join(root, 'data/entries.js'), 'window.WUU_ENTRIES=' + JSON.stringify(ent) + ';');
fs.writeFileSync(path.join(root, 'data/chars.js'), 'window.WUU_CHARS=' + JSON.stringify(chars) + ';');
fs.writeFileSync(path.join(root, 'tools/fix_proverb_report.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

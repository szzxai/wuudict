import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const o = [];
const W = s => o.push(s);
// 名词组合（匣子义），不改
const NOUN = /(?:(拜|骨灰|书|箱|镜|笔|弹|火|妆|梳妆|提|藤|皮|木|钱|信|烟|茶|药|文|印)匣)(?!要|会|勿|㬟|呒|蛮|有|是|算|曉|晓得)/g;
let n = 0;
for (const e of ent) {
  const fix = s => {
    let r = s.replace(/匣(要|会|勿|㬟|呒不|呒|蛮|有|是|算|曉得|晓得|寻勿到|听勿懂)/g, '也$1');
    return r;
  };
  const b = e.d.join('') + e.x.join('');
  e.d = e.d.map(fix); e.x = e.x.map(fix);
  if (b !== e.d.join('') + e.x.join('')) n++;
}
W('副词匣→也(全局)修正词条: ' + n);
// 复查残留
let left = 0;
for (const e of ent) {
  const s = (e.d.join('|') + '||' + e.x.join('|'));
  if (/匣(要|会|勿|㬟|呒|蛮|有|是|算)/.test(s)) { left++; if (left <= 8) W('残留: ' + e.w + ' ⇒ ' + s.slice(0, 90)); }
}
W('残留副词匣: ' + left);
fs.writeFileSync(path.join(root, 'data/entries.js'), 'window.WUU_ENTRIES=' + JSON.stringify(ent) + ';');
fs.writeFileSync(path.join(root, 'tools/fix_xia_global_report.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

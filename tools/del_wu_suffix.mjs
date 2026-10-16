import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const chars = load('data/chars.js');
const o = [];
const W = s => o.push(s);
// 删除词条 4766（后缀五）
const e = ent[4766];
W('删除: ' + e.w + ' | ' + e.r + ' | ' + e.d[0]);
ent.splice(4766, 1);
// 全局索引重建：受影响的是 4767 之后的所有引用（含所有字头 g 组）
const shift = i => (i > 4766 ? i - 1 : i);
for (const c of chars) {
  for (const g of c.g) {
    const seen = new Set();
    g[1] = g[1].map(shift).filter(i => {
      // 去重 + 校验词条确实含该字
      if (seen.has(i) || i < 0 || i >= ent.length || !ent[i].w.includes(c.c)) return false;
      seen.add(i);
      return true;
    });
  }
  if (c.g.some(g => g[1].length === 0)) c.g = c.g.filter(g => g[1].length > 0);
}
W('全局索引 -1 重建完成，词条总数: ' + ent.length);
// 校验
let bad = 0;
for (const c of chars) for (const [lab, idxs] of c.g) for (const i of idxs) if (i < 0 || i >= ent.length || !ent[i].w.includes(c.c)) bad++;
W('校验异常: ' + bad);
// 五字头重挂
const wu = chars.find(c => c.c === '五');
W('五 g: ' + JSON.stringify(wu.g.map(g => [g[0], g[1].length])));
fs.writeFileSync(path.join(root, 'data/entries.js'), 'window.WUU_ENTRIES=' + JSON.stringify(ent) + ';');
fs.writeFileSync(path.join(root, 'data/chars.js'), 'window.WUU_CHARS=' + JSON.stringify(chars) + ';');
fs.writeFileSync(path.join(root, 'tools/del_wu_report.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

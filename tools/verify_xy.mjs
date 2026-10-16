import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const chars = load('data/chars.js');
const o = [];
const W = s => o.push(s);
for (const ch of ['也', '匣', '五']) {
  const c = chars.find(x => x.c === ch);
  W('char ' + ch + ' r=' + c.r + ' ipa=' + c.ipa + ' d=' + JSON.stringify(c.d) + ' g=' + JSON.stringify(c.g.map(g => [g[0], g[1].length])) + ' x=' + c.x.length + '条');
}
for (const w of ['也', '连…也', '拜匣', '骨灰匣']) {
  const e = ent.find(x => x.w === w);
  W((e ? '✓ ' : '✗ ') + w + (e ? ' | ' + e.r + ' | ' + e.i.slice(0, 34) : ' 未找到'));
}
let l = 0;
for (const e of ent) if (/匣(要|会|勿|呒|蛮|有|是|算|㬟)/.test(e.d.join('') + e.x.join(''))) l++;
W('残留副词匣: ' + l);
let bad = 0;
for (const c of chars) for (const [lab, idxs] of c.g) for (const i of idxs) if (i < 0 || i >= ent.length || !ent[i].w.includes(c.c)) bad++;
W('索引异常: ' + bad);
// 拜匣等名词义例句是否完好
const bx = ent.find(e => e.w === '拜匣');
W('拜匣 d=' + JSON.stringify(bx.d));
fs.writeFileSync(path.join(root, 'tools/verify_xy_out.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

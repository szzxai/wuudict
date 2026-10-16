import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const chars = load('data/chars.js');
const o = [];
const W = s => o.push(s);
// 仍缺音标的词条
for (let i = 0; i < ent.length; i++) {
  if (!(ent[i].i || '').trim()) W(i + ' ' + ent[i].w + ' | r=' + ent[i].r + ' | ct=' + JSON.stringify(ent[i].ct));
}
W('---');
// 缺 r 的字头数
const noR = chars.filter(c => !(c.r || '').trim());
W('缺r字头: ' + noR.length + ' → ' + noR.slice(0, 25).map(c => c.c).join(','));
// 有r但ipa空的
const noIpa = chars.filter(c => (c.r || '').trim() && !(c.ipa || '').trim());
W('有r缺ipa字头: ' + noIpa.length);
for (const c of noIpa) W('  ' + c.c + ' r=' + c.r + ' g=' + JSON.stringify(c.g.map(g => [g[0], g[1].length])));
fs.writeFileSync(path.join(root, 'tools/missing2_out.txt'), o.join('\n'), 'utf8');
console.log(o.slice(0, 40).join('\n'));
console.log('总行数: ' + o.length);

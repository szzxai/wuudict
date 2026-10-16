import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const chars = load('data/chars.js');
const o = [];
const W = s => o.push(s);
const wu = chars.find(c => c.c === '五');
// 重新精确分组
const gNg = [], gOu = [];
for (const i of [...wu.g[0][1], ...wu.g[1][1]]) {
  const e = ent[i];
  if (!e) { W('越界' + i); continue; }
  if (e.r.split(/\s+/)[0].startsWith('ou')) gOu.push(i); else gNg.push(i);
}
W('ng6=' + gNg.length + ' ou3=' + gOu.length);
W('ou3: ' + gOu.map(i => ent[i].w + '(' + ent[i].r.split(' ')[0] + ')').join(', '));
wu.g = [['ng6', gNg], ['ou3', gOu]];
fs.writeFileSync(path.join(root, 'data/chars.js'), 'window.WUU_CHARS=' + JSON.stringify(chars) + ';');
fs.writeFileSync(path.join(root, 'tools/fix_wu3_report.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

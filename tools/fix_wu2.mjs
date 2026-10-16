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
// 分类：r 以 ng 开头 → ng6；以 ou 开头 → ou3
const gNg = [], gOu = [];
for (const i of wu.g[0][1]) {
  const e = ent[i];
  if (!e) { W('越界' + i); continue; }
  if (e.r.startsWith('ou')) gOu.push(i); else gNg.push(i);
}
W('ng6: ' + gNg.length + ' 条; ou3: ' + gOu.length + ' 条');
W('ou3 组: ' + gOu.map(i => ent[i].w + '(' + ent[i].r.split(' ')[0] + ')').join(', '));
wu.g = [['ng6', gNg], ['ou3', gOu]];
wu.r = 'ng6';
wu.ipa = 'ŋ̍31';
// 字头读音标签调号修正：ng2 组标签全部改 ng6
W('五 r=' + wu.r + ' ipa=' + wu.ipa);
fs.writeFileSync(path.join(root, 'data/chars.js'), 'window.WUU_CHARS=' + JSON.stringify(chars) + ';');
fs.writeFileSync(path.join(root, 'tools/fix_wu2_report.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

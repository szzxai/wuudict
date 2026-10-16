import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const chars = load('data/chars.js');
const o = [];
const W = s => o.push(s);
const missing = [];
for (let i = 0; i < ent.length; i++) {
  if (!(ent[i].i || '').trim()) missing.push(i);
}
W('缺音标词条: ' + missing.length);
for (const i of missing) {
  const e = ent[i];
  W(i + ' ' + e.w + ' | r=' + e.r + ' | ct=' + JSON.stringify(e.ct) + ' | m=' + e.m);
}
// 字头缺音标
const cmiss = chars.filter(c => !(c.ipa || '').trim() && c.r);
W('');
W('缺音标字头(有拼音): ' + cmiss.length);
for (const c of cmiss) W('  ' + c.c + ' r=' + c.r);
fs.writeFileSync(path.join(root, 'tools/noipa_list.txt'), o.join('\n'), 'utf8');
console.log('词条缺音标: ' + missing.length + ' | 字头缺音标: ' + cmiss.length);

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const chars = load('data/chars.js');
const o = [];
const W = s => o.push(s);
// 目标字头
for (const ch of ['骲', '𠼢', '五', '儿']) {
  const c = chars.find(x => x.c === ch);
  if (!c) { W(ch + ' 字头不存在'); continue; }
  W('char ' + ch + ' | r=' + c.r + ' | ipa=' + c.ipa);
  for (const [lab, idxs] of c.g) W('   g[' + lab + '] n=' + idxs.length + ' idx=' + idxs.slice(0, 25).join(','));
  W('   d=' + JSON.stringify(c.d));
  W('   x=' + JSON.stringify(c.x).slice(0, 200));
}
W('');
// 含五词条
const wu = ent.filter(e => e.w.includes('五'));
W('含五词条: ' + wu.length);
for (const e of wu) W('  ' + e.w + ' | ' + e.r + ' | ' + e.i.slice(0, 44));
W('');
// 含儿词条
const er = ent.filter(e => e.w.includes('儿'));
W('含儿词条: ' + er.length);
for (const e of er) W('  ' + e.w + ' | ' + e.r + ' | ' + e.i.slice(0, 44));
// 骲词条
W('');
for (const w of ['骲', '𠼢']) {
  const es = ent.filter(e => e.w.includes(w));
  W('含' + w + '词条: ' + es.length);
  es.forEach(e => W('  ' + e.w + ' | ' + e.r + ' | ' + e.i.slice(0, 44)));
}
fs.writeFileSync(path.join(root, 'tools/probe_ng_out.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

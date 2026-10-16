import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const chars = load('data/chars.js');
const o = [];
const W = s => o.push(s);
for (const w of ['匣', '连…匣', '也']) {
  ent.forEach((e, i) => { if (e.w === w) W(i + ' ' + JSON.stringify(e).slice(0, 250)); });
}
W('');
for (const ch of ['匣', '也']) {
  const c = chars.find(x => x.c === ch);
  if (c) {
    W('char ' + ch + ' r=' + c.r + ' ipa=' + c.ipa + ' d=' + JSON.stringify(c.d).slice(0, 160) + ' x=' + JSON.stringify(c.x).slice(0, 120));
    c.g.forEach(([lab, idxs]) => W('  [' + lab + '] n=' + idxs.length + ' 首6: ' + idxs.slice(0, 6).map(i => ent[i] ? ent[i].w : '?').join('/')));
  } else W('char ' + ch + ' 不存在');
}
const wu = chars.find(c => c.c === '五');
W('五 d=' + JSON.stringify(wu.d) + ' x=' + JSON.stringify(wu.x).slice(0, 200));
// 含匣词条
const hx = ent.filter(e => e.w.includes('匣'));
W('含匣词条: ' + hx.map(e => e.w + '|' + e.r).join('  '));
fs.writeFileSync(path.join(root, 'tools/probe_xia_out.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

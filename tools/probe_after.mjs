import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const chars = load('data/chars.js');
const o = [];
const W = s => o.push(s);
for (const w of ['骲', '𠼢', '筷儿', '筷五', '干儿子']) {
  ent.forEach((e, i) => { if (e.w === w || e.w.includes(w)) W(i + ' ' + JSON.stringify(e).slice(0, 170)); });
}
W('');
for (const ch of ['骲', '𠼢', '儿', '五']) {
  const c = chars.find(x => x.c === ch);
  if (c) {
    W('char ' + ch + ' r=' + c.r + ' ipa=' + c.ipa);
    c.g.forEach(([lab, idxs]) => {
      W('  [' + lab + '] n=' + idxs.length);
      idxs.slice(0, 6).forEach(i => W('    ' + i + ' ' + (ent[i] ? ent[i].w : '越界!')));
    });
    W('  d=' + JSON.stringify(c.d).slice(0, 100));
  } else W('char ' + ch + ' 不存在');
}
fs.writeFileSync(path.join(root, 'tools/probe_after_out.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

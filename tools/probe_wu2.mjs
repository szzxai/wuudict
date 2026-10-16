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
W('五 r=' + wu.r + ' ipa=' + wu.ipa + ' d=' + JSON.stringify(wu.d));
wu.g.forEach(([lab, idxs]) => {
  W('[' + lab + '] n=' + idxs.length);
  idxs.forEach(i => { const e = ent[i]; W('   ' + i + ' ' + e.w + ' | ' + e.r + ' | ' + e.i.slice(0, 40)); });
});
fs.writeFileSync(path.join(root, 'tools/probe_wu2_out.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

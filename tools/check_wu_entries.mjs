import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const o = [];
const W = s => o.push(s);
ent.forEach((e, i) => {
  if (e.w === '五') W(i + ' | r=' + e.r + ' | ipa=' + e.i + ' | d=' + JSON.stringify(e.d) + ' | x=' + JSON.stringify(e.x).slice(0, 80));
});
fs.writeFileSync(path.join(root, 'tools/wu_entries_out.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

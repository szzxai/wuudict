import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const chars = load('data/chars.js');
const o = [];
const W = s => o.push(s);
for (const w of ['干儿子', '碗店', '干', '碗', '儿', '店']) {
  if (w.length === 1) {
    const c = chars.find(x => x.c === w);
    if (c) W('char ' + c.c + ' | r=' + c.r + ' | ipa=' + c.ipa + ' | g=' + JSON.stringify(c.g.map(g => g[0])));
    const es = ent.filter(e => e.w === w);
    es.forEach(e => W('entry ' + e.w + ' | ' + e.r + ' | ' + e.i));
  } else {
    const es = ent.filter(e => e.w === w);
    if (!es.length) W(w + ': 未找到');
    es.forEach(e => W('entry ' + e.w + ' | ' + e.r + ' | ' + e.i + ' | ct=' + JSON.stringify(e.ct)));
  }
}
fs.writeFileSync(path.join(root, 'tools/probe_fixwords_out.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

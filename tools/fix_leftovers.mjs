import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
// 查看残留词条的原文
for (const w of ['四四十六，二八十六', '还算', '花纽头', '下颏肉', '捏']) {
  const hits = ent.filter(e => e.w === w);
  for (const e of hits) console.log(e.w, '|', e.r, '|', JSON.stringify(e.i));
}
// chars 同查
const chars = load('data/chars.js');
for (const ch of ['纽', '颏', '捏']) {
  const c = chars.find(x => x.c === ch);
  if (c) console.log('char', c.c, '|', c.r, '|', JSON.stringify(c.ipa));
}

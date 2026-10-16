import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const o = [];
const W = s => o.push(s);
const fixes = {
  '马桶呒不边──难掇': 'mo31-223 doŋ31-33 m̩223 pəʔ43-55 pi55 — ȵᴇ223-33 təʔ23',
  '呒本钿生意': 'm̩223 pən51 di223-33 sã55 iᶽ523',
  '西南风呒不家主婆': 'siᶽ55 nø223-55 foŋ55 m̩223 pəʔ43-55 kɑ55 tsʮ51-33 bu223-21',
  '一百五': 'iəʔ43-55 pɑʔ43-55 ŋ̍231-21',
};
for (const [w, ipa] of Object.entries(fixes)) {
  const e = ent.find(x => x.w === w);
  if (!e) { W('✗ 未找到: ' + w); continue; }
  W('✓ ' + w + '\n   旧: ' + e.i + '\n   新: ' + ipa);
  e.i = ipa;
}
fs.writeFileSync(path.join(root, 'data/entries.js'), 'window.WUU_ENTRIES=' + JSON.stringify(ent) + ';');
fs.writeFileSync(path.join(root, 'tools/fix_4_ipa_report.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

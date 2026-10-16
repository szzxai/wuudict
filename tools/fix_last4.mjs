import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const chars = load('data/chars.js');
const o = [];
const W = s => o.push(s);

// 对照表音系 + 语料既有调值
// m2 = m̩223(呒 白读"没"); "─"是例句破折号(歇后语停顿), ne2 teq7 = 难掇
const fixes = {
  '马桶呒不边──难掇': 'mo6 don6 m̩223 pəʔ43-55 piɪ55 — ȵɪ223-33 dəʔ23',
  // 呒本钿生意: 呒 m̩223 本 pən51 钿 di223-33 生 sã55 意 i523
  '呒本钿生意': 'm̩223 pən51 di223-33 sã55 i523',
  // 西南风呒不家主婆: 西 sɿ55 南 nø223 风 foŋ55 呒 m̩223 不 pəʔ43-55 家 kɑ55 主 tsʮ51 婆 bu223-33
  '西南风呒不家主婆': 'sɿ55 nø223-55 foŋ55 m̩223 pəʔ43-55 kɑ55 tsʮ51-33 bu223-21',
  // 一百五: 一 iəʔ43 百 pɑʔ43-2 五 ŋ̍223(后缀白读, 与 ng2 同音; 语料五调值 223)
  '一百五': 'iəʔ43 pɑʔ43-2 ŋ̍223',
};
for (const [w, ipa] of Object.entries(fixes)) {
  const e = ent.find(x => x.w === w);
  if (!e) { W('✗ 未找到 ' + w); continue; }
  W('✓ ' + w + ' | ' + e.r + ' → ' + ipa);
  e.i = ipa;
}
// 掮字头：修 r（jie2），ipa 按其词条
const q = chars.find(c => c.c === '掮');
const qe = ent.find(e => e.w.startsWith('掮'));
if (q) {
  q.r = 'jie2';
  q.ipa = qe ? '/' + qe.i.split(/\s+/)[0] + '/' : '/dʑɪ223/';
  W('✓ 字头 掮 r=' + q.r + ' ipa=' + q.ipa + ' （词条: ' + (qe ? qe.w : '无') + '）');
}
// 终验：全库无缺音标词条
const left = ent.filter(e => !(e.i || '').trim()).length;
W('剩余缺音标词条: ' + left);
fs.writeFileSync(path.join(root, 'data/entries.js'), 'window.WUU_ENTRIES=' + JSON.stringify(ent) + ';');
fs.writeFileSync(path.join(root, 'data/chars.js'), 'window.WUU_CHARS=' + JSON.stringify(chars) + ';');
fs.writeFileSync(path.join(root, 'tools/fix_last4_report.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

// 依《苏州方言词典》声韵调对照表重新标注音标（声调一律不变）
//  j(dʑ/ʥ/ʣ) → [dz]      gn(ȵ) → [ɲ]
//  e(ᴇ) → [ɛ]            ue(uᴇ) → [uɛ]
//  ie(iɪ) → [ɪ]
//  eu(ʏ) → [øʏ]          ieu(iʏ) → [ʏ]
//  iun(yən) → [yn]
//  成音节鼻音 ŋ̍/ŋ̩/m̩/n̩ → [ŋ]/[m]/[n]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function applySubs(s) {
  return String(s || '')
    .replace(/iʏ|ʏ/g, m => (m[0] === 'i' ? 'ʏ' : 'øʏ'))
    .replace(/iɪ/g, 'ɪ')
    .replace(/dʑ/g, 'dz')
    .replace(/ʥ/g, 'dz')
    .replace(/ʣ/g, 'dz')
    .replace(/ȵ/g, 'ɲ')
    .replace(/uᴇ/g, 'uɛ')
    .replace(/ᴇ/g, 'ɛ')
    .replace(/yən/g, 'yn')
    .replace(/ŋ̍|ŋ̩/g, 'ŋ')
    .replace(/m̩/g, 'm')
    .replace(/n̩/g, 'n');
}
function toneSeq(s) {
  return (String(s || '').match(/\d+(?:-\d+)*/g) || []).join(',');
}

const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const chars = load('data/chars.js');

const report = [];
let nEnt = 0, nChar = 0, toneViol = 0, before = { dz: 0, ȵ: 0, iɪ: 0, ʏ: 0, iʏ: 0, ᴇ: 0, yən: 0, syl: 0 }, after = { dz: 0, ɲ: 0, ɪ: 0, øʏ: 0, ʏ: 0, ɛ: 0, yn: 0, plain: 0 };
for (const e of ent) {
  const oldI = e.i || '';
  if (!oldI.trim()) continue;
  const newI = applySubs(oldI);
  if (newI !== oldI) {
    nEnt++;
    for (const sym of ['dʑ', 'ʥ', 'ʣ', 'iɪ', 'iʏ', 'ᴇ', 'yən', 'ŋ̍', 'ŋ̩', 'm̩', 'n̩', 'ʏ']) if (oldI.includes(sym)) before[sym === 'ʏ' ? 'ʏ' : sym]++;
    for (const sym of ['dz', 'ɲ', 'ɪ', 'øʏ', 'ʏ', 'ɛ', 'yn']) if (newI.includes(sym)) after[sym]++;
    if (toneSeq(oldI) !== toneSeq(newI)) {
      toneViol++;
      report.push('!! 调值变动: ' + e.w + ' | ' + oldI + ' → ' + newI);
    }
    e.i = newI;
  }
}
for (const c of chars) {
  const oldI = c.ipa || '';
  if (!oldI.trim()) continue;
  const newI = applySubs(oldI);
  if (newI !== oldI) { nChar++; if (toneSeq(oldI) !== toneSeq(newI)) toneViol++; c.ipa = newI; }
}

report.unshift(`词条音标改动: ${nEnt}  字头音标改动: ${nChar}  调值变动: ${toneViol}（必须为 0）`);
fs.writeFileSync(path.join(root, 'data/entries.js'), 'window.WUU_ENTRIES=' + JSON.stringify(ent) + ';');
fs.writeFileSync(path.join(root, 'data/chars.js'), 'window.WUU_CHARS=' + JSON.stringify(chars) + ';');
report.push('');
report.push('== 校样 ==');
for (const w of ['拖鞋皮', '滋味', '纸头店', '旗袍', '旗袍裙', '私盐', '眉毛云', '滋五十六', '紫菜', '糍饭', '纸头', '猪油', '皮球', '越剧', '小书']) {
  const e = ent.find(x => x.w === w);
  if (e) report.push('  ' + e.w + ' | ' + e.r + ' | ' + e.i);
}
fs.writeFileSync(path.join(root, 'tools/reipa_report.txt'), report.join('\n'), 'utf8');
console.log(report.join('\n'));

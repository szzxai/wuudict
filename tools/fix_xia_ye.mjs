import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const chars = load('data/chars.js');
const o = [];
const W = s => o.push(s);

// 1) 词条改名：匣(副词)→也；连…匣→连…也
const rename = new Set(['匣', '连…匣']);
for (const e of ent) {
  if (e.w === '匣') { e.w = '也'; W('匣→也 | ' + e.r + ' | ' + e.i); }
  else if (e.w === '连…匣') { e.w = '连…也'; W('连…匣→连…也 | ' + e.r); }
}
// 例句/释义里的 ～ 指代词条名，保留；若明写「匣」指副词的，改成「也」
let nx = 0;
for (const e of ent) {
  if (rename.has(e.w) || e.w === '也' || e.w === '连…也') continue;
  const s = JSON.stringify(e.d) + JSON.stringify(e.x);
  if (s.includes('匣')) {
    const before = e.d.join('') + e.x.join('');
    e.d = e.d.map(x => x.replace(/匣/g, '匣')); // 名词义保留
    // 仅当上下文含「连…匣」或「匣要/匣会/匣勿」等副词用法时改
    e.x = e.x.map(x => x.replace(/匣(要|会|勿|㬟|算勿清|是)/g, '也$1'));
    e.d = e.d.map(x => x.replace(/匣(要|会|勿|㬟)/g, '也$1'));
    if (before !== e.d.join('') + e.x.join('')) nx++;
  }
}
W('其他词条副词用法匣→也: ' + nx + ' 条');

// 2) 字头：也（新建，挂 ghaeq8——同音借字，读音按原匣）
let ye = chars.find(c => c.c === '也');
if (!ye) {
  ye = { c: '也', r: 'ghaeq8', ipa: 'ɦaʔ23', d: ['副詞，也'], x: [], g: [] };
  chars.push(ye);
  W('新建字头 也 r=ghaeq8 ipa=ɦaʔ23');
}
// 3) 匣字头：删副词释义，保留名词义（匣子）
const xia = chars.find(c => c.c === '匣');
xia.d = ['匣子'];
xia.x = [];
// 重新挂载：也 ← [也, 连…也]；匣 ← [拜匣, 东山老虎…, 骨灰匣]
const idxOf = w => ent.findIndex(e => e.w === w);
ye.g = [['ghaeq8', ['也', '连…也'].map(idxOf).filter(i => i >= 0)]];
xia.g = [['ghaeq8', ['拜匣', '东山老虎吃人，西山老虎匣要吃人', '骨灰匣'].map(idxOf).filter(i => i >= 0)]];
W('也 g: ' + JSON.stringify(ye.g[0][1].map(i => ent[i].w)));
W('匣 g: ' + JSON.stringify(xia.g[0][1].map(i => ent[i].w)));
// 例句里的 ～ 现在指「也」词条
ye.x = ['黄鼠狼躲勒鸡棚浪──勿偷～是偷', '倷去吾～去', '搿笔胡涂账，天王老子～算勿清葛'];
W('也 x=' + JSON.stringify(ye.x).slice(0, 120));

// 4) 「五」字头：删除词缀释义（保留数目义）
const wu = chars.find(c => c.c === '五');
W('五 before d=' + JSON.stringify(wu.d));
wu.d = ['數目'];
wu.x = [];
W('五 after d=' + JSON.stringify(wu.d) + ' x=[]');

fs.writeFileSync(path.join(root, 'data/entries.js'), 'window.WUU_ENTRIES=' + JSON.stringify(ent) + ';');
fs.writeFileSync(path.join(root, 'data/chars.js'), 'window.WUU_CHARS=' + JSON.stringify(chars) + ';');
fs.writeFileSync(path.join(root, 'tools/fix_xia_ye_report.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

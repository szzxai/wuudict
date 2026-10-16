import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')
  .replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const dj = JSON.parse(fs.readFileSync(path.join(root, 'data/dict.json'), 'utf8'));
const ent = load('data/entries.js');
const chars = load('data/chars.js');

for (const w of ['疻水', '水', '拖鞋', '拖鞋皮', '皮', '鞋袜钿', '葛', '脱鞋子', '五', '鱼', '滋五十六', '马桶呒不边──难掇']) {
  const d = dj.filter(x => x.word === w);
  const e = ent.filter(x => x.w === w);
  console.log('【' + w + '】dj:', JSON.stringify(d).slice(0, 300));
  console.log('        ent:', JSON.stringify(e).slice(0, 300));
}

// 单字：r 数字 vs ipa 首值 冲突统计
const VAL2DIG = { 55: 1, 44: 1, 223: 2, 13: 2, 51: 3, 523: 5, 41: 5, 31: 6, 231: 6, 43: 7, 4: 7, 5: 7, 23: 8, 3: 8, 2: 8 };
let agree = 0, conflicts = [];
for (let i = 0; i < ent.length; i++) {
  const e = ent[i];
  if (!e.r || !/\d$/.test(e.r)) continue;
  const ipa = (e.i || '').trim();
  if (!ipa) continue;
  const tok = ipa.split(/\s+/)[0];
  const m = tok.match(/^(\d+(?:-\d+)*)/);
  if (!m) continue;
  const base = parseInt(m[1].split('-')[0], 10);
  const dig = parseInt(e.r.match(/(\d)$/)[1], 10);
  if (VAL2DIG[base] === dig) agree++;
  else conflicts.push({ i, w: e.w, r: e.r, ipa, py: dj[i].py });
}
console.log('\n单字 r数字 vs ipa首值 一致:', agree, '冲突:', conflicts.length);
conflicts.slice(0, 30).forEach(c => console.log(' ', c.w, c.r, c.ipa, '| djpy:', c.py));

// dj py 自带数字的分布
let djDig = 0, djDigMulti = 0;
for (const d of dj) {
  if (/\d/.test(d.py)) { djDig++; if (d.word.length > 1) djDigMulti++; }
}
console.log('\ndj py 含数字:', djDig, '其中多字词:', djDigMulti);
const m1 = ent.filter(e => e.m === 1);
console.log('m=1 词条:', m1.length, '其中单字:', m1.filter(e => e.w.length === 1).length);
const m1ipaBlank = m1.filter(e => !(e.i || '').trim());
console.log('m=1 且 ipa 空:', m1ipaBlank.length, m1ipaBlank.slice(0, 10).map(e => e.w).join(','));
const m1NoDig = m1.filter(e => e.r && !/\d$/.test(e.r));
console.log('m=1 且 r 无数字:', m1NoDig.length);
console.log('m=1 且 r 有数字 样例:', m1.filter(e => /\d$/.test(e.r)).slice(0, 10).map(e => e.w + ':' + e.r).join(', '));
// 单字 m=0 无数字
const m0SingleNoDig = ent.filter(e => e.w.length === 1 && e.m === 0 && e.r && !/\d$/.test(e.r));
console.log('\nm=0 单字 r 无数字:', m0SingleNoDig.length, m0SingleNoDig.slice(0, 20).map(e => e.w + ':' + e.r + ':' + e.i).join(', '));

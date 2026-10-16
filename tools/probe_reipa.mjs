import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const chars = load('data/chars.js');
const o = [];
const W = s => o.push(s);

// 1. 特征符号计数
const counts = new Map();
for (const e of ent) for (const ch of (e.i || '')) counts.set(ch, (counts.get(ch) || 0) + 1);
for (const c of chars) for (const ch of (c.ipa || '')) counts.set(ch, (counts.get(ch) || 0) + 1);
W('== 符号计数 ==');
for (const sym of ['dʑ', 'ʥ', 'ʣ', 'dz', 'ȵ', 'ɲ', 'ʑ', 'ᴇ', 'ɛ', 'iɪ', 'ɪ', 'ʏ', 'iʏ', 'øy', 'ɤ', 'yən', 'yn', 'ŋ̍', 'ŋ̩', 'm̩', 'n̩', 'ɥ', 'j']) {
  W('  ' + sym + ': ' + (counts.get(sym) || 0));
}

// 2. ʑ 的拼音声母配对
W('\n== ʑ 音节样例（py声母 ↔ IPA段） ==');
const zpairs = new Map();
for (const e of ent) {
  const pys = e.r.split(/\s+/), ips = (e.i || '').split(/\s+/);
  for (let k = 0; k < Math.min(pys.length, ips.length); k++) {
    if (!ips[k].includes('ʑ')) continue;
    const seg = ips[k].replace(/\d.*$/, '');
    const py = pys[k].replace(/[()（）]/g, '').replace(/\d+$/, '');
    const ini = py.match(/^(sh|zh|gh|tsh|ph|th|kh|ch|gn|ng|ts|b|p|m|f|v|d|t|n|l|g|k|h|j|c|x|s|z|y|w)?/)[1] || '(零)';
    const key = ini + ' ↔ ' + seg;
    if (!zpairs.has(key)) zpairs.set(key, []);
    if (zpairs.get(key).length < 3) zpairs.get(key).push(e.w + ':' + py + '/' + ips[k]);
  }
}
for (const [k, v] of zpairs) W('  ' + k + '  e.g. ' + v.join(' | '));

// 3. j/ʥ/ʣ/dʑ 样例
W('\n== dʑ/ʥ/剩余样例 ==');
const jp = new Map();
for (const e of ent) {
  const pys = e.r.split(/\s+/), ips = (e.i || '').split(/\s+/);
  for (let k = 0; k < Math.min(pys.length, ips.length); k++) {
    if (!/ʥ|ʣ|dʑ/.test(ips[k])) continue;
    const seg = ips[k].replace(/\d.*$/, '');
    const py = pys[k].replace(/[()（）]/g, '').replace(/\d+$/, '');
    const key = py.slice(0, 1) + ' ↔ ' + seg;
    if (!jp.has(key)) jp.set(key, []);
    if (jp.get(key).length < 2) jp.get(key).push(e.w);
  }
}
for (const [k, v] of jp) W('  ' + k + '  ' + v.join('|'));

// 4. ʏ/iʏ/iɪ/ᴇ/yən/ŋ̍ 样例
W('\n== 韵母样例 ==');
for (const sym of ['ʏ', 'iʏ', 'iɪ', 'ᴇ', 'yən', 'ŋ̍']) {
  const ex = [];
  for (const e of ent) {
    if (!(e.i || '').includes(sym)) continue;
    ex.push(e.w + ' ' + e.r + ' | ' + e.i);
    if (ex.length >= 4) break;
  }
  W('  [' + sym + '] ' + ex.join('  ;;  '));
}

// 5. pinyin iun/un 韵的 IPA
W('\n== iun/un/yun 韵 ==');
for (const syl of ['yun', 'ciun', 'jiun', 'iun']) {
  const ex = [];
  for (const e of ent) {
    if (!(' ' + e.r + ' ').includes(' ' + syl)) continue;
    ex.push(e.w + ' ' + e.r + ' | ' + e.i);
    if (ex.length >= 3) break;
  }
  if (ex.length) W('  ' + syl + ': ' + ex.join('  ;;  '));
}
fs.writeFileSync(path.join(root, 'data/raw/reipa_probe.txt'), o.join('\n'), 'utf8');
console.log('probe written', o.length, 'lines');

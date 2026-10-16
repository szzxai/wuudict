// 审计 entries.js / chars.js 中拼音与音标的现状
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')
  .replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const chars = load('data/chars.js');

// ---- 1. IPA 音节切分与声调 token 统计 ----
// 音节按空格切；轻声点 · 附着在前导；括号附着
const toneTok = new Map(); // token -> count
const segOnly = new Set();
let noToneSyll = 0, noToneEnt = 0;
for (const e of ent) {
  const ipa = (e.i || '').trim();
  if (!ipa) { noToneEnt++; continue; }
  for (const tok of ipa.split(/\s+/)) {
    const m = tok.match(/(\d+(?:-\d+)*)/);
    if (m) {
      const t = m[1];
      toneTok.set(t, (toneTok.get(t) || 0) + 1);
    } else {
      noToneSyll++;
      segOnly.add(tok);
    }
  }
}
console.log('== 带声调数字的 token 种类（前40） ==');
[...toneTok.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).forEach(([k, c]) => console.log(k, c));
console.log('token 种类总数:', toneTok.size);
console.log('无数字 token 总数:', noToneSyll, '样例:', [...segOnly].slice(0, 30));

// ---- 2. 缺 i 的词条 ----
const noIpa = ent.filter(e => !(e.i || '').trim());
console.log('\n== i 为空的词条数:', noIpa.length, '==');
noIpa.slice(0, 15).forEach(e => console.log(' ', e.w, '|', e.r));

// ---- 3. 单字词条声调值抽样（r 带 1/2/3/5/6/7/8） ----
console.log('\n== 单字音标抽样 ==');
for (const d of [1, 2, 3, 5, 6, 7, 8]) {
  const s = ent.filter(e => e.r && new RegExp('^[a-z]+' + d + '$').test(e.r) && (e.i || '').trim());
  console.log('调', d, 'n=' + s.length, '样例:', s.slice(0, 6).map(e => e.r + '→' + e.i).join(' | '));
}
const noDigitSingle = ent.filter(e => e.w.length === 1 && e.r && !/\d$/.test(e.r));
console.log('单字词条 r 无数字:', noDigitSingle.length, noDigitSingle.slice(0, 20).map(e => e.w + ':' + e.r).join(', '));

// ---- 4. IPA 中出现过的“非标音符号”清单 ----
const ipaChars = new Map();
for (const e of ent) for (const ch of (e.i || '')) ipaChars.set(ch, (ipaChars.get(ch) || 0) + 1);
console.log('\n== IPA 字符集（含码点） ==');
[...ipaChars.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, c]) => {
  const cp = k.codePointAt(0).toString(16);
  if (/[a-z\d\-\s·（）()\/]/.test(k)) return; // 常规略
  console.log(' ', JSON.stringify(k), 'U+' + cp, c);
});

// ---- 5. 拼音字符集 ----
const pyChars = new Map();
for (const e of ent) for (const ch of e.r) pyChars.set(ch, (pyChars.get(ch) || 0) + 1);
console.log('\n== 拼音字符集 ==');
[...pyChars.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, c]) => {
  const cp = k.codePointAt(0).toString(16);
  if (/[a-z\d',\- ]/.test(k)) return;
  console.log(' ', JSON.stringify(k), 'U+' + cp, c);
});

// ---- 6. 音节-)音标 对齐学习：声母/韵母 -> IPA ----
// 只取音节数一致且都非空的词条
const initialMap = new Map(), rhymeMap = new Map();
let alignedEnts = 0, misAlign = 0;
const misAlignList = [];
for (const e of ent) {
  const ipa = (e.i || '').trim();
  const r = e.r || '';
  if (!ipa || !r) continue;
  const pys = r.split(/[\s,，]+/).filter(Boolean).map(t => t.replace(/[()（）]/g, '').replace(/\d+$/, ''));
  const ipas = ipa.split(/\s+/).filter(t => !/^[·•]$/.test(t));
  if (pys.length !== ipas.length) { misAlign++; if (misAlignList.length < 25) misAlignList.push(e.w + ' | py:' + r + ' | ipa:' + ipa); continue; }
  alignedEnts++;
  for (let k = 0; k < pys.length; k++) {
    const py = pys[k]; let ip = ipas[k].replace(/[（）()]/g, '');
    const seg = ip.replace(/[\d·\-]/g, '');
    // 拆声母/韵母（最长声母优先）
    const INI = ['gh', 'tsh', 'ph', 'th', 'kh', 'ch', 'sh', 'gn', 'ts', 'b', 'p', 'm', 'f', 'v', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'ng', 'j', 'c', 'x', 's', 'z', 'y', 'w'];
    let ini = '', rh = py;
    for (const cand of INI) { if (py.startsWith(cand)) { ini = cand; rh = py.slice(cand.length); break; } }
    if (seg.startsWith(ini) || (ini === '' )) {
      // 检查韵母
      const segRh = seg.slice(ini ? ini.length : 0);
      if (rh) {
        const key = rh, val = segRh;
        if (!rhymeMap.has(key)) rhymeMap.set(key, new Map());
        const m2 = rhymeMap.get(key);
        m2.set(val, (m2.get(val) || 0) + 1);
      }
    }
  }
}
console.log('\n== 对齐统计 == aligned:', alignedEnts, 'misalign:', misAlign);
console.log('misalign 样例:');
misAlignList.forEach(x => console.log(' ', x));
console.log('\n== 韵母 -> IPA 值分布（主值） ==');
for (const [rh, m2] of [...rhymeMap.entries()].sort()) {
  const tot = [...m2.values()].reduce((a, b) => a + b, 0);
  const top = [...m2.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([v, c]) => v + ':' + c);
  console.log(' ', rh || '(零韵)', 'n=' + tot, top.join(' '));
}

// ---- 7. chars.js 现状 ----
let cNoDigit = 0, cNoDigitList = [];
let gNoDigit = 0, gNoDigitList = [];
for (const c of chars) {
  if (c.r && !/\d$/.test(c.r)) { cNoDigit++; if (cNoDigitList.length < 20) cNoDigitList.push(c.c + ':' + c.r); }
  for (const [lab] of c.g) { if (lab && !/\d$/.test(lab)) { gNoDigit++; if (gNoDigitList.length < 25) gNoDigitList.push(c.c + ':' + lab); } }
}
console.log('\n== chars.js == 字头 r 无数字:', cNoDigit, cNoDigitList.join(', '));
console.log('读音组标签无数字:', gNoDigit, gNoDigitList.slice(0, 25).join(', '));
console.log('chars 总数:', chars.length, '有 ipa 字段:', chars.filter(c => c.ipa).length);

// ---- 8. 词内每字读音 与 字头读音组的关系（拖鞋皮样例） ----
const idx = ent.findIndex(e => e.w === '拖鞋皮');
console.log('\n拖鞋皮 ent:', JSON.stringify(ent[idx]));
const chXie = chars.find(c => c.c === '鞋'), chPi = chars.find(c => c.c === '皮');
console.log('鞋 g:', chXie.g.map(g => g[0] + '(' + g[1].length + ')').join(' '));
console.log('皮 g 含 4322?:', chPi.g.map(g => g[0] + (g[1].includes(4322) ? '*' : '')).join(' '));

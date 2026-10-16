import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));

// —— 从 app.js 提取映射对象 ——
function grabObj(name) {
  const i = src.indexOf('const ' + name);
  let a = src.indexOf('{', i);
  // 跳过该行之前可能抓到的 'use strict' 等：确保 a 在 const 行之后
  const lineEnd = src.indexOf('\n', i);
  if (a < 0 || a > lineEnd) a = src.indexOf('{', lineEnd);
  let d = 0, j = a;
  for (; j < src.length; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}') { d--; if (d === 0) break; }
  }
  return src.slice(a, j + 1);
}
const maps = {
  PY_INITIAL_IPA: new Function('return ' + grabObj('PY_INI_IPA'))(),
  PY_RHYME_IPA: new Function('return ' + grabObj('PY_RHYME_IPA'))(),
  Y_RHY_IPA: new Function('return ' + grabObj('Y_RHY_IPA'))(),
  W_RHY_IPA: new Function('return ' + grabObj('W_RHY_IPA'))(),
};
// 音节→音标（依 app.js 同款逻辑）
const INIS = Object.keys(maps.PY_INITIAL_IPA).sort((a, b) => b.length - a.length);
function sylIpa(py) {
  let ini = '', rh = py;
  for (const k of INIS) if (py.startsWith(k)) { ini = maps.PY_INITIAL_IPA[k]; rh = py.slice(k.length); break; }
  if (ini === '') {
    if (py[0] === 'y') { const v = maps.Y_RHY_IPA[py.slice(1)]; if (v) return v; }
    if (py[0] === 'w') { const v = maps.W_RHY_IPA[py.slice(1)]; if (v) return v; }
  }
  const r = maps.PY_RHYME_IPA[rh];
  if (r === undefined) return null;
  return ini + r;
}
const TONE_VAL = { 1: '55', 2: '223', 3: '51', 5: '523', 6: '31', 7: '43', 8: '23' };

const ent = load('data/entries.js');
const chars = load('data/chars.js');
const o = [];
const W = s => o.push(s);
let ok = 0, fail = 0;
for (const e of ent) {
  if ((e.i || '').trim()) continue;
  const toks = e.r.split(/\s+/).filter(t => t && !/^[—…,]+$/.test(t));
  const parts = [];
  let bad = false;
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    const m = t.match(/^([a-z']+?)(\d)?$/);
    if (!m) { bad = true; W('解析失败: ' + e.w + ' token=' + t); break; }
    const base = m[1], d = m[2] || (e.ct && e.ct[k]) || '';
    const ipa = sylIpa(base);
    if (!ipa) { bad = true; W('映射失败: ' + e.w + ' → ' + base); break; }
    if (!d) parts.push('·' + ipa);
    else parts.push(ipa + (TONE_VAL[d] || ''));
  }
  if (bad) { fail++; continue; }
  e.i = parts.join(' ');
  ok++;
  W('✓ ' + e.w + ' | ' + e.r + ' → ' + e.i);
}
// 字头
let cok = 0, cfail = 0;
for (const c of chars) {
  if ((c.ipa || '').trim()) continue;
  const m = (c.r || '').match(/^([a-z']+?)(\d)?$/);
  if (!m) { cfail++; W('字头解析失败: ' + c.c + ' r=' + c.r); continue; }
  const ipa = sylIpa(m[1]);
  if (!ipa) { cfail++; W('字头映射失败: ' + c.c + ' → ' + m[1]); continue; }
  c.ipa = '/' + ipa + (TONE_VAL[m[2] || ''] || '') + '/';
  cok++;
  W('✓ 字头 ' + c.c + ' ' + c.r + ' → ' + c.ipa);
}
W('\n词条: 成功 ' + ok + ' 失败 ' + fail + ' | 字头: 成功 ' + cok + ' 失败 ' + cfail);
fs.writeFileSync(path.join(root, 'data/entries.js'), 'window.WUU_ENTRIES=' + JSON.stringify(ent) + ';');
fs.writeFileSync(path.join(root, 'data/chars.js'), 'window.WUU_CHARS=' + JSON.stringify(chars) + ';');
fs.writeFileSync(path.join(root, 'tools/gen_ipa_report.txt'), o.join('\n'), 'utf8');
console.log('词条 成功' + ok + ' 失败' + fail + ' | 字头 成功' + cok + ' 失败' + cfail);

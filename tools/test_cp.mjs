import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const o = [];
function cps(s) { return [...s].map(c => 'U+' + c.codePointAt(0).toString(16)).join(' '); }
// 逐条展示实际输出的码点
const cases = [
  ['thou1 gha2 bi2', 'mark 式 拖鞋皮'],
];
const src = `
const TONE_COMB = { 1: '\\u0304', 2: '\\u0301', 3: '\\u0300', 5: '\\u030C', 6: '\\u0302' };
const TONE_SPACER = { 1: '\\u02C9', 2: '\\u02CA', 3: '\\u02CB', 5: '\\u02C7', 6: '\\u02C6' };
function applyToneMark(py, digit) {
  if (!digit) return py;
  if (!TONE_COMB[digit]) return py;
  if (/^(?:m|n|ng)$/.test(py)) return py + (TONE_SPACER[digit] || '');
  let idx = py.indexOf('a');
  if (idx < 0) idx = py.indexOf('o');
  if (idx < 0) idx = py.indexOf('e');
  if (idx < 0) {
    for (let k = py.length - 1; k >= 0; k--) {
      const ch = py[k];
      if (ch === 'i' || ch === 'u' || ch === 'y') { idx = k; break; }
    }
  }
  if (idx < 0) return py + (TONE_SPACER[digit] || '');
  return py.slice(0, idx + 1) + TONE_COMB[digit] + py.slice(idx + 1);
}
return applyToneMark;
`;
const atm = new Function(src)();
for (const [py, d] of [['thou', '1'], ['gha', '2'], ['bi', '2'], ['tsy', '1'], ['on', '6'], ['m', '2'], ['ng', '6'], ['pau', '3'], ['ke', '5'], ['ni', '6'], ['li', '2'], ['tsy', '1'], ['ts', '1'], ['aeq', '7'], ['ghoq', '8']]) {
  o.push(py + d + ' → ' + atm(py, d) + '   [' + cps(atm(py, d)) + ']');
}
fs.writeFileSync(path.join(root, 'tools/test_cp_report.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

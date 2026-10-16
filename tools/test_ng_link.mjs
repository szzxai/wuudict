import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8');
const o = [];
const W = s => o.push(s);
// 提取 applyToneMark 测试
const TONE_COMB = { 1: '\u0304', 2: '\u0301', 3: '\u0300', 5: '\u030C', 6: '\u0302' };
const TONE_SPACER = { 1: '\u02C9', 2: '\u02CA', 3: '\u02CB', 5: '\u02C7', 6: '\u02C6' };
const i = src.indexOf('function applyToneMark');
const j = src.indexOf('/* ', i);
const atm = new Function('TONE_COMB', 'TONE_SPACER', 'return ' + src.slice(i, j).trim().replace(/}$/, '}') + ';')(TONE_COMB, TONE_SPACER);
for (const [p, d] of [['ng', '2'], ['ng', '6'], ['n', '6'], ['m', '2'], ['m', '6'], ['n', '4'], ['thou', '1'], ['gha', '2'], ['ng', ''], ['on', '6']]) {
  W(p + (d || '') + ' → ' + atm(p, d) + (d ? '  [n上?' + (atm(p, d).includes('n' + TONE_COMB[d]) ? '是' : '否') + ']' : ''));
}
// wordWithLinks 不再产生 <a>
W('wordWithLinks 含 <a>: ' + src.slice(src.indexOf('function wordWithLinks'), src.indexOf('function wordWithLinks') + 400).includes("el('a'"));
fs.writeFileSync(path.join(root, 'tools/test_ng_out.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

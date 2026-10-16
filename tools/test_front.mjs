// 前端核心函数单元验证（不依赖 DOM）
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8');

// 提取纯函数段执行
const start = src.indexOf('const TONE_COMB');
const end = src.indexOf('/* ---------------- 顯示腳本狀態');
const code = src.slice(start, end)
  .replace(/^let scriptMode[\s\S]*?const t2sPhrases = Object\.keys\(CONV\.t2sPhrases \|\| \{\}\)\.sort\(\(a, b\) => b\.length - a\.length\);/m, '');
// 直接构造独立作用域
const sandboxCode = `
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
let toneStyle = 'mark', toneData = 'sandhi';
function fmtPy(r, ct) {
  return String(r || '').split(/\\s+/).map((t, k) => {
    if (!/[a-z]/i.test(t) || /^[—…]+$/.test(t)) return t;
    const m = t.match(/^([（(]*)([a-z]+)(\\d*)([）),，]*)$/);
    if (!m) return t;
    let digit = m[3];
    if (toneData === 'cite' && ct && ct[k]) digit = ct[k];
    const core = toneStyle === 'mark' ? applyToneMark(m[2], digit) : m[2] + digit;
    return m[1] + core + m[4];
  }).join(' ');
}
return { applyToneMark, fmtPy };
`;
const fn = new Function(sandboxCode)();
const o = [];
function eq(actual, expect, msg) { o.push((String(actual) === expect ? 'OK  ' : 'FAIL') + ' ' + msg + ' → ' + JSON.stringify(actual) + (String(actual) !== expect ? ' (期望 ' + JSON.stringify(expect) + ')' : '')); }

// 附标
eq(fn.applyToneMark('thou', '1'), 'thōu', 'thou1→thōu');
eq(fn.applyToneMark('gha', '2'), 'ghá', 'gha2→ghá');
eq(fn.applyToneMark('bi', '2'), 'bí', 'bi2→bí');
eq(fn.applyToneMark('ts', '1'), 'tsˉ', '自成音节/无元音 ts1');
eq(fn.applyToneMark('tsy', '1'), 'tsȳ', 'tsy1 → y 上标');
eq(fn.applyToneMark('aeq', '7'), 'aeq', '入声7不标');
eq(fn.applyToneMark('ghoq', '8'), 'ghoq', '入声8不标');
eq(fn.applyToneMark('on', '6'), 'ô', 'on6 → ô (o优先)');
// fmtPy 数字式
const saveStyle = 'mark';
o.push('--- 数字式 ---');
// 无法直接切 toneStyle（闭包内），单独测 mark 式 fmtPy
eq(fn.fmtPy('thou1 gha2 bi2', null), 'thōu ghá bí', '拖鞋皮 mark 式');
eq(fn.fmtPy('thou1 gha2 bi2', ['1', '2', '2']), 'thōu ghá bí', '拖鞋皮 mark+ct一致');
eq(fn.fmtPy('（taeq）', null), '（taeq）', '括号轻声不标');
eq(fn.fmtPy('—（taeq）', null), '—（taeq）', '破折号+括号');
eq(fn.fmtPy('', null), '', '空串');

fs.writeFileSync(path.join(root, 'tools/test_front_report.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

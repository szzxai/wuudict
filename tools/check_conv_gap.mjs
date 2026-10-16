import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raw = fs.readFileSync(path.join(root, 'data/conv.js'), 'utf8');
const conv = JSON.parse(raw.replace(/^window\.WUU_CONV=/, '').replace(/;\s*$/, ''));
const t2sChars = conv.t2sChars, s2tChars = conv.s2tChars;
const src = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8');

// 提取 app.js 中所有 T('...') 与 el(...,'中文') 的字符串字面量（含中文的）
const lits = [...src.matchAll(/'([^']*)'/g)].map(m => m[1]).filter(s => /[\u4e00-\u9fff]/.test(s));
const uniq = [...new Set(lits)];
const o = [];
const W = s => o.push(s);
W('静态中文字符串数: ' + uniq.length);
const gaps = new Map();
for (const s of uniq) {
  // 该串中有哪些繁体字在 t2sChars 里没有映射（简体模式下会残留繁体）
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (!(cp >= 0x3400 && cp <= 0x9fff) && !(cp >= 0xF900 && cp <= 0xFAFF)) continue;
    if (t2sChars[ch] === undefined && s2tChars[ch] !== undefined) continue; // 本来就是简体
    if (t2sChars[ch] === undefined) gaps.set(ch, (gaps.get(ch) || 0) + 1);
  }
}
W('t2s 无映射的字符（简体模式将原样显示）: ');
const arr = [...gaps.entries()].sort((a, b) => b[1] - a[1]);
W('  ' + arr.map(([c, n]) => c + '(' + n + ')').join(' '));
W('');
W('样例句子:');
for (const s of uniq.slice(0, 12)) W('  · ' + s.slice(0, 60));
fs.writeFileSync(path.join(root, 'data/raw/conv_gap.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

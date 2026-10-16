// 解析 suzhou_dict.html，统计单字读音覆盖（修正拼音提取）
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = {};
eval(fs.readFileSync(path.join(root, 'data/entries.js'), 'utf8'));
eval(fs.readFileSync(path.join(root, 'data/chars.js'), 'utf8'));
const chars = window.WUU_CHARS;
const emptyChars = chars.filter(c => c.g.every(g => !g[0])).map(c => c.c);

const html = fs.readFileSync(path.join(root, 'data/raw/suzhou_dict.html'), 'utf8');
const panelRe = /<strong class="word">\s*\n?\s*([^<]+?)\s*\n\s*<\/strong>((?:(?!<strong class="word">)[\s\S])*)/g;
let m, singles = new Map(), total = 0;
const panels = [];
while ((m = panelRe.exec(html))) {
  total++;
  const word = m[1].trim();
  const body = m[2];
  // </strong> 后的第一个非空行 = 罗马字；下一非空行 = 音标 /.../
  const lines = body.split('\n').map(l => l.trim()).filter(l => l !== '');
  const py = lines[0] || '';
  const ph = lines[1] || '';
  if ([...word].length === 1) {
    if (!singles.has(word)) singles.set(word, []);
    singles.get(word).push({ py, ph });
  }
  panels.push({ word, py, ph });
}
console.log('panels:', total);
console.log('单字词目:', singles.size);
let cov = 0, miss = [];
for (const ch of emptyChars) {
  if (singles.has(ch)) cov++; else miss.push(ch);
}
console.log('空拼音字覆盖:', cov, '/', emptyChars.length, '仍缺:', miss.join(''));
for (const ch of ['刮','滋','家','过','偷','作']) {
  console.log(ch, JSON.stringify(singles.get(ch)));
}
// 音标格式统计（抽查前几个）
console.log('样例:', JSON.stringify(panels.slice(0,3)));

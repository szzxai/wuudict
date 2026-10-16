import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8');
const o = [];
const W = s => o.push(s);
// 找所有单引号字符串字面量（含中文），报告其是否已被 T() 包裹
const lines = src.split('\n');
let inAbout = false;
for (let i = 0; i < lines.length; i++) {
  const L = lines[i];
  if (L.includes('viewAbout')) inAbout = true;
  // 找含中文且非 T('...') 形态的字面量：粗略检查 '中...' 且前面不是 T(
  const re = /'([^']*[一-鿿][^']*)'/g;
  let m;
  while ((m = re.exec(L))) {
    const s = m[1];
    if (!s.trim()) continue;
    // 前文是否 T(
    const before = L.slice(Math.max(0, m.index - 12), m.index);
    const wrapped = /T\(\s*$/.test(before) || /T\(s\)/.test(L) || s.includes("T('");
    W((wrapped ? 'T   ' : 'RAW ') + (i + 1) + ': ' + s.slice(0, 70));
  }
}
fs.writeFileSync(path.join(root, 'data/raw/sweep.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

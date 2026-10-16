import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8');
const o = [];
const W = s => o.push(s);
// applyToneMark
let i = src.indexOf('function applyToneMark');
W('=== applyToneMark ===');
W(src.slice(i, i + 1300));
// 搜索结果渲染
W('=== 搜索结果行 ===');
const r = src.indexOf('class="result');
if (r < 0) { const r2 = src.indexOf("'result '"); W('alt at ' + r2); W(src.slice(r2 - 500, r2 + 400)); }
else W(src.slice(r - 500, r + 400));
// 词条链接 href 模式
W('=== href 模式 ===');
for (const m of src.matchAll(/[#'"]#\/[a-z]+\//g)) W(m[0] + ' @' + m.index);
fs.writeFileSync(path.join(root, 'tools/probe_link_out.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

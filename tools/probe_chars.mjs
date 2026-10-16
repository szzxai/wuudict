import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const S = 'C:/Users/WILLIAMYANG/AppData/Local/Temp/chatbox-sandbox/015809d4-5a26-48b9-adb9-db056778a2db';

const charsJson = JSON.parse(fs.readFileSync(S + '/chars.json', 'utf8'));
const siteJs = fs.readFileSync(path.join(root, 'data/chars.js'), 'utf8');
const siteJson = JSON.parse(siteJs.replace('window.WUU_CHARS=', '').replace(/;\s*$/, ''));
console.log('chars.json 数量:', charsJson.length, ' site chars.js 数量:', siteJson.length);

// 比较两边是否一致（抽查）
function sig(c) { return JSON.stringify(c.g); }
let diff = 0;
const charsJmap = new Map(charsJson.map(c => [c.c, c]));
for (const c of siteJson) {
  const o = charsJmap.get(c.c);
  if (!o || sig(o) !== sig(c)) { diff++; if (diff < 5) console.log('DIFF', c.c, 'site:', sig(c).slice(0,120), ' json:', o ? sig(o).slice(0,120) : 'MISSING'); }
}
console.log('g 不一致数量:', diff);

// 查看 site chars.js 中几个字的详情
for (const ch of ['刮','菜','字','虎','礻','痣']) {
  const c = siteJson.find(x => x.c === ch);
  if (!c) { console.log('---', ch, '不存在'); continue; }
  console.log('---', ch, 'r=' + JSON.stringify(c.r), 'g=' + JSON.stringify(c.g).slice(0, 300), 'd?', !!c.d);
}

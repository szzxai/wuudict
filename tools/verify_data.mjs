import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const chars = load('data/chars.js');
let o = [];
const W = s => o.push(s);

W('词条数: ' + ent.length + '  字头数: ' + chars.length);
// 1. 拼音带调覆盖
let noTone = [];
for (const e of ent) {
  for (const t of e.r.split(/\s+/)) {
    const b = t.replace(/[（）()—…]/g, '');
    if (!b) continue;
    if (!/\d$/.test(b)) noTone.push(e.w + '|' + t);
  }
}
W('拼音音节总数无调号: ' + noTone.length);
W('  其中轻声占多数; 样例: ' + noTone.slice(0, 8).join(' ; '));
// 2. 拖鞋皮
const tp = ent.find(e => e.w === '拖鞋皮');
W('拖鞋皮: ' + tp.r + ' | ' + tp.i);
// 3. chars: g 标签带调率
let gToned = 0, gTotal = 0, gToneless = [];
for (const c of chars) for (const [lab] of c.g) { if (!lab) continue; gTotal++; if (/\d$/.test(lab)) gToned++; else gToneless.push(c.c + ':' + lab); }
W('读音组标签: ' + gTotal + ' 带调: ' + gToned + ' 无调: ' + gToneless.length + ' (' + gToneless.slice(0, 8).join(' ; ') + ')');
W('chars 有 ipa 字段: ' + chars.filter(c => c.ipa).length);
// 4. 搜索兼容：无调查询
function normPy(s) { return s.toLowerCase().replace(/[^a-z']/g, '').replace(/'+/g, "'"); }
const hits = ent.filter(e => normPy(e.r).startsWith(normPy('thou'))).length;
W('搜索 thou 前缀命中: ' + hits);
// 5. IPA 残留乱码
W('IPA 乱码残留: ' + ent.filter(e => /[\uE000-\uF8FF\uFFFD“”꜏▪•]/.test(e.i || '')).length);
// 6. 例句 ～ 完整性
W('含半角~的例句: ' + ent.filter(e => (e.x || []).some(x => x.includes('~'))).length);
// 7. m 标记保留
W('m=1 词条: ' + ent.filter(e => e.m === 1).length);
// 8. 声调数字分布（应只有 1-8）
const dig = new Map();
for (const e of ent) for (const m of e.r.matchAll(/(\d+)(?=[\s（）()—…]|$)/g)) dig.set(m[1], (dig.get(m[1]) || 0) + 1);
W('r 中数字分布: ' + JSON.stringify([...dig.entries()].sort()));
fs.writeFileSync(path.join(root, 'tools/verify_report.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

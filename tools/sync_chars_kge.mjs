import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const chars = load('data/chars.js');
const ent = load('data/entries.js');
const o = [];
const W = s => o.push(s);
// 字头当前状态
for (const ch of ['干', '儿', '店', '碗']) {
  const c = chars.find(x => x.c === ch);
  W('char ' + c.c + ' | r=' + c.r + ' | ipa=' + c.ipa + ' | g=' + JSON.stringify(c.g.map(g => [g[0], g[1].length])));
}
W('');
// 检查 jie1/er2/tse5 残留在哪些字头
for (const bad of ['jie1', 'er2', 'tse5']) {
  const inChars = chars.filter(c => c.r === bad || c.g.some(g => g[0] === bad)).map(c => c.c);
  W('标签 ' + bad + ' 在字头: ' + inChars.join(','));
}
W('');
// 干儿子/碗店 词频核查：还有没有其他词条含 jie1/er2/tse5（属于其他词的正常读音）
const w1 = ent.filter(e => e.r.split(/\s+/).includes('jie1')).map(e => e.w);
const w2 = ent.filter(e => e.r.split(/\s+/).includes('er2')).map(e => e.w);
const w3 = ent.filter(e => e.r.split(/\s+/).includes('tse5')).map(e => e.w);
W('词条含 jie1: ' + w1.join(','));
W('词条含 er2: ' + w2.join(','));
W('词条含 tse5: ' + w3.join(','));
fs.writeFileSync(path.join(root, 'tools/sync_chars_report.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

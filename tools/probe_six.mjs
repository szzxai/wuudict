// 探查 6 个缺拼音字的来源与 chars/entries 数据结构
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = {};
eval(fs.readFileSync(path.join(root, 'data/entries.js'), 'utf8'));
eval(fs.readFileSync(path.join(root, 'data/chars.js'), 'utf8'));
const chars = window.WUU_CHARS;
const entries = window.WUU_ENTRIES;
const sample = chars.find(c => c.c === '过');
console.log('char 过 structure:', JSON.stringify(sample));
const sampleE = entries.find(e => e.w && [...e.w][0] === '过' && e.r);
console.log('entry 过 structure:', JSON.stringify(sampleE));
// 6 个字的出现位置
const six = [' 礻','飠','勞','涾','辶','疒'].map(s=>s.trim());
for (const ch of six) {
  const cs = chars.find(c => c.c === ch);
  console.log('==', ch, 'groups:', JSON.stringify(cs ? cs.g : null));
  const occ = entries.filter(e => e.w.includes(ch)).slice(0, 6);
  console.log('   出现在词条:', occ.map(e => e.w + '(' + (e.r||'') + ')').join(' | '));
  const def = entries.find(e => e.w === ch);
  if (def) console.log('   单字释义:', (def.d||[]).join(' / ').slice(0,80));
}
// entries 的拼音格式样例
const es = entries.filter(e => e.r).slice(0, 8);
console.log('entries拼音样例:', es.map(e => e.w + '=' + e.r).join(' | '));

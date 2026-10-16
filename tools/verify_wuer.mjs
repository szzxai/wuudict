import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const chars = load('data/chars.js');
const o = [];
const W = s => o.push(s);
let bad = 0;
// 索引一致性：所有 g 引用在界内且词条首字 = 字头
for (const c of chars) {
  for (const [lab, idxs] of c.g) {
    for (const i of idxs) {
      if (i < 0 || i >= ent.length) { bad++; W('越界: ' + c.c + '[' + lab + ']→' + i); continue; }
      if (!ent[i].w.includes(c.c)) { bad++; W('错挂: ' + c.c + '[' + lab + ']→' + i + '(' + ent[i].w + ')'); }
    }
  }
}
W('索引校验异常: ' + bad);
// 目标词条
for (const w of ['𠼢', '干儿子', '筷儿', '筷儿箸笼', '爷儿两家头', '娘儿两家头']) {
  const e = ent.find(x => x.w === w);
  W((e ? '✓ ' : '✗ ') + w + ': ' + (e ? e.r + ' | ' + e.i.slice(0, 40) : '未找到'));
}
// 五字头不再挂后缀词；五词条仅剩数目类
const wuE = ent.filter(e => e.w.includes('五'));
W('剩余含五词条(' + wuE.length + '): ' + wuE.map(e => e.w).slice(0, 20).join(','));
const wu = chars.find(c => c.c === '五');
W('五字头 d=' + JSON.stringify(wu.d) + ' x=' + JSON.stringify(wu.x));
const er = chars.find(c => c.c === '儿');
W('儿字头: r=' + er.r + ' ipa=' + er.ipa + ' d=' + JSON.stringify(er.d));
er.g.forEach(([lab, idxs]) => W('  [' + lab + '] n=' + idxs.length + ' 首5: ' + idxs.slice(0, 5).map(i => ent[i].w).join('/')));
// 骲彻底退场
W('骲 词条: ' + ent.filter(e => e.w.includes('骲')).length + ' | 骲 字头: ' + (chars.find(c => c.c === '骲') ? '有' : '无'));
const bo = chars.find(c => c.c === '𠼢');
W('𠼢 字头: r=' + bo.r + ' ipa=' + bo.ipa + ' g=' + JSON.stringify(bo.g.map(g => [g[0], g[1].length])));
fs.writeFileSync(path.join(root, 'tools/verify_wuer_out.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

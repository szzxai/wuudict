import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const chars = load('data/chars.js');
const o = [];
const W = s => o.push(s);

const er2Set = new Set(['女儿节', '巴儿狗', '髦儿戏', '小儿科', '扒儿手', '儿子', '婴儿', '幼儿', '儿歌']);
const gni = [], ng = [], er2 = [];
for (let i = 0; i < ent.length; i++) {
  const e = ent[i];
  if (!e.w.includes('儿')) continue;
  if (er2Set.has(e.w) || /(^|\s)er2(\s|$)/.test(e.r)) er2.push(i);
  else if (/(^|\s)gni2(\s|$)/.test(e.r)) gni.push(i);
  else if (/(^|\s)ng2(\s|$)/.test(e.r)) ng.push(i);
  else { W('?未归类 ' + i + ' ' + e.w + ' | ' + e.r); ng.push(i); }
}
W('gni2=' + gni.length + ' ng2=' + ng.length + ' er2=' + er2.length);
const er = chars.find(c => c.c === '儿');
er.g = [['gni2', gni], ['ng2', ng], ['er2', er2]];
// 字头主读音取白读词缀义? 用户明确：儿第二读 er2(əl223)。主 r 用 gni2（儿子本义）
er.r = 'gni2'; er.ipa = 'ȵiᶽ223';
er.d = ['兒子'];
// 五字头：剔除已改名词（不应含"儿"词），含五词条全部归 ng2（"五"同音）——但"五"自身读音也是 ng2，无冲突
const wuIdx = [];
for (let i = 0; i < ent.length; i++) if (ent[i].w.includes('五')) wuIdx.push(i);
const wu = chars.find(c => c.c === '五');
wu.g = [['ng2', wuIdx]];
wu.r = 'ng2'; wu.ipa = 'ŋ̍223'; wu.d = ['數目']; wu.x = [];
W('五 g=[' + wu.g[0][0] + '] n=' + wuIdx.length);
W('儿 g=' + JSON.stringify(er.g.map(g => [g[0], g[1].length])));
fs.writeFileSync(path.join(root, 'data/entries.js'), 'window.WUU_ENTRIES=' + JSON.stringify(ent) + ';');
fs.writeFileSync(path.join(root, 'data/chars.js'), 'window.WUU_CHARS=' + JSON.stringify(chars) + ';');
fs.writeFileSync(path.join(root, 'tools/rebuild_er3_report.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const chars = load('data/chars.js');
const o = [];
const W = s => o.push(s);

// 先查：含"儿"词条全集及其读音
const erWords = [];
for (let i = 0; i < ent.length; i++) if (ent[i].w.includes('儿')) erWords.push([i, ent[i].w, ent[i].r]);
W('含儿词条 ' + erWords.length + ' 条');

// 分类：gni2（白读，词缀儿）/ er2（文读：女儿节、巴儿狗等固定词）
const ER2 = new Set(['女儿节', '巴儿狗', '髦儿戏', '小儿科', '扒儿手', '女儿', '儿子', '婴儿', '幼儿', '儿歌', '儿化']);
const gni = [], er2 = [];
for (const [i, w, r] of erWords) {
  const syls = r.split(/\s+/).filter(t => !/^[—…]+$/.test(t));
  // 含 gni2 音节 → gni2 组；否则若在固定名单 → er2；否则按首字音节判断
  const isGni = /(^|\s)gni2(\s|$)/.test(r) || syls.some(t => t.replace(/\d+$/, '') === 'gni');
  if (isGni) gni.push(i);
  else if (ER2.has(w) || /(^|\s)er2(\s|$)/.test(r)) er2.push(i);
  else { W('  ?未归类: ' + i + ' ' + w + ' | ' + r); gni.push(i); }
}
W('gni2 组: ' + gni.length + ' | er2 组: ' + er2.length);

// 五字头：所有含五词条（数目/成语），读音 ng2 组
const wuIdx = [];
for (let i = 0; i < ent.length; i++) if (ent[i].w.includes('五')) wuIdx.push(i);
W('含五词条 ' + wuIdx.length);

// 重建 g 组
const er = chars.find(c => c.c === '儿');
er.g = [['gni2', gni], ['er2', er2]];
er.r = 'gni2'; er.ipa = 'ȵiᶽ223'; er.d = ['儿子'];
const wu = chars.find(c => c.c === '五');
wu.g = [['ng2', wuIdx]];
wu.r = 'ng2'; wu.ipa = 'ŋ̍223'; wu.d = ['数目']; wu.x = [];

// 爷儿两家头/娘儿两家头 核查
for (const w of ['爷儿两家头', '娘儿两家头', '爷儿子两家头', '娘儿子两家头', '爷囡儿两家头', '娘囡儿两家头']) {
  const e = ent.find(x => x.w === w);
  if (e) W('词 ' + w + ': ' + e.r + ' | ' + e.i.slice(0, 40));
}
fs.writeFileSync(path.join(root, 'data/entries.js'), 'window.WUU_ENTRIES=' + JSON.stringify(ent) + ';');
fs.writeFileSync(path.join(root, 'data/chars.js'), 'window.WUU_CHARS=' + JSON.stringify(chars) + ';');
fs.writeFileSync(path.join(root, 'tools/rebuild_ng_er_report.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

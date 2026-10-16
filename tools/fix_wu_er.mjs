import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const chars = load('data/chars.js');
const o = [];
const W = s => o.push(s);

/* 1) 词条「骲」→「𠼢」（合并重复） */
const bao = ent.find(e => e.w === '骲');
const bo = ent.findIndex(e => e.w === '𠼢');
if (bao && bo >= 0) {
  W('骲: ' + bao.r + '|' + bao.i + '  𠼢(旧): ' + ent[bo].r + '|' + ent[bo].i);
  ent[bo].i = bao.i;            // 保留骲的音标（223）
  ent.splice(ent.indexOf(bao), 1); // 删除旧骲词条
  W('→ 𠼢 保留: ' + ent[bo].r + '|' + ent[bo].i + '，旧骲词条删除');
}
// 字头：删骲，𠼢 补 ipa；所有词条引用索引需重建——先做词条级改动，最后统一重建 g 索引

/* 2) 干儿子 的 儿 音标 */
const gger = ent.find(e => e.w === '干儿子');
if (gger) {
  const before = gger.i;
  gger.i = gger.i.replace('ȵi223-33', 'ȵiᶽ223-33');
  W('干儿子 IPA: ' + before + ' → ' + gger.i);
}

/* 3) 指定词条 五→儿（读音不变） */
const REN = ['筷五', '囡五', '私囡五', '寄囡五', '嫁囡五', '小干五', '小娘五', '挡筷五', '孙囡五', '侄囡五', '铁筷五', '外孙囡五', '外甥囡五', '内侄囡五', '筷五箸笼', '玄孙囡五', '爷囡五两家头', '娘囡五两家头'];
const moved = []; // 旧索引记录（按当前数组序）
const renSet = new Set(REN);
for (let i = 0; i < ent.length; i++) {
  const e = ent[i];
  if (renSet.has(e.w)) {
    W('改名: ' + e.w + ' → ' + e.w.replace('五', '儿') + ' | ' + e.r);
    e.w = e.w.replace('五', '儿');
  }
}
// 词内「五」改完后，含五的剩余词条应仅为数目/成语类
W('剩余含五词条: ' + ent.filter(e => e.w.includes('五')).map(e => e.w).join(','));

/* 4) 字头重建：儿（gni2 + er2 两读）、五（仅数目） */
const chWu = chars.find(c => c.c === '五');
const chEr = chars.find(c => c.c === '儿');
const chBao = chars.find(c => c.c === '骲');
const chBo = chars.find(c => c.c === '𠼢');

// 儿字头：合并两个 gni2 组为一组；er2 组固定第二读
const erGni = [...(chEr.g[0]?.[1] || []), ...(chEr.g[1]?.[1] || [])];
// 找到改名词条的新索引（按词匹配）
const renamedIdx = [];
for (let i = 0; i < ent.length; i++) if (/儿$/.test(ent[i].w) && renSet.has(ent[i].w.replace('儿', '五'))) renamedIdx.push(i);
// 保险：按原名单反查（改名后名字 = 原名.replace('五','儿')）
const expect = new Set(REN.map(w => w.replace('五', '儿')));
renamedIdx.length = 0;
for (let i = 0; i < ent.length; i++) if (expect.has(ent[i].w)) renamedIdx.push(i);
W('移入儿字头的词条索引: ' + renamedIdx.join(','));

chEr.g = [
  ['gni2', erGni.concat(renamedIdx)],
  ['er2', [866, 901, 1357, 1948, 2783, 3289, 4303, 4733, 4734, 8165]],
];
chEr.r = 'gni2';
chEr.ipa = 'ȵiᶽ223';

// 五字头：从 ng2 组剔除改名词条，删除后缀释义与例词
if (chWu) {
  const set = new Set(renamedIdx);
  chWu.g = chWu.g.map(([lab, idxs]) => [lab, idxs.filter(i => !set.has(i))]).filter(([, idxs]) => idxs.length);
  chWu.d = ['数目'];
  chWu.x = [];
  W('五字头 g: ' + JSON.stringify(chWu.g.map(g => [g[0], g[1].length])) + ' d=' + JSON.stringify(chWu.d));
}

// 骲/𠼢 字头
if (chBao) { chars.splice(chars.indexOf(chBao), 1); W('字头 骲 删除'); }
if (chBo) { chBo.ipa = 'dʑiã223'; W('字头 𠼢 ipa=' + chBo.ipa + ' g=' + JSON.stringify(chBo.g.map(g => [g[0], g[1].length]))); }

/* 索引一致性修复：删除骲词条后，其后所有词条索引 -1；凡 > 被删索引的 g 引用都要调整 */
const delIdx = ent.indexOf; // 重新计算：骲原索引
// 找不到原索引了——用记录：bao 原来在 ent 的位置。删除发生在 step1，位置即 bao 当时的 index。
// 重新扫描：已知 𠼢 词条 bo 在删除前位于 bao+1（5139 vs 5138），故删除后所有 >5138 的索引 -1
const DEL = 5138;
const shift = idxs => idxs.map(i => (i > DEL ? i - 1 : i));
for (const c of chars) c.g = c.g.map(([lab, idxs]) => [lab, shift(idxs)]);
W('索引 >' + DEL + ' 已全部 -1');

fs.writeFileSync(path.join(root, 'data/entries.js'), 'window.WUU_ENTRIES=' + JSON.stringify(ent) + ';');
fs.writeFileSync(path.join(root, 'data/chars.js'), 'window.WUU_CHARS=' + JSON.stringify(chars) + ';');
fs.writeFileSync(path.join(root, 'tools/fix_wu_er_report.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

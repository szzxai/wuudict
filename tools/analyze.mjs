// 临时分析脚本：检查 entries/chars 数据质量
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
globalThis.window = {};
for (const f of ['data/entries.js', 'data/chars.js', 'data/conv.js']) eval(read(f));
const entries = window.WUU_ENTRIES || [];
const chars = window.WUU_CHARS || [];

const out = [];
const log = s => out.push(s);

// 1. 缺读音的词目
const noR = entries.map((e, i) => ({ i, e })).filter(x => !x.e.r || !x.e.r.trim());
log(`词目总数: ${entries.length}, 字头总数: ${chars.length}`);
log(`缺 r 的词目: ${noR.length}`);
for (const x of noR.slice(0, 20)) log(`  [${x.i}] ${x.e.w} r=${JSON.stringify(x.e.r)} d=${JSON.stringify(x.e.d).slice(0, 60)}`);

// 2. 缺拼音的字头读音组
const badGroups = [];
for (const ch of chars) for (const g of ch.g) if (!g[0] || !String(g[0]).trim()) badGroups.push({ c: ch.c, words: g[1].map(i => entries[i].w) });
log(`缺拼音的字头读音组: ${badGroups.length}`);
for (const b of badGroups.slice(0, 40)) log(`  字「${b.c}」: ${b.words.join('、')}`);

// 3. r 中含空格（多音节）占比 & r 内容抽样
const multi = entries.filter(e => /\s/.test(e.r.trim())).length;
log(`r 含空格（多音节拼音）词目: ${multi} / ${entries.length}`);
const sample = entries.filter(e => /\s/.test(e.r)).slice(0, 8).map(e => `${e.w} => ${e.r}`);
log('多音节抽样: ' + sample.join(' | '));
const single = entries.filter(e => /\S\S/.test(e.r.trim()) && !/\s/.test(e.r.trim())).slice(0, 8).map(e => `${e.w} => ${e.r}`);
log('疑似连写抽样: ' + single.join(' | '));

// 4. r 的合法字符检查（吳語學堂拼音字母集）
const badR = entries.map((e, i) => ({ i, e })).filter(x => x.e.r && /[^\p{Script=Latin}\p{Script=Han}0-9\s()（）-]/u.test(x.e.r));
log(`r 含异常字符词目: ${badR.length}`);
for (const x of badR.slice(0, 20)) log(`  ${x.e.w} => ${JSON.stringify(x.e.r)}`);

// 5. 缺释义词目
const noD = entries.map((e, i) => ({ i, e })).filter(x => !Array.isArray(x.e.d) || !x.e.d.length || !x.e.d.join('').trim());
log(`缺释义词目: ${noD.length}`);
for (const x of noD.slice(0, 15)) log(`  [${x.i}] ${x.e.w} r=${x.e.r}`);

// 6. 重复词目（w+r 相同）
const seen = new Map(); const dups = [];
entries.forEach((e, i) => { const k = e.w + '|' + e.r; if (seen.has(k)) dups.push(`「${e.w}」(${e.r}) 重复于 #${seen.get(k)} 和 #${i}`); else seen.set(k, i); });
log(`重复词目: ${dups.length}`); for (const d of dups.slice(0, 10)) log('  ' + d);

// 7. 字头组内重复拼音（同字同读音被分成多组）
const dupGroups = [];
for (const ch of chars) {
  const py = ch.g.map(g => g[0]).filter(Boolean);
  const ds = py.filter((p, i) => py.indexOf(p) !== i);
  if (ds.length) dupGroups.push(`${ch.c}: ${[...new Set(ds)].join(',')}`);
}
log(`字头同读音分组重复: ${dupGroups.length}`); for (const d of dupGroups.slice(0, 15)) log('  ' + d);

// 8. 字头但 g 为空
log(`无读音组字头: ${chars.filter(c => !c.g || !c.g.length).length}`);

// 9. 汉字字头集合与简繁
const charSet = new Set(chars.map(c => c.c));
const trad = [...charSet].filter(c => /[\u3400-\u9FFF\uF900-\uFAFF]/u.test(c)).length;
log(`字头中 CJK 区块字: ${trad}/${charSet.size}`);

fs.writeFileSync(path.join(root, 'tmp_analysis.txt'), out.join('\n'), 'utf8');
console.log(out.join('\n'));

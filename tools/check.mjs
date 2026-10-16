// 东吴词典数据一致性校验脚本
// 用法: node tools/check.mjs
// 校验: data/*.js 可加载、字头读音组与词目链接一致、app.js 语法、index.html 引用完整
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

let failures = 0;
const fail = msg => { failures++; console.log('FAIL:', msg); };
const ok = msg => console.log('OK  :', msg);

// 1. 数据文件可解析
globalThis.window = {};
const files = ['data/entries.js', 'data/chars.js', 'data/conv.js'];
for (const f of files) {
  try { eval(read(f)); ok(`${f} 解析成功`); }
  catch (e) { fail(`${f} 解析失败: ${e.message}`); }
}
const entries = window.WUU_ENTRIES || [];
const chars = window.WUU_CHARS || [];
const conv = window.WUU_CONV || {};

// 2. 结构完整性
if (!entries.length) fail('词目为空');
if (!chars.length) fail('字头为空');
ok(`词目 ${entries.length} 条，字头 ${chars.length} 个`);

// 3. 每个词目有读音与释义（异读词允许无国际音标）
entries.forEach((e, i) => {
  if (!e.w || !e.r) fail(`词目 #${i} 缺 word/romin: ${JSON.stringify(e).slice(0, 80)}`);
  if (!Array.isArray(e.d) || !e.d.length) fail(`词目 #${i}「${e.w}」缺释义`);
});

// 4. 字头读音组 -> 词目链接有效（链接的词目确实包含该字）
let badLinks = 0;
for (const ch of chars) {
  if (!ch.c) fail('存在空字头');
  for (const g of ch.g) {
    if (!g[0]) fail(`字头「${ch.c}」有读音组缺拼音`);
    for (const i of g[1]) {
      if (i >= entries.length || entries[i].w.indexOf(ch.c) < 0) badLinks++;
    }
  }
}
if (badLinks) fail(`${badLinks} 个字头->词目链接无效`);
else ok('全部字头读音组的词目链接有效');

// 5. 多字词目中的每个字都必须有对应字头（跳过括号注音、—、｜等非汉字符号）
const charSet = new Set(chars.map(c => c.c));
let missingChar = new Set();
for (const e of entries) {
  for (const ch of e.w) {
    if (!/\p{Script=Han}/u.test(ch)) continue;
    if (!charSet.has(ch)) missingChar.add(ch);
  }
}
if (missingChar.size) fail(`词目中出现但没有字头的字: ${[...missingChar].join(' ')}`);
else ok('词目中的所有汉字都有字头词条');

// 6. 转换表非空
for (const k of ['s2tChars', 't2sChars']) {
  if (!conv[k] || !Object.keys(conv[k]).length) fail(`转换表 ${k} 为空`);
}
ok(`简→繁单字 ${Object.keys(conv.s2tChars || {}).length} 个，繁→简单字 ${Object.keys(conv.t2sChars || {}).length} 个，词组 ${Object.keys(conv.s2tPhrases || {}).length} 组`);

// 7. app.js 语法（用 new Function 检查，不执行）
try { new Function(read('assets/app.js')); ok('app.js 语法正确'); }
catch (e) { fail(`app.js 语法错误: ${e.message}`); }

// 8. index.html 引用的资源都存在
const html = read('index.html');
const refs = [...html.matchAll(/(?:src|href)=['"]([^'"]+)['"]/g)].map(m => m[1]).filter(u => !/^(?:https?:|data:|#|mailto:|javascript:|\/\/)/i.test(u));
for (const r of refs) {
  if (!fs.existsSync(path.join(root, r))) fail(`index.html 引用的资源不存在: ${r}`);
}
ok(`index.html 引用的 ${refs.length} 个本地资源都存在`);

// 9. app.js 用到的元素 id 在 index.html 中都存在
const js = read('assets/app.js');
const ids = [...new Set([...js.matchAll(/getElementById\((['"])([^'"]+)\1\)/g)].map(m => m[2]))];
const missing = ids.filter(id => !html.includes(`id="${id}"`));
if (missing.length) fail(`app.js 用到但 index.html 缺少的 id: ${missing.join(', ')}`);
else ok(`app.js 用到的 ${ids.length} 个元素 id 在 index.html 中齐全`);

console.log(failures ? `\n${failures} 项校验未通过` : '\n全部校验通过 ✓');
process.exit(failures ? 1 : 0);

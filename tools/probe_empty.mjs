// 探查无拼音字头的来源
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = {};
eval(fs.readFileSync(path.join(root, 'data/entries.js'), 'utf8'));
eval(fs.readFileSync(path.join(root, 'data/chars.js'), 'utf8'));
const entries = window.WUU_ENTRIES, chars = window.WUU_CHARS;

// 1. 没有拼音组的字头
const emptyChars = chars.filter(c => c.g.every(g => !g[0]));
console.log('空拼音字头数:', emptyChars.length);
console.log('空拼音字头列表:', emptyChars.map(c => c.c).join(''));

// 2. 这些字头是否完全无词目链接（孤字）
const orphan = emptyChars.filter(c => !c.g.some(g => g[1].length));
console.log('完全无词目链接的空拼音字头:', orphan.length, orphan.map(c => c.c).join(''));

// 3. entries 中缺 romin 的词目数
const noRom = entries.filter(e => !e.r);
console.log('词目缺 romin:', noRom.length, '/', entries.length);
console.log('缺 romin 词目示例:', noRom.slice(0, 30).map(e => e.w).join(' | '));

// 4. 统计：哪些空拼音字头对应的词目有没有 romin
const emptySet = new Set(emptyChars.map(c => c.c));
let withRom = 0, withoutRom = 0;
for (const e of entries) {
  for (const ch of e.w) {
    if (emptySet.has(ch)) { if (e.r) withRom++; else withoutRom++; }
  }
}
console.log('空拼音字出现在有romin词目中:', withRom, '次; 出现在无romin词目中:', withoutRom, '次');

// 5. 单字词目（长度1）且没有 romin 的
const singleNoRom = entries.filter(e => [...e.w].length === 1 && !e.r);
console.log('单字词目缺romin:', singleNoRom.length, singleNoRom.map(e => e.w).join(''));

// 6. 单字词目总数
console.log('单字词目总数:', entries.filter(e => [...e.w].length === 1).length);

// 7. 空拼音字头里，有单字词目词条(即有释义)的
const hasDef = emptyChars.filter(c => c.d && c.d.length);
console.log('空拼音但有释义的字头:', hasDef.length, hasDef.map(c => c.c).join(''));

// 全面统计空读音字的情况
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = {};
eval(fs.readFileSync(path.join(root, 'data/entries.js'), 'utf8'));
eval(fs.readFileSync(path.join(root, 'data/chars.js'), 'utf8'));
const chars = window.WUU_CHARS;
const entries = window.WUU_ENTRIES;

// 1. 空读音字
const empty = chars.filter(c => c.g.every(g => !g[0]));
console.log('总字数:', chars.length, '空读音字:', empty.length);
// 这些字的 r / d 情况
const noR = empty.filter(c => !c.r).length;
const hasDef = empty.filter(c => c.d && c.d.length).length;
console.log('空读音中无r:', noR, '有释义:', hasDef);

// 2. 解析吴语学堂单字读音
const html = fs.readFileSync(path.join(root, 'data/raw/suzhou_dict.html'), 'utf8');
const panelRe = /<strong class="word">\s*\n?\s*([^<]+?)\s*\n\s*<\/strong>((?:(?!<strong class="word">)[\s\S])*)/g;
let m; const singles = new Map();
while ((m = panelRe.exec(html))) {
  const word = m[1].trim();
  if ([...word].length !== 1) continue;
  const lines = m[2].split('\n').map(l => l.trim()).filter(l => l !== '');
  if (!singles.has(word)) singles.set(word, []);
  singles.get(word).push(lines[0] || '');
}
console.log('吴语学堂单字:', singles.size);
let cov = 0; const missing = [];
for (const c of empty) {
  if (singles.has(c.c)) cov++; else missing.push(c.c);
}
console.log('可覆盖:', cov, '/', empty.length, '缺:', missing.join(''));
// 多读音的字
const multi = [...singles.entries()].filter(([w, a]) => new Set(a).size > 1);
console.log('吴语学堂多读音单字数:', multi.length, '样例:', multi.slice(0, 5).map(([w,a]) => w+':'+a.join('/')).join(', '));
// 音值一致性抽查：已有读音的字 vs 吴语学堂
let same = 0, diff = 0; const diffList = [];
for (const c of chars) {
  if (c.g.every(g => g[0]) && c.r && singles.has(c.c)) {
    const set = new Set(singles.get(c.c));
    if (set.has(c.r)) same++;
    else { diff++; if (diffList.length < 8) diffList.push(c.c + ':' + c.r + ' vs ' + [...set].join('/')); }
  }
}
console.log('与吴语学堂一致:', same, '不一致:', diff, '样例:', diffList.join(', '));
// 空读音字中吴语学堂多读音的
const emptyMulti = empty.filter(c => singles.has(c.c) && new Set(singles.get(c.c)).size > 1);
console.log('空读音字中吴语学堂多读音:', emptyMulti.length, emptyMulti.slice(0,10).map(c=>c.c+':'+[...new Set(singles.get(c.c))].join('/')).join(', '));
// 频次最多的空字前20
const freq = empty.slice().sort((a,b) => (b.g[0][1]?.length||0) - (a.g[0][1]?.length||0));
console.log('空字中词目最多前20:', freq.slice(0,20).map(c => c.c + '(' + (c.g[0][1]?.length||0) + ')').join(', '));

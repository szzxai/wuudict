import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
// 下颏肉：去掉孤立尾括号
const e = ent.find(x => x.w === '下颏肉');
const before = e.i;
e.i = e.i.replace(/\uFF09\s*$/, '').trim();
fs.writeFileSync(path.join(root, 'data/entries.js'), 'window.WUU_ENTRIES=' + JSON.stringify(ent) + ';');
console.log('下颏肉:', JSON.stringify(before), '→', JSON.stringify(e.i));

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
console.log('五花八门:', JSON.stringify(ent.find(e => e.w === '五花八门')).slice(0, 200));
// ou1 是否是本字调错误：查词典里 "五" 的调：吴语学堂 苏州话 五 = ŋ31 (阴上)
console.log('五 IPA 调值对照: ŋ̍31=阴上(3), ou1 若为 51 则是阴平误标');

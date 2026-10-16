import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const chars = load('data/chars.js');
const o = [];
const W = s => o.push(s);

// 1) 所有词条文本里的「干囡五」→「干囡儿」（释义/例句）
let n1 = 0;
for (const e of ent) {
  const s = JSON.stringify(e);
  if (s.includes('干囡五')) {
    e.d = e.d.map(x => x.replace(/干囡五/g, '干囡儿'));
    e.x = e.x.map(x => x.replace(/干囡五/g, '干囡儿'));
    n1++;
  }
}
W('释义含干囡五修正: ' + n1 + ' 条');

// 2) 儿字头补释义（gni2=儿子义；er2=后缀/文读）
const er = chars.find(c => c.c === '儿');
er.d = ['儿子'];
W('儿 d=' + JSON.stringify(er.d));

// 3) 骲→𠼢 收尾确认：骲字头已删、𠼢 词条音标 jian2=dʑiã223 保留
const chBao = chars.find(c => c.c === '骲');
if (chBao) { chars.splice(chars.indexOf(chBao), 1); W('残留骲字头已删'); } else W('骲字头已不存在 ✓');

fs.writeFileSync(path.join(root, 'data/entries.js'), 'window.WUU_ENTRIES=' + JSON.stringify(ent) + ';');
fs.writeFileSync(path.join(root, 'data/chars.js'), 'window.WUU_CHARS=' + JSON.stringify(chars) + ';');
fs.writeFileSync(path.join(root, 'tools/fix_polish_report.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

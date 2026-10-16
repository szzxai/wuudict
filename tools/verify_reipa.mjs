import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js'), chars = load('data/chars.js');
const o = [];
const W = s => o.push(s);

let bad = 0; const badEx = [];
for (const e of ent) for (const sym of ['dʑ', 'ʥ', 'ʣ', 'ȵ', 'iɪ', 'iʏ', 'ᴇ', 'yən', 'ŋ̍', 'ŋ̩', 'm̩', 'n̩']) if ((e.i || '').includes(sym)) { bad++; if (badEx.length < 5) badEx.push(e.w); }
for (const c of chars) for (const sym of ['dʑ', 'ȵ', 'iɪ', 'ᴇ', 'yən', 'ŋ̍', 'm̩', 'n̩']) if ((c.ipa || '').includes(sym)) { bad++; if (badEx.length < 8) badEx.push(c.c); }
W('残留旧符号: ' + bad + (badEx.length ? ' ' + badEx.join(',') : ''));

const cnt = (re) => ent.reduce((a, e) => a + ((e.i || '').match(re) || []).length, 0);
W('dz: ' + cnt(/dz/g) + '  ɲ: ' + cnt(/ɲ/g) + '  ɪ: ' + cnt(/ɪ/g) + '  øʏ: ' + cnt(/øʏ/g) + '  ʏ: ' + cnt(/ʏ/g) + '  ɛ: ' + cnt(/ɛ/g) + '  yn: ' + cnt(/yn/g));

// 声调完整性：与 dict.json 原始记录对比
const dj = JSON.parse(fs.readFileSync(path.join(root, 'data/dict.json'), 'utf8'));
let mismatch = 0; const ex = [];
for (let i = 0; i < ent.length; i++) {
  const a = ((ent[i].i || '').match(/\d+(?:-\d+)*/g) || []).join(',');
  const b = ((dj[i].ipa || '').match(/\d+(?:-\d+)*/g) || []).join(',');
  if (a !== b) { mismatch++; if (ex.length < 5) ex.push(ent[i].w + ': [' + a + '] vs [' + b + ']'); }
}
W('声调序列与原始记录不符: ' + mismatch + (ex.length ? '  ' + ex.join(' | ') : ''));

const css = fs.readFileSync(path.join(root, 'assets/style.css'), 'utf8');
W('placeholder 字体: ' + css.includes('input::placeholder') + ' | opt-group 字体: ' + /opt-group[^}]*latin-font/.test(css));

W('== 抽样 ==');
for (const w of ['旗袍', '旗袍裙', '私盐', '眉毛云', '滋五十六', '紫菜', '糍饭', '纸头', '猪油', '皮球', '拖鞋皮']) {
  const e = ent.find(x => x.w === w);
  if (e) W('  ' + e.w + ' | ' + e.r + ' | ' + e.i);
}
fs.writeFileSync(path.join(root, 'tools/verify_reipa_report.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

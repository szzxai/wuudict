import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const o = [];
const W = s => o.push(s);

// app.js 检查
const src = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8');
W('app.js 长度: ' + src.length);
W('app.js 含 iᶽ 映射: ' + src.includes('i: \'i\u1DBD\'') + ' / yᶽ: ' + src.includes('iu: \'y\u1DBD\'') + ' / ieu=y: ' + src.includes('ieu: \'y\'') + ' / ie=i: ' + src.includes('ie: \'i\''));
W('app.js 关于页表格已转换: ' + /tbl\.innerHTML = T\(/.test(src));
W('app.js title 已转换: ' + (src.match(/document\.title = T\(/g) || []).length + ' 处');
W('app.js 塒 错字已清: ' + !src.includes('塒'));
W('app.js j→dʑ: ' + src.includes("j: 'dʑ'") + ' | gn→ȵ: ' + src.includes("gn: 'ȵ'"));

// 数据检查
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js'), chars = load('data/chars.js');
const cnt = re => ent.reduce((a, e) => a + ((e.i || '').match(re) || []).length, 0);
W('\niᶽ: ' + cnt(/i\u1DBD/g) + '  yᶽ: ' + cnt(/y\u1DBD/g) + '  ʮ: ' + cnt(/ʮ/g) + '  øʏ: ' + cnt(/øʏ/g) + '  dʑ: ' + cnt(/dʑ/g) + '  ȵ: ' + cnt(/ȵ/g) + '  ŋ̍: ' + cnt(/ŋ\u030D/g) + '  m̩: ' + cnt(/m\u0329/g) + '  n̩: ' + cnt(/n\u0329/g));
// 残留（øɪ 除外）
let bad = 0; const badEx = [];
for (const e of ent) {
  const ipa = (e.i || '').replace(/øʏ/g, '');
  for (const sym of ['dz', 'ɲ', 'ɛ', 'ɪ', 'ʏ']) if (ipa.includes(sym)) { bad++; if (badEx.length < 6) badEx.push(e.w); }
}
W('残留旧符号: ' + bad + (badEx.length ? ' ' + badEx.join(',') : ''));
// 声调不变（对照上一次已验证状态 dict.json）
const dj = JSON.parse(fs.readFileSync(path.join(root, 'data/dict.json'), 'utf8'));
let mm = 0;
for (let i = 0; i < ent.length; i++) {
  const a = ((ent[i].i || '').match(/\d+(?:-\d+)*/g) || []).join(',');
  const b = ((dj[i].ipa || '').match(/\d+(?:-\d+)*/g) || []).join(',');
  if (a !== b) mm++;
}
W('声调序列差异(对照原始, 应仅剩历史修复): ' + mm);
W('\n样例:');
for (const w of ['拖鞋皮', '旗袍', '旗袍裙', '私盐', '眉毛云', '滋五十六', '纸头', '猪油', '皮球']) {
  const e = ent.find(x => x.w === w);
  if (e) W('  ' + e.w + ' | ' + e.r + ' | ' + e.i);
}
fs.writeFileSync(path.join(root, 'tools/final_verify_report.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

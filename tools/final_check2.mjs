import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const o = [];
const W = s => o.push(s);
const src = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8');
// 精确提取 PY_RHYME_IPA 与 Y_RHY_IPA 检查映射值
const grab = name => {
  const i = src.indexOf('const ' + name);
  const j = src.indexOf('};', i);
  return src.slice(i, j + 2);
};
const rp = grab('PY_RHYME_IPA');
const yr = grab('Y_RHY_IPA');
W('PY_RHYME_IPA: i→iᶽ=' + rp.includes("i: 'i\u1DBD'") + ' iu→yᶽ=' + rp.includes("iu: 'y\u1DBD'") + ' ieu→y=' + rp.includes("ieu: 'y'") + ' ie→i=' + rp.includes("ie: 'i'") + ' eu→øʏ=' + rp.includes("eu: 'øʏ'"));
W('Y_RHY_IPA: yi=ɦiᶽ=' + (yr.includes("i: 'ɦi\u1DBD'") || yr.includes("'': 'ɦi\u1DBD'")) + ' yu(u)=ɦyᶽ=' + yr.includes("u: 'ɦy\u1DBD'") + ' yeu=ɦy=' + yr.includes("eu: 'ɦy'"));
W('j→dʑ=' + src.includes("j: 'dʑ'") + ' gn→ȵ=' + src.includes("gn: 'ȵ'"));
W('关于页表格 T() 包裹=' + /tbl\.innerHTML = T\(/.test(src));
W('title T() 次数=' + (src.match(/document\.title = T\(/g) || []).length);
W('无塒错字=' + !src.includes('塒'));
W('语法检查');
try { new Function(src)(); W('app.js 可解析（不含数据引用时顶层执行需 DOM，这里仅语法）'); } catch (e) { W('语法/顶层: ' + (e instanceof SyntaxError ? '语法错误! ' + e.message : '顶层执行需 DOM（语法 OK）: ' + e.message.slice(0, 60))); }
// 数据样例
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
W('\n样例:');
for (const w of ['拖鞋皮', '旗袍', '私盐', '猪油', '雨', '滋五十六', '下颏肉']) {
  const e = ent.find(x => x.w === w);
  if (e) W('  ' + e.w + ' | ' + e.r + ' | ' + e.i);
}
fs.writeFileSync(path.join(root, 'tools/final_check2_report.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

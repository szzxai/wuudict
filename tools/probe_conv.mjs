import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raw = fs.readFileSync(path.join(root, 'data/conv.js'), 'utf8');
const conv = JSON.parse(raw.replace(/^window\.WUU_CONV=/, '').replace(/;\s*$/, ''));
const o = [];
const W = s => o.push(s);
W('keys: ' + Object.keys(conv).join(', '));
for (const k of Object.keys(conv)) {
  const v = conv[k];
  W(k + ': ' + (Array.isArray(v) ? 'array(' + v.length + ')' : typeof v === 'object' && v ? 'object(' + Object.keys(v).length + ')' : typeof v));
}
W('s2tChars[0]: ' + JSON.stringify(conv.s2tChars && conv.s2tChars[0]));
W('s2tPhrases 样例: ' + JSON.stringify(conv.s2tPhrases).slice(0, 150));
W('t2sChars[0]: ' + JSON.stringify(conv.t2sChars && conv.t2sChars[0]));
W('t2sPhrases 样例: ' + JSON.stringify(conv.t2sPhrases).slice(0, 150));
// 模拟 app.js 现有用法
const s2tChars = conv.s2tChars;
W('现有用法 s2tChars["阴"] = ' + JSON.stringify(s2tChars["阴"]));
W('现有用法 s2tChars["阴"] as index: ' + JSON.stringify(s2tChars[0]));
// 若是 [from,to] 对数组，测试转换
if (Array.isArray(s2tChars)) {
  const m = new Map(s2tChars.map(p => [p[0], p[1]]));
  let out = '';
  for (const ch of '阴平声调显示设置关於我们吴语学堂记录') out += m.get(ch) || ch;
  W('按对数组转换: ' + out);
}
fs.writeFileSync(path.join(root, 'data/raw/conv_probe.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

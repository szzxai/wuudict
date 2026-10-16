import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['assets/app.js', 'assets/style.css', 'index.html', 'README.md', 'tools/rebuild_data.mjs', 'tools/reipa.mjs'];
const o = [];
for (const f of files) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) { o.push(f + ': 不存在'); continue; }
  const t = fs.readFileSync(p, 'utf8');
  // 乱码特征：CJK兼容表意字符(食部?)或私用区或常见 mojibake 字符串
  const moji = /[椤鍚鎷鏁稿鈥斺銆婃槸涓鍊嬬粙缁嵃叆]/.test(t) || /[\uE000-\uF8FF]/.test(t);
  const hasChinese = /[\u4e00-\u9fff]/.test(t);
  // 疑似双重编码：含 GBK 特有符号组合
  const suspect = /[^一-鿿][\u3400-\u4DBF]/.test(t);
  o.push(f + ': 中文=' + hasChinese + ' 乱码嫌疑=' + moji + '  ' + t.slice(0, 60).replace(/\n/g, '⏎'));
}
fs.writeFileSync(path.join(root, 'data/raw/enc_check.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

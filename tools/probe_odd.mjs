import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const out = [];
// 首值罕见(21,33,22,12,44,435)的 token
const seen = new Set();
for (const e of ent) {
  for (const tok of (e.i || '').split(/\s+/)) {
    const m = tok.match(/^(\d+)/); if (!m) continue;
    const v = m[1];
    if (['21','33','22','12','44','435','4','5','3','2','1','13','24'].includes(v) && !seen.has(tok + v)) {
      seen.add(tok + v);
      out.push(v + ' → ' + tok + '  @' + e.w + ' | ' + e.r + ' | ' + e.i);
    }
  }
}
fs.writeFileSync(path.join(root, 'data/raw/odd_vals.txt'), out.join('\n'), 'utf8');
// 含 或 / [ ] ~ ꜏ … 的音标
const odd2 = [];
for (const e of ent) {
  if (/[或\[~꜏\]]/.test(e.i || '') || /…/.test(e.i || '')) odd2.push(e.w + ' | ' + e.r + ' | ' + e.i);
}
fs.appendFileSync(path.join(root, 'data/raw/odd_vals.txt'), '\n== 特殊符号 ==\n' + odd2.join('\n'), 'utf8');
console.log('ok', out.length, odd2.length);

// 合并 parsed.json → data/dict.json
// 按 (word, ipa) 分组；义项合并；py 可能多音不同组
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const a = JSON.parse(fs.readFileSync(path.join(root, 'data/raw/parsed.json'), 'utf8'));

const groups = new Map(); // key word|ipa → {word, py, ipa, senses[]}
let oddPair = 0; // 同 word 同 ipa 但 py 不同的异常
for (const x of a) {
  const key = x.word + '|' + x.ipa;
  if (!groups.has(key)) {
    groups.set(key, { word: x.word, py: x.py, ipa: x.ipa, cls: x.cls, senses: [] });
  } else {
    const g = groups.get(key);
    if (g.py !== x.py) oddPair++;
    if (x.cls && !g.cls) g.cls = x.cls;
  }
  const g = groups.get(key);
  // 义项：有编号的按序放，无编号的（通常唯一）直接放
  g.senses.push({ text: x.detail, egs: x.tail ? [x.tail] : [] });
}
const entries = [...groups.values()];
// 单字多读音检查
const single = new Map();
for (const e of entries) {
  if ([...e.word].length === 1) {
    if (!single.has(e.word)) single.set(e.word, []);
    single.get(e.word).push({ py: e.py, ipa: e.ipa });
  }
}
let multiRead = 0;
for (const [w, rs] of single) if (rs.length > 1) multiRead++;
console.log('panels:', a.length, '→ groups:', entries.length);
console.log('odd py-in-group:', oddPair);
console.log('single-char words:', single.size, 'with multiple readings:', multiRead);
const examples = [...single.entries()].filter(([w, rs]) => rs.length > 1).slice(0, 8);
examples.forEach(([w, rs]) => console.log(w, rs.map(r => r.py).join(' / ')));
fs.writeFileSync(path.join(root, 'data/dict.json'), JSON.stringify(entries, null, 1), 'utf8');

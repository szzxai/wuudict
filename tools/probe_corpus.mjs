import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const o = [];
function W(s) { o.push(s); }

// 1. y/ɦ 相关：IPA ɦ+y 或 ɦ+i 开头的音节 ↔ 拼音
W('== IPA ɦi / ɦy 起头的音节（对应拼音） ==');
const m1 = new Map(), m2 = new Map();
for (const e of ent) {
  for (const tok of (e.i || '').split(/\s+/)) {
    const mm = tok.match(/^(ɦ[iy]?)([^\d]*)/);
    if (!mm) continue;
    const k = mm[1] + '|' + mm[2];
    const py = (e.r || '').split(/\s+/);
    const idx = (e.i || '').split(/\s+/).indexOf(tok);
    const p = py[idx] || '?';
    (m1.get(k) || m1.set(k, new Map()).get(k)).set(p, (m1.get(k)?.get(p) || 0) + 1);
  }
}
for (const [k, mm] of m1) {
  W('  ' + k + ' → ' + [...mm.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([p, c]) => p + ':' + c).join(' '));
}

// 2. py yu / yi / yuq / un / iun / yun 音节的 IPA
W('\n== 特定拼音音节的 IPA 分布 ==');
for (const syl of ['yu', 'yi', 'yuq', 'un', 'yun', 'iun', 'iu', 'y', 'ya', 'yoe', 'yan', 'yon', 'yen']) {
  const mm = new Map();
  for (const e of ent) {
    const pys = (e.r || '').split(/\s+/), ips = (e.i || '').split(/\s+/);
    for (let k = 0; k < pys.length; k++) {
      const t = pys[k].replace(/[()（）]/g, '').replace(/\d+$/, '');
      if (t !== syl) continue;
      const seg = (ips[k] || '').replace(/^[·•]/, '').replace(/\d.*$/, '');
      mm.set(seg || '(空)', (mm.get(seg || '(空)') || 0) + 1);
    }
  }
  W('  ' + syl + ' → ' + [...mm.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([p, c]) => p + ':' + c).join(' '));
}

// 3. 单字 r数字 vs IPA 首值冲突
W('\n== 单字冲突（r数字 vs IPA 首值） ==');
const V2T = { 55: 1, 44: 1, 223: 2, 13: 2, 51: 3, 523: 5, 41: 5, 31: 6, 231: 6, 43: 7, 4: 7, 5: 7, 23: 8, 3: 8, 2: 8 };
let ok = 0, bad = [];
for (const e of ent) {
  if (e.w.length !== 1) continue;
  const md = e.r && e.r.match(/(\d)$/);
  const mi = (e.i || '').trim().match(/^([^\d]*)(\d+(?:-\d+)*)?/);
  if (!md || !mi || !mi[2]) continue;
  const v = parseInt(mi[2].split('-')[0], 10);
  const t = V2T[v];
  if (!t) { bad.push('?v' + v + ' ' + e.w + ' ' + e.r + ' ' + e.i); continue; }
  if (String(t) === md[1]) ok++; else bad.push(e.w + ' | ' + e.r + ' vs ' + e.i);
}
W('一致:', ok, ' 冲突:', bad.length);
bad.slice(0, 60).forEach(x => W('  ! ' + x));

// 4. 具体词条
W('\n== 指定词条 ==');
for (const w of ['老', '二', '五', '饭', '盐', '私盐', '移', '遗', '越', '穴', '裙', '云', '韵', '蚊', '温']) {
  for (const e of ent) if (e.w === w) W('  ' + e.w + ' | ' + e.r + ' | ' + e.i);
}

fs.writeFileSync(path.join(root, 'data/raw/corpus_probe.txt'), o.join('\n'), 'utf8');
console.log('done');

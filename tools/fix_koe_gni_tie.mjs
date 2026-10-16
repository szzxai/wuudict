import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const chars = load('data/chars.js');
const o = [];
const W = s => o.push(s);
let changed = 0;

// 目标词条修改：拼音 + 音标同步（音节按位置对应）
//  1) 干儿子: jie1 er2 → koe1 gni2；音标 tɕi... → kø.../køʏ...? 依 koe=[kø]、gni=[ȵi]
//  2) 碗店: 第二字 tse5 → tie5；音标 tsʰᴇ... → ti...
const fix = [
  {
    w: '干儿子',
    pyFrom: ['jie1', 'er2'], pyTo: ['koe1', 'gni2'],
    ipaFrom: [/^tɕ/, /^ɦ|^[ʔnȵ]/], ipaTo: ['kø', 'ȵi'],
  },
  {
    w: '碗店',
    pyFrom: [null, 'tse5'], pyTo: [null, 'tie5'],
    ipaFrom: [null, /^tsʰᴇ/], ipaTo: [null, 'ti'],
  },
];
for (const f of fix) {
  const hits = ent.filter(e => e.w === f.w);
  if (!hits.length) { W(f.w + ': 未找到!'); continue; }
  for (const e of hits) {
    const toks = e.r.split(/\s+/);
    const ipaToks = String(e.i || '').trim().split(/\s+/).filter(Boolean);
    W('BEFORE ' + e.w + ' | ' + e.r + ' | ' + e.i + ' | ct=' + JSON.stringify(e.ct));
    for (let k = 0; k < f.pyFrom.length; k++) {
      if (f.pyFrom[k] && toks[k] === f.pyFrom[k]) { toks[k] = f.pyTo[k]; changed++; }
      if (f.ipaFrom[k] && ipaToks[k] && f.ipaFrom[k].test(ipaToks[k])) {
        // 保留调值部分（去掉声母+韵母主体，取 -调尾 或 全部调值）
        const m = ipaToks[k].match(/(\d+(?:-\d+)*)$/);
        const tail = m ? m[1] : '';
        ipaToks[k] = f.ipaTo[k] + tail;
        changed++;
      }
    }
    e.r = toks.join(' ');
    e.i = ipaToks.join(' ');
    W('AFTER  ' + e.w + ' | ' + e.r + ' | ' + e.i);
  }
}
// 字头同步：干 koe1 / 儿 gni2 / 店 tie5（音标同步）
for (const [ch, py, ipa] of [['干', 'koe1', null], ['儿', 'gni2', null], ['店', 'tie5', null]]) {
  const c = chars.find(x => x.c === ch);
  if (!c) { W('char ' + ch + ' 未找到'); continue; }
  W('char BEFORE ' + c.c + ' | r=' + c.r + ' | ipa=' + c.ipa + ' | g=' + JSON.stringify(c.g.map(g => g[0])));
  if (py) c.r = py;
  // g 标签里同音旧形替换
  c.g = c.g.map(g => [g[0] === 'jie1' && ch === '干' ? 'koe1' : g[0] === 'er2' && ch === '儿' ? 'gni2' : g[0] === 'tse5' && ch === '店' ? 'tie5' : g[0], g[1]]);
  W('char AFTER  ' + c.c + ' | r=' + c.r + ' | ipa=' + c.ipa + ' | g=' + JSON.stringify(c.g.map(g => g[0])));
}
fs.writeFileSync(path.join(root, 'data/entries.js'), 'window.WUU_ENTRIES=' + JSON.stringify(ent) + ';');
fs.writeFileSync(path.join(root, 'data/chars.js'), 'window.WUU_CHARS=' + JSON.stringify(chars) + ';');
W('changed marks: ' + changed);
fs.writeFileSync(path.join(root, 'tools/fix_koe_report.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

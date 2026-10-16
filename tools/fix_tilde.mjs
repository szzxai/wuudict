// 统一例句/释义中的半角 ~ 为全角 ～（书中占位符规范），并去重
import fs from 'fs';

const tilde = s => (typeof s === 'string' ? s.replace(/~/g, '～') : s);
const dedupe = arr => {
  const seen = new Set(); const out = [];
  for (const s of arr) { if (!seen.has(s)) { seen.add(s); out.push(s); } }
  return out;
};

// ---- entries.js ----
const entPath = 'data/entries.js';
const ent = JSON.parse(fs.readFileSync(entPath, 'utf8').replace(/^window\.WUU_ENTRIES=/, '').replace(/;\s*$/, ''));
let eFix = 0, eDedup = 0;
for (const e of ent) {
  if (e.d) { const before = JSON.stringify(e.d); e.d = e.d.map(tilde); if (before !== JSON.stringify(e.d)) eFix++; }
  if (e.x && e.x.length) {
    const nx = dedupe(e.x.map(tilde));
    if (nx.length !== e.x.length) eDedup++;
    e.x = nx;
  }
}
fs.writeFileSync(entPath, 'window.WUU_ENTRIES=' + JSON.stringify(ent) + ';');
console.log('entries.js: tilde-fixed fields', eFix, 'deduped examples', eDedup);

// ---- chars.js ----
const chPath = 'data/chars.js';
const ch = JSON.parse(fs.readFileSync(chPath, 'utf8').replace(/^window\.WUU_CHARS=/, '').replace(/;\s*$/, ''));
let cFix = 0, cDedup = 0;
for (const k of Object.keys(ch)) {
  const c = ch[k];
  if (c.d) { const before = JSON.stringify(c.d); c.d = c.d.map(tilde); if (before !== JSON.stringify(c.d)) cFix++; }
  if (c.x && c.x.length) {
    const nx = dedupe(c.x.map(tilde));
    if (nx.length !== c.x.length) cDedup++;
    c.x = nx;
  }
}
fs.writeFileSync(chPath, 'window.WUU_CHARS=' + JSON.stringify(ch) + ';');
console.log('chars.js: tilde-fixed fields', cFix, 'deduped examples', cDedup);

// ---- dict.json ----
const djPath = 'data/dict.json';
const dj = JSON.parse(fs.readFileSync(djPath, 'utf8'));
let dFix = 0, dDedup = 0;
for (const rec of dj) {
  let touched = false;
  for (const s of rec.senses) {
    if (typeof s.text === 'string' && s.text.includes('~')) { s.text = s.text.replace(/~/g, '～'); touched = true; }
    if (Array.isArray(s.egs)) s.egs = s.egs.map(tilde);
  }
  if (touched) dFix++;
  // 去重：text 与 egs 完全相同的 sense
  const seen = new Set(); const ns = [];
  for (const s of rec.senses) {
    const key = JSON.stringify([s.text, s.egs]);
    if (!seen.has(key)) { seen.add(key); ns.push(s); }
  }
  if (ns.length !== rec.senses.length) { rec.senses = ns; dDedup++; }
}
fs.writeFileSync(djPath, JSON.stringify(dj, null, 1));
console.log('dict.json: tilde-fixed records', dFix, 'deduped senses', dDedup);

// 验证：全库不应再有半角 ~
const all = fs.readFileSync(entPath, 'utf8') + fs.readFileSync(chPath, 'utf8') + fs.readFileSync(djPath, 'utf8');
console.log('remaining halfwidth ~:', (all.match(/~/g) || []).length - (all.match(/window\.WUU/) ? 0 : 0));
const fu = ent.find(e => e.w === '复');
console.log('复 x:', JSON.stringify(fu.x), 'd:', JSON.stringify(fu.d));
const fu2 = dj.find(e => e.word === '复');
console.log('dict 复 senses:', JSON.stringify(fu2.senses));

import fs from 'fs';
const dj = JSON.parse(fs.readFileSync('data/dict.json', 'utf8'));
const entTxt = fs.readFileSync('data/entries.js', 'utf8').replace(/^window\.WUU_ENTRIES=/, '').replace(/;\s*$/, '');
const ent = JSON.parse(entTxt);
let out = '';

// 1) same order?
let orderDiff = 0;
for (let i = 0; i < Math.min(dj.length, ent.length); i++) {
  if (dj[i].word !== ent[i].w) { orderDiff++; if (orderDiff <= 5) out += 'ORDER DIFF at ' + i + ': dj=' + dj[i].word + ' ent=' + ent[i].w + '\n'; }
}
out += 'order diffs: ' + orderDiff + '\n';

// 2) m / cls mapping
const clsCount = {};
dj.forEach(e => clsCount[e.cls] = (clsCount[e.cls] || 0) + 1);
out += 'cls values: ' + JSON.stringify(clsCount) + '\n';
const mCount = {};
ent.forEach(e => mCount[e.m] = (mCount[e.m] || 0) + 1);
out += 'm values: ' + JSON.stringify(mCount) + '\n';

// 3) py diffs for all entries (ent r vs dj py)
const pyDiffs = [];
for (let i = 0; i < dj.length; i++) {
  if (dj[i].py !== ent[i].r) pyDiffs.push([i, dj[i].word, dj[i].py, ent[i].r]);
}
out += 'py diffs total: ' + pyDiffs.length + '\n';
for (const [i, w, a, b] of pyDiffs) out += 'PD i=' + i + ' ' + w + ' | dj: ' + a + ' | ent: ' + b + '\n';

// 4) sense diffs
const senseDiffs = [];
for (let i = 0; i < dj.length; i++) {
  const a = dj[i].senses.map(s => s.text).join('\u0001');
  const b = ent[i].d.join('\u0001');
  if (a !== b) senseDiffs.push([i, dj[i].word, dj[i].senses, ent[i].d]);
}
out += 'sense diffs total: ' + senseDiffs.length + '\n';
for (const [i, w, sa, sb] of senseDiffs) out += 'SD i=' + i + ' ' + w + '\n  dj: ' + JSON.stringify(sa) + '\n  ent: ' + JSON.stringify(sb) + '\n';

// 5) egs diffs
const egDiffs = [];
for (let i = 0; i < dj.length; i++) {
  const a = dj[i].senses.flatMap(s => s.egs).join('\u0001');
  const b = ent[i].x.join('\u0001');
  if (a !== b) egDiffs.push([i, dj[i].word, dj[i].senses.flatMap(s => s.egs), ent[i].x]);
}
out += 'egs diffs total: ' + egDiffs.length + '\n';
for (const [i, w, ea, eb] of egDiffs) out += 'ED i=' + i + ' ' + w + '\n  dj: ' + JSON.stringify(ea) + '\n  ent: ' + JSON.stringify(eb) + '\n';

fs.writeFileSync('data/_recon_report.txt', out);
console.log('written data/_recon_report.txt');

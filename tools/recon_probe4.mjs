import fs from 'fs';
const dj = JSON.parse(fs.readFileSync('data/dict.json', 'utf8'));
const entTxt = fs.readFileSync('data/entries.js', 'utf8').replace(/^window\.WUU_ENTRIES=/, '').replace(/;\s*$/, '');
const ent = JSON.parse(entTxt);

// cls value distribution
const clsCount = {};
for (const e of dj) clsCount[e.cls] = (clsCount[e.cls] || 0) + 1;
console.log('dj cls:', JSON.stringify(clsCount));

// m vs cls relationship
let m1c1 = 0, m0c1 = 0, m1empty = 0;
for (let i = 0; i < dj.length; i++) {
  const m = ent[i].m, c = dj[i].cls || '';
  if (m === 1 && c === 'c1') m1c1++;
  else if (m === 1 && c === '') m1empty++;
  else if (m === 0 && c === 'c1') m0c1++;
}
console.log('m1&c1:', m1c1, ' m1&empty:', m1empty, ' m0&c1:', m0c1);

// sample dj full record
console.log('dj[7376]:', JSON.stringify(dj[7376]));
console.log('dj[8151]:', JSON.stringify(dj[8151]));
// where is 复 in dj?
dj.forEach((e, i) => { if (e.word === '复') console.log('dj 复 i=' + i, JSON.stringify(e)); });
// m=1 sample from ent
ent.forEach((e, i) => { if (e.m === 1 && i < 8) console.log('ent m1 i=' + i, e.w, e.r, JSON.stringify(e.d).slice(0, 80)); });

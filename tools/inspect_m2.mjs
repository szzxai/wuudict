import fs from 'fs';
const entries = JSON.parse(fs.readFileSync('data/entries.js', 'utf8').replace(/^window\.WUU_ENTRIES=/, '').replace(/;\s*$/, ''));
const diff = entries.filter(e => e.m && e.m !== e.r);
console.log('count:', diff.length);
for (const e of diff.slice(0, 15)) console.log(JSON.stringify({ w: e.w, r: e.r, m: e.m, i: e.i }));
// any entry where m is a number other than 0?
const nums = entries.filter(e => typeof e.m === 'number' && e.m !== 0);
console.log('numeric m !=0:', nums.length, nums.slice(0, 5).map(e => e.w + ':' + e.m));
// distribution of extra keys
const keyset = {};
for (const e of entries) { const k = Object.keys(e).join('|'); keyset[k] = (keyset[k] || 0) + 1; }
console.log(keyset);

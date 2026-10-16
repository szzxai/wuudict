import fs from 'fs';
const entTxt = fs.readFileSync('data/entries.js', 'utf8').replace(/^window\.WUU_ENTRIES=/, '').replace(/;\s*$/, '');
const entries = JSON.parse(entTxt);
const conv = JSON.parse(fs.readFileSync('data/conv.js', 'utf8').replace(/^window\.WUU_CONV=/, '').replace(/;\s*$/, ''));

const probes = ['篤', '涴', '物事', '扛', '疻水'];
for (const w of probes) {
  const e = entries.find(x => x.w === w);
  if (e) console.log(w, '=>', JSON.stringify(e).slice(0, 260));
  else console.log(w, 'NOT FOUND');
}

// coverage stats
let noR = 0, diffRM = 0, emptyR = 0;
for (const e of entries) {
  if (e.r === '' || e.r == null) emptyR++;
  if (e.m && e.m !== e.r) diffRM++;
}
console.log('entries:', entries.length, 'empty r:', emptyR, 'r!=m:', diffRM);
console.log('s2tChars size:', Object.keys(conv.s2tChars).length, 'phrases:', Object.keys(conv.s2tPhrases).length, 't2sChars:', Object.keys(conv.t2sChars).length, 'phrases:', Object.keys(conv.t2sPhrases).length);

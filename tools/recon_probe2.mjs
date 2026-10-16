import fs from 'fs';
const dj = JSON.parse(fs.readFileSync('data/dict.json', 'utf8'));
const entTxt = fs.readFileSync('data/entries.js', 'utf8').replace(/^window\.WUU_ENTRIES=/, '').replace(/;\s*$/, '');
const ent = JSON.parse(entTxt);
const chars = JSON.parse(fs.readFileSync('data/chars.js', 'utf8').replace(/^window\.WUU_CHARS=/, '').replace(/;\s*$/, ''));
const conv = JSON.parse(fs.readFileSync('data/conv.js', 'utf8').replace(/^window\.WUU_CONV=/, '').replace(/;\s*$/, ''));
let out = '';

// ipa relationship
out += 'dj[0].ipa: [' + dj[0].ipa + '] ent[0].i: [' + ent[0].i + ']\n';
let ipaMatch = 0, ipaDiff = [];
for (let i = 0; i < dj.length; i++) {
  const a = '/' + ent[i].i + '/';
  if (a === dj[i].ipa) ipaMatch++; else ipaDiff.push([i, dj[i].word, dj[i].ipa, ent[i].i]);
}
out += 'ipa match: ' + ipaMatch + ' diff: ' + ipaDiff.length + '\n';
for (const [i, w, a, b] of ipaDiff.slice(0, 10)) out += 'ID i=' + i + ' ' + w + ' dj:[' + a + '] ent:[' + b + ']\n';

// m=1 entries
const m1 = ent.map((e, i) => [e, i]).filter(([e]) => e.m === 1);
out += 'm=1 count: ' + m1.length + '\n';
for (const [e, i] of m1.slice(0, 30)) out += 'M1 i=' + i + ' w=' + e.w + ' r=' + e.r + ' d=' + JSON.stringify(e.d) + '\n';

// chars.js structure
const ckeys = Object.keys(chars);
out += 'chars keys: ' + ckeys.length + '\n';
out += 'chars sample 的: ' + JSON.stringify(chars['的']) + '\n';
out += 'chars sample 复: ' + JSON.stringify(chars['复']) + '\n';
// conv structure
const vkeys = Object.keys(conv);
out += 'conv keys: ' + vkeys.length + '\n';
out += 'conv sample: ' + JSON.stringify({ s: conv['专'], t: conv['門'], u: conv['光'] }) + '\n';
out += 'conv 丝: ' + JSON.stringify(conv['丝']) + '\n';

// 复 entry details
for (let i = 0; i < dj.length; i++) {
  if (dj[i].word === '复') {
    out += 'FU dj i=' + i + ': ' + JSON.stringify(dj[i]) + '\n';
    out += 'FU ent i=' + i + ': ' + JSON.stringify(ent[i]) + '\n';
    out += 'FU chars 复: ' + JSON.stringify(chars['复']) + '\n';
  }
}

// x for entry 7376
out += 'ent[7376] x: ' + JSON.stringify(ent[7376].x) + '\n';

fs.writeFileSync('data/_recon_report2.txt', out);
console.log('ok');

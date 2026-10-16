import fs from 'fs';
const entTxt = fs.readFileSync('data/entries.js', 'utf8').replace(/^window\.WUU_ENTRIES=/, '').replace(/;\s*$/, '');
const ent = JSON.parse(entTxt);
const charsTxt = fs.readFileSync('data/chars.js', 'utf8').replace(/^window\.WUU_CHARS=/, '').replace(/;\s*$/, '');
const chars = JSON.parse(charsTxt);
const convRaw = fs.readFileSync('data/conv.js', 'utf8').replace(/^window\.WUU_CONV=/, '').replace(/;\s*$/, '');
const conv = JSON.parse(convRaw);
let out = '';

// conv structure
out += 'conv keys: ' + Object.keys(conv).join(', ') + '\n';
for (const k of Object.keys(conv)) {
  const v = conv[k];
  out += '  ' + k + ': type=' + (Array.isArray(v) ? 'array' : typeof v) + ' size=' + (typeof v === 'object' ? Object.keys(v).length : v.length) + '\n';
}
if (conv.s2tWords) {
  const words = Object.keys(conv.s2tWords);
  out += 's2tWords sample: ' + words.slice(0, 20).join(',') + '\n';
  for (const w of ['头发', '复印', '干净', '后来', '里面', '历史', '制度', '种子', '重量', '汇合', '净化', '余', '复']) {
    out += 's2t[' + w + ']=' + JSON.stringify(conv.s2tWords[w]) + ' s2tChars=' + JSON.stringify(conv.s2tChars[w]) + '\n';
  }
}
for (const w of ['发', '复', '干', '后', '里', '面', '历', '制', '种', '重', '汇']) {
  out += 's2tChars[' + w + ']=' + JSON.stringify(conv.s2tChars[w]) + ' t2sChars=' + JSON.stringify(conv.t2sChars && conv.t2sChars[w]) + '\n';
}
// check t2s
if (conv.t2sWords) {
  const words = Object.keys(conv.t2sWords);
  out += 't2sWords sample: ' + words.slice(0, 20).join(',') + '\n';
}

// chars stats
out += 'chars records: ' + chars.length + '\n';
const withDef = chars.filter(c => c.d.length > 0);
const multiRead = chars.filter(c => c.g.length > 1);
out += 'chars with def: ' + withDef.length + ', multi-reading: ' + multiRead.length + '\n';
// entries that are chars themselves?
const charSet = new Set(chars.map(c => c.c));
const entryHeadChars = new Set(ent.map(e => e.w.length === 1 ? e.w : null).filter(Boolean));
out += 'single-char entries: ' + entryHeadChars.size + '\n';
out += 'chars not single-entry: ' + [...charSet].filter(c => !entryHeadChars.has(c)).length + '\n';

// g index validity
let badIdx = 0, badContain = 0;
const samples = [];
for (const c of chars) {
  for (const [py, idxs] of c.g) {
    for (const ix of idxs) {
      const e = ent[ix];
      if (!e) { badIdx++; continue; }
      if (!e.w.includes(c.c)) { badContain++; if (samples.length < 10) samples.push(c.c + ' -> ' + ix + ' ' + e.w); }
    }
  }
}
out += 'bad indices: ' + badIdx + ', bad containment: ' + badContain + '\n';
samples.forEach(s => out += '  ' + s + '\n');

// 复 entry
const fu = ent.find(e => e.w === '复');
out += '复 entry: ' + JSON.stringify(fu) + '\n';
// does chars include 复?
const fuC = chars.find(c => c.c === '复');
out += '复 char: ' + JSON.stringify(fuC) + '\n';

// how does the site use chars (grep app code)
fs.writeFileSync('data/_recon_report3.txt', out);
console.log('ok');

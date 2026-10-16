import fs from 'fs';

function head(f, n = 60) {
  const t = fs.readFileSync(f, 'utf8');
  console.log(`[${f}] len=${t.length} head=${JSON.stringify(t.slice(0, n))}`);
  return t;
}

const dictTxt = head('data/dict.json', 60);
const entTxt = head('data/entries.js', 60);
const chTxt = head('data/chars.js', 60);
const convTxt = head('data/conv.js', 120);

function jparse(name, txt, prefix) {
  let t = txt;
  if (prefix) {
    if (!t.startsWith(prefix)) console.log(`  !! ${name} does not start with ${JSON.stringify(prefix)}`);
    else t = t.slice(prefix.length);
    t = t.trimEnd();
    if (t.endsWith(';')) t = t.slice(0, -1);
  }
  try {
    const v = JSON.parse(t);
    console.log(`  ${name} parsed OK, ${Array.isArray(v) ? v.length + ' items' : Object.keys(v).join(',')}`);
    return v;
  } catch (e) {
    console.log(`  ${name} PARSE FAIL: ${e.message.slice(0, 120)}`);
    return null;
  }
}

const dict = jparse('dict.json', dictTxt, null);
const entries = jparse('entries.js', entTxt, 'window.WUU_ENTRIES=');
const chars = jparse('chars.js', chTxt, 'window.WUU_CHARS=');
const conv = jparse('conv.js', convTxt, 'window.WUU_CONV=');

if (entries && entries[0]) console.log('entries[0] keys:', JSON.stringify(Object.keys(entries[0])));
if (chars && chars[0]) console.log('chars[0] keys:', JSON.stringify(Object.keys(chars[0])));
if (conv) {
  console.log('conv top keys:', JSON.stringify(Object.keys(conv)));
  const probes = ['东', '苏', '州', '头', '面', '后', '发', '里', '干'];
  for (const p of probes) console.log(`  s2t ${p}: ${JSON.stringify(conv.s2tChars && conv.s2tChars[p])}`);
  for (const p of ['東', '蘇', '州', '頭', '面', '後', '發', '裏', '乾']) console.log(`  t2s ${p}: ${JSON.stringify(conv.t2sChars && conv.t2sChars[p])}`);
}
if (dict && dict[0]) console.log('dict[0] keys:', JSON.stringify(Object.keys(dict[0])));

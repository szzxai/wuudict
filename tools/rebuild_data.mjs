// 重建 data/entries.js 与 data/chars.js（v4 最终版）
// - r：拼音补齐 1-8 声调数字；以 IPA（吴语学堂记录）为准修正音节顺序/粘连/截断；
//      旧拼音音节有效但与反推冲突时，保留旧词形并报告（防 OCR 送气/清浊丢失）
// - i：清理 IPA 乱码，调值原样保留（声调不用改）
// - chars.js：g 组重建（补调号、去重、合并括号形）；新增 ipa（单字词条音标）
// 干跑：node tools/rebuild_data.mjs --dry → tools/rebuild_report.txt
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const report = [];
function out(s) { report.push(s); }
const origLog = console.log.bind(console);
console.log = (...a) => out(a.join(' '));

const loadJs = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const oldEnt = loadJs('data/entries.js');
const oldChars = loadJs('data/chars.js');

/* ---------- 工具 ---------- */
function isHanziCh(ch) {
  const cp = ch.codePointAt(0);
  return (cp >= 0x3400 && cp <= 0x9fff) || (cp >= 0xF900 && cp <= 0xFAFF) || (cp >= 0x20000 && cp <= 0x323AF);
}
const isHanzi = ch => isHanziCh(ch);
function stripTone(py) { return py.replace(/[()（）]/g, '').replace(/\d+$/, ''); }
function splitIni(py) {
  for (const c of ['gh', 'tsh', 'ph', 'th', 'kh', 'ch', 'sh', 'gn', 'ng', 'ts', 'b', 'p', 'm', 'f', 'v', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'c', 'x', 's', 'z', 'y', 'w']) {
    if (py.startsWith(c)) return [c, py.slice(c.length)];
  }
  return ['', py];
}
const VOICED = new Set(['b', 'd', 'g', 'gh', 'v', 'z', 'gn', 'ng', 'm', 'n', 'l', 'j', 'y', 'w', '']);
const RUSHENG = /(aeq|aq|oq|eq|iq|ueq|iuq|iaeq|uaeq|iaq|ioq|yuq)$/;

/* ---------- IPA → 拼音 反向映射 ---------- */
const IPAINI2 = [
  ['tɕʰ', 'ch'], ['ʦʰ', 'tsh'], ['tsʰ', 'tsh'], ['ʨʰ', 'ch'], ['pʰ', 'ph'], ['tʰ', 'th'], ['kʰ', 'kh'],
  ['dʑ', 'j'], ['ʥ', 'j'], ['ʣ', 'dz'], ['dz', 'j'], ['tɕ', 'c'], ['ʨ', 'c'], ['ʦ', 'ts'], ['ts', 'ts'],
  ['ɕ', 'sh'], ['ʑ', 'j'],
  ['ɡ', 'g'], ['p', 'p'], ['b', 'b'], ['t', 't'], ['d', 'd'], ['k', 'k'],
  ['f', 'f'], ['v', 'v'], ['s', 's'], ['z', 'z'],
  ['ɦu', 'w'], ['ɦi', 'y'],
  ['m̩', 'm'], ['n̩', 'n'], ['ŋ̍', 'ng'], ['ŋ̩', 'ng'],
  ['ɦ', 'gh'], ['h', 'h'], ['m', 'm'], ['n', 'n'], ['ŋ', 'ng'], ['ȵ', 'gn'], ['ɲ', 'gn'], ['l', 'l'],
  ['w', 'w'], ['j', 'y'], ['y', 'iu'], ['ɥ', 'iu'], ['ʔ', '']
];
/* 依对照表：e=[ɛ] ue=[uɛ] ie=[ɪ] eu=[øʏ] ieu=[ʏ] iun=[yn]；j=[dz] gn=[ɲ]；成音节鼻音平标 */
const IPRHY = {
  'ɑ': 'a', 'a': 'a', 'aʔ': 'aeq', 'ã': 'an', 'ɑ̃': 'aon', 'ɑʔ': 'aq', 'æ': 'au',
  'ᴇ': 'e', 'ɛ': 'e', 'ən': 'en', 'en': 'en',
  'ə': 'eq', 'əʔ': 'eq', 'əl': 'er',
  'øʏ': 'eu', 'y': 'ieu', 'yᶽ': 'iu', 'ᶽ': 'iu',
  'i': 'i', 'iᶽ': 'i', 'iɑ': 'ia', 'ia': 'ia', 'iaʔ': 'iaeq', 'iã': 'ian', 'iɑ̃': 'iaon',
  'iɑʔ': 'iaq', 'iæ': 'iau', 'in': 'in', 'io': 'io', 'iø': 'ioe',
  'ioŋ': 'ion', 'ioʔ': 'ioq', 'iəʔ': 'iq', 'yəʔ': 'iuq', 'yən': 'iun', 'yn': 'iun',
  'o': 'o', 'ø': 'oe', 'oŋ': 'on', 'on': 'on',
  'oʔ': 'oq', 'əu': 'ou', 'u': 'u', 'uɑ': 'ua', 'ua': 'ua', 'uaʔ': 'uaeq', 'uã': 'uan', 'uɑ̃': 'uaon',
  'uᴇ': 'ue', 'uən': 'uen', 'uəʔ': 'ueq', 'uø': 'uoe', 'ɿ': 'y', 'ʮ': 'yu',
  'ŋ̍': 'ng', 'ŋ̩': 'ng', 'm̩': 'm', 'n̩': 'n', 'ŋ': 'ng', 'm': 'm', 'n': 'n',
  'iᶽ': 'i', 'yᶽ': 'iu',
  'dz': 'j', 'dʑ': 'j', 'ʥ': 'j', 'ʣ': 'j', 'ȵ': 'gn', 'ɲ': 'gn'
};
function ipaSyll2Py(seg0) {
  const seg = seg0.split('a\u0303').join('ã').split('ɑ\u0303').join('ɑ̃');
  const GL_YI = { '': 'yi', 'ᶽ': 'yi', 'i': 'yi', 'ɪ': 'ye', 'ø': 'yoe', 'ɑ': 'ya', 'ã': 'yan', 'oŋ': 'yon', 'ʏ': 'yeu', 'ɑʔ': 'yaq', 'æ': 'yau', 'n': 'yin', 'ɑ̃': 'yaon', 'aʔ': 'yaeq', 'oʔ': 'yoq', 'əʔ': 'yiq', 'iɪ': 'yie' };
  const GL_YU = { 'ᶽ': 'yu', 'ən': 'yun', 'n': 'yun', 'əʔ': 'yuq', 'aʔ': 'yuaeq' };
  const GL_WU = { 'ɑ': 'wa', 'ɑ̃': 'waon', 'ᴇ': 'we', 'ã': 'wan', 'əʔ': 'weq', 'aʔ': 'waeq', 'ø': 'woe', 'ən': 'wen', 'u': 'wu', 'uɑ': 'wa', 'uɑ̃': 'waon' };
  if (seg.startsWith('ɦi')) { const t = GL_YI[seg.slice(2)]; if (t) return t; }
  if (seg.startsWith('ɦy')) { const t = GL_YU[seg.slice(2)]; if (t) return t; }
  if (seg.startsWith('ɦu')) { const t = GL_WU[seg.slice(2)]; if (t) return t; }
  if (seg === 'ɦʏ' || seg === 'ɦy') return 'yeu';
  if (seg === 'ɦyᶽ') return 'yu';
  if (seg === 'ɦiᶽ') return 'yi'; // y聲母+ieu：依对照表 [ɦʏ]
  for (const [ip, py] of IPAINI2) {
    if (seg.startsWith(ip)) {
      const rh = seg.slice(ip.length);
      if (rh === '') {
        if (py === 'm' || py === 'n' || py === 'ng') return py;
        continue;
      }
      const t = IPRHY[rh];
      if (t !== undefined) { return py === '' ? t : py + t; }
    }
  }
  const t0 = IPRHY[seg]; // 零声母
  if (t0 !== undefined) return t0;
  return null;
}

/* ---------- 调值 → 调类 ---------- */
const VAL2TONE = { 55: 1, 44: 1, 223: 2, 13: 2, 12: 2, 22: 2, 51: 3, 52: 3, 523: 5, 41: 5, 412: 5, 512: 5, 31: 6, 231: 6, 24: 6, 21: 6, 33: 6, 43: 7, 4: 7, 5: 7, 435: 7, 23: 8, 3: 8, 2: 8 };

/* ---------- IPA 清理与解析 ---------- */
function cleanIpa(s) {
  return s
    .replace(/\uF645/g, '')                    // 水草类：丢失的调尾残片，按空处理
    .replace(/\uF505/g, '51')                  // 饼馒店类：丢字残片按上下文取 51
    .replace(/[\uE000-\uF8FF]/g, '')
    .replace(/\uFFFD+/g, 'ə')                  // 乱码残片多为 ə（UTF-8 双字节损坏）
    .replace(/[”“]/g, '').replace(/꜏/g, '').replace(/▪/g, '·')
    .replace(/•/g, '·')
    .replace(/ʦ/g, 'ts').replace(/ʨʰ/g, 'tɕʰ').replace(/ʨ/g, 'tɕ')
    .replace(/ʥ/g, 'dʑ').replace(/ʣ/g, 'dʑ')
    .replace(/ı/g, 'ɪ').replace(/I/g, 'ɪ').replace(/˧/g, '')
    .replace(/([）)])(?=[^\s）()])/g, '$1 ')    // 括号后粘连：补空格
    .replace(/([（(])(?=[^\s（）()]*[）)]*[^\s（）()]*$)/g, ' $1') // 括号前粘连：补空格
    .replace(/(\d)(?=[a-zɡɑæøʏəɨɪȵŋɦʔ])/g, '$1 '); // 数字后紧跟声母字母：补空格
}
function parseIpaTok(tok) {
  let light = false, paren = false, t = tok;
  if (/^[（(]/.test(t)) { paren = true; t = t.replace(/^[（(]/, '').replace(/[）)]*$/, ''); }
  if (/^[·]/.test(t)) { light = true; t = t.slice(1); }
  t = t.replace(/（或[^）]*）?/g, '').replace(/\(或[^)]*\)?/g, '');
  t = t.replace(/\[~[^\]]*\]/g, '');
  t = t.replace(/^[（）()\s]+|[（）()\s-]+$/g, '');
  const mDash = t.match(/^([^\d]*?)-(\d+(?:-\d+)*)$/); // 丢基值：vᴇ-21
  if (mDash) return { light, paren, seg: mDash[1] || '', tones: mDash[2], base: null };
  const m = t.match(/^([^\d]*?)(\d+(?:-\d+)*)?$/);
  if (!m) return null;
  return { light, paren, seg: m[1] || '', tones: m[2] || '', base: m[2] ? parseInt(m[2].split('-')[0], 10) : null };
}
function ipaToksOf(s) {
  const toks = [];
  for (const raw of s.split(/\s+/)) {
    for (const part of raw.split(/…+/)) {
      const t = part.trim();
      if (t) toks.push(t);
    }
  }
  for (let k = 1; k < toks.length; k++) { // 空格错位：vən22 3ɕi523-21 → vən223 ɕi523-21
    const m = toks[k].match(/^(\d+)(.*)$/);
    if (m && /\d$/.test(toks[k - 1])) { toks[k - 1] += m[1]; toks[k] = m[2]; }
  }
  return toks.filter(Boolean);
}

/* ---------- 拼音粘连拆分 ---------- */
const RHYMES = ['a', 'aeq', 'an', 'aon', 'aq', 'au', 'e', 'en', 'eq', 'er', 'eu', 'i', 'ia', 'iaeq', 'ian', 'iaon',
  'iaq', 'iau', 'ie', 'ieu', 'in', 'io', 'ioe', 'ion', 'ioq', 'iq', 'iu', 'iuq', 'o', 'oe', 'on',
  'oq', 'ou', 'u', 'ua', 'uaeq', 'uan', 'uaon', 'ue', 'uen', 'ueq', 'uoe', 'y', 'yu', 'yuq', 'iun', 'm', 'n', 'ng'];
const SYL_RE = new RegExp('^(?:' + ['gh', 'tsh', 'ph', 'th', 'kh', 'ch', 'sh', 'gn', 'ng', 'ts', 'b', 'p', 'm', 'f', 'v', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'c', 'x', 's', 'z', 'y', 'w', ''].join('|') + ')(?:' + RHYMES.join('|') + ')$');
function splitFused(syl) {
  const n = syl.length;
  const f = Array(n + 1).fill(Infinity); const bk = Array(n + 1).fill(0);
  f[0] = 0;
  for (let i = 0; i < n; i++) {
    if (f[i] === Infinity) continue;
    for (let j = i + 1; j <= Math.min(n, i + 7); j++) {
      const sub = syl.slice(i, j);
      if (!SYL_RE.test(sub)) continue;
      const fq = SYLFREQ.get(sub) || 0;
      const cost = fq ? 101 - Math.min(fq, 100) : 150;
      if (f[i] + cost < f[j]) { f[j] = f[i] + cost; bk[j] = i; }
    }
  }
  if (f[n] === Infinity) return null;
  const parts = []; let j = n;
  while (j > 0) { parts.unshift(syl.slice(bk[j], j)); j = bk[j]; }
  return parts;
}

/* ---------- 语料音节频次（用于粘连拆分消歧） ---------- */
const SYLFREQ = new Map();
for (const e of oldEnt) for (const t of e.r.split(/\s+/)) {
  const b = stripTone(t.replace(/[—…]/g, ''));
  if (b && SYL_RE.test(b)) SYLFREQ.set(b, (SYLFREQ.get(b) || 0) + 1);
}

/* ---------- 单字本调表 ---------- */
const citMap = new Map();
function addCit(ch, base, digit) {
  if (digit === null || digit === undefined) return;
  if (!citMap.has(ch)) citMap.set(ch, new Map());
  if (!citMap.get(ch).has(base)) citMap.get(ch).set(base, digit);
}
for (const e of oldEnt) {
  if (e.w.length !== 1) continue;
  const mD = e.r.match(/(\d+)$/);
  const ipaM = (e.i || '').trim().match(/(\d+(?:-\d+)*)/);
  let digit = null;
  if (mD) { const d = parseInt(mD[1], 10); digit = (d >= 1 && d <= 8) ? d : (VAL2TONE[d] || null); } // r 尾数已是调类
  if (digit === null && ipaM) digit = VAL2TONE[parseInt(ipaM[1].split('-')[0], 10)] || null;
  addCit(e.w, stripTone(e.r), digit);
}
for (const c of oldChars) {
  for (const [lab] of c.g) {
    if (!lab) continue;
    const mD = lab.match(/(\d)$/);
    if (mD) addCit(c.c, stripTone(lab), parseInt(mD[1], 10));
  }
}
function citOf(ch, base) {
  const m = citMap.get(ch);
  if (!m) return null;
  if (m.has(base)) return m.get(base);
  for (const [, v] of m) return v; // 宽松回退：仅用于调号，不用于词形确认
  return null;
}
function citExact(ch, base) {
  const m = citMap.get(ch);
  return m && m.has(base) ? m.get(base) : null;
}

/* ---------- 主流程 ---------- */
function emitR(oldToks, finals) {
  const outToks = [];
  let fi = 0;
  for (const t of oldToks) {
    if (/^[—…]+$/.test(t)) { outToks.push(t); continue; }
    const s = finals[fi++];
    if (s) outToks.push(s.paren ? '（' + s.py + (s.digit || '') + '）' : s.py + (s.digit || ''));
    else outToks.push(t);
  }
  while (fi < finals.length) { const s = finals[fi++]; outToks.push(s.paren ? '（' + s.py + (s.digit || '') + '）' : s.py + (s.digit || '')); }
  return outToks.join(' ');
}
const newEnt = [];
const st = { pyFromIpa: 0, pyOrderFix: 0, pyOldKeep: 0, pySplit: 0, toneIpa: 0, toneCit: 0, toneRush: 0, ipaCleaned: 0,
  noTone: [], ipaBlank: [], segDiff: [], sylFail: [], m1Align: 0, pyChanged: [] };
for (let i = 0; i < oldEnt.length; i++) {
  const old = oldEnt[i];
  let ipa0 = cleanIpa((old.i || '').trim());
  const rawToks = ipaToksOf(ipa0);
  const ipa = rawToks.join(' ');
  if (ipa !== (old.i || '').trim()) st.ipaCleaned++;
  const toks = rawToks.map(parseIpaTok);
  const word = old.w;
  const hanzi = [...word].filter(isHanziCh);
  const oldPyToks = old.r.split(/\s+/).filter(Boolean);
  const oldRaw = oldPyToks.filter(t => !/^[—…]+$/.test(t));
  const oldBases = oldRaw.map(t => stripTone(t));
  const parenGroups = oldPyToks.flatMap(t => [...t.matchAll(/[（(]([^\s（）()]+)[）)]/g)].map(m => m[1]));
  const target = hanzi.length;

  // 旧拼音音节序列（含粘连拆分与括号标记）
  let oldSyls = null;
  if (target && oldBases.length) {
    if (oldBases.length === target) {
      oldSyls = oldBases.map((p, k) => ({ py: p, paren: parenGroups.includes(p) }));
    } else {
      const parts = splitFused(oldBases.join(''));
      if (parts && parts.length === target) {
        oldSyls = parts.map(p => ({ py: p, paren: parenGroups.includes(p) }));
      }
    }
  }
  // IPA 反推
  let derived = null;
  if (toks.length === target && toks.every(t => t && t.seg !== undefined)) {
    const cand = toks.map(t => {
      const py = ipaSyll2Py(t.seg);
      if (py === null) return null;
      return { py, base: t.base, paren: t.paren, light: t.light };
    });
    if (cand.every(Boolean)) derived = cand;
    else st.sylFail.push(word + ' | ' + toks.map(t => t.seg).join(',') + ' | ' + old.r);
  }
  if (old.m === 1) { // 拼音係推補：保留手工修正的拼音
    derived = null;
    if (toks.length === target) st.m1Align++;
  }

  let finals = null, via = '';
  if (derived && !oldSyls) { finals = derived; via = 'ipa'; }
  else if (derived && oldSyls) {
    const eqMul = oldSyls.length === derived.length &&
      oldSyls.map(s => s.py).sort().join('\u0001') === derived.map(d => d.py).sort().join('\u0001');
    if (eqMul) { finals = derived; via = 'ipa-reorder'; st.pyOrderFix++; }
    else {
      finals = derived.map((d, k) => {
        const o = oldSyls[k].py;
        if (o && o !== d.py && SYL_RE.test(o)) {
          // 本调表能佐证反推形（该字该读音精确存在）则用反推形，否则保留旧词形
          const ch = hanzi[k] || '';
          if (citExact(ch, d.py) !== null) return d;
          return { py: o, base: d.base, paren: d.paren, light: d.light };
        }
        return d;
      });
      via = 'old';
      for (let k = 0; k < finals.length; k++) if (finals[k].py !== derived[k].py) st.segDiff.push(word + ' [' + (k + 1) + '] ' + derived[k].py + '→' + finals[k].py + ' | ' + old.r + ' | ' + ipa);
      st.pyOldKeep++;
    }
  } else if (oldSyls) {
    finals = oldSyls.map((s, k) => ({ py: s.py, base: toks[k] ? toks[k].base : null, paren: s.paren, light: toks[k] ? toks[k].light : false }));
    via = 'old';
    st.pyOldKeep++;
  }
  if (finals) {
    const rSyls = finals.map((s, k) => {
      const ch = hanzi[k] || '';
      let digit = null;
      if (s.base !== null) { digit = VAL2TONE[s.base]; if (digit !== undefined) st.toneIpa++; else digit = null; }
      if (digit === null || digit === undefined) {
        const c = citOf(ch, s.py);
        if (c) { digit = c; st.toneCit++; }
      }
      if ((digit === null || digit === undefined) && RUSHENG.test(s.py) && !s.light) {
        const [ini] = splitIni(s.py);
        digit = VOICED.has(ini) ? 8 : 7; st.toneRush++;
      }
      if ((digit === null || digit === undefined) && !s.light) st.noTone.push(word + ' | ' + s.py + ' | ' + (old.i || ''));
      // 本字调：轻声不标；优先按字精确引证，回退记録调类
      const ce = citExact(ch, s.py);
      const ctv = s.light ? '' : (ce !== null ? String(ce) : (digit ? String(digit) : ''));
      return { py: s.py, digit: digit || '', ct: ctv, paren: s.paren, light: s.light };
    });
    const newR = emitR(oldPyToks, rSyls);
    // ct 对齐 r 的 token（含装饰）
    const ctArr = [];
    let fi = 0;
    for (const t of oldPyToks) {
      if (/^[—…]+$/.test(t)) { ctArr.push(''); continue; }
      const s = rSyls[fi++];
      ctArr.push(s ? (s.ct || '') : '');
    }
    while (fi < rSyls.length) { ctArr.push(rSyls[fi++].ct || ''); }
    if (newR !== old.r) st.pyChanged.push({ w: word, a: old.r, b: newR, via });
    newEnt.push({ w: word, r: newR, i: ipa || old.i || '', d: old.d, x: old.x, m: old.m, ct: ctArr });
  } else {
    // 尽力而为：逐 token 补调（括号/装饰保形）；仅当 token 数与字数一致时才按位置查本调表
    const emitted = []; let hk = 0;
    const alignedBest = oldRaw.length === hanzi.length;
    for (const t of oldPyToks) {
      if (/^[—…]+$/.test(t)) { emitted.push(t); continue; }
      const base = stripTone(t);
      let digit = null;
      if (alignedBest) { const ch = hanzi[hk] || ''; const c = citOf(ch, base); if (c) digit = c; }
      if (digit === null && toks[hk] && toks[hk].base !== null) digit = VAL2TONE[toks[hk].base] || null;
      if ((digit === null || digit === undefined) && RUSHENG.test(base)) { const [ini] = splitIni(base); digit = VOICED.has(ini) ? 8 : 7; st.toneRush++; }
      hk++;
      if (digit !== null && digit !== undefined && /^[（(]/.test(t) && /[）)]$/.test(t)) emitted.push('（' + base + digit + '）');
      else if (digit !== null && digit !== undefined && !/[（）)]/.test(t)) emitted.push(base + digit);
      else { emitted.push(t); if (!(digit !== null && digit !== undefined)) st.noTone.push(word + ' | ' + t + ' | ' + (old.i || '')); }
    }
    const rNew = emitted.join(' ');
    if (rNew !== old.r) st.pyChanged.push({ w: word, a: old.r, b: rNew, via: 'best' });
    const ctArr = emitted.map(t => { const mD = stripTone(t).match(/(\d)$/); return mD ? mD[1] : ''; });
    newEnt.push({ w: word, r: rNew, i: ipa || old.i || '', d: old.d, x: old.x, m: old.m, ct: ctArr });
  }
  if (!(ipa && ipa.trim())) st.ipaBlank.push(word + ' | ' + old.r);
}

console.log('== 统计 ==');
console.log('音节来源: IPA反推', st.pyFromIpa, ' 仅顺序修正', st.pyOrderFix, ' 保留旧词形', st.pyOldKeep, ' 粘连拆分', st.pySplit, ' m=1对齐', st.m1Align, ' IPA清理', st.ipaCleaned);
console.log('调号来源: IPA值', st.toneIpa, ' 本调表', st.toneCit, ' 入声规则', st.toneRush);
console.log('未定调（非轻声）:', st.noTone.length); st.noTone.slice(0, 30).forEach(x => console.log('  ?', x));
console.log('IPA 空:', st.ipaBlank.length);
console.log('IPA 无法反推:', st.sylFail.length); st.sylFail.slice(0, 25).forEach(x => console.log('  ?', x));
console.log('词形保留（与反推有差异）:', st.segDiff.length); st.segDiff.slice(0, 50).forEach(x => console.log('  #', x));
const same = (a, b) => a.replace(/\d+/g, '') === b.replace(/\d+/g, '');
const structChanges = st.pyChanged.filter(x => !same(x.a, x.b));
console.log('结构性拼音改动:', structChanges.length); structChanges.slice(0, 80).forEach(x => console.log('  ⇒', x.w + ': ' + x.a + ' ⇒ ' + x.b, '[' + x.via + ']'));

/* ---------- 映射自测 ---------- */
console.log('\n== 映射自测 ==');
for (const s of ['ɦin', 'ɦy', 'ɦiən', 'ɦiɪ', 'ɦyəʔ', 'ɦyən', 'ɦuɑ̃', 'ɦuᴇ', 'ɦi', 'tsɿ', 'sʮ', 'tsʰiɪ', 'ȵi', 'əu', 'iəʔ', 'læ']) {
  console.log('  map(' + s + ') =', ipaSyll2Py(s));
}

/* ---------- 校样 ---------- */
console.log('\n== 校样 ==');
for (const w of ['拖鞋皮', '拖鞋', '水', '皮', '疻水', '老伯伯', '迷露醒', '鞋袜钿', '越剧', '疙里疙瘩', '二', '五', '鱼', '滋五十六', '葛', '紫菜', '纸头店', '工资', '搞嘴讲', '紫草叶', '推屎克螂', '老阿爹', '旅行袋', '—（搭）子', '—子（搭）', '皮夹（子）', '钩子云', '常文戏', '一迷迷', '饼馒店']) {
  const e = newEnt.find(x => x.w === w);
  if (e) console.log(' ', e.w, '|', e.r, '|', e.i);
}

/* ---------- 重建 chars ---------- */
function entrySyllables(e) {
  const hanzi = [...e.w].filter(isHanziCh);
  const toks = e.r.split(/\s+/).filter(Boolean);
  const clean = toks.filter(t => !/^[—…]+$/.test(t));
  if (clean.length !== hanzi.length) return null;
  const res = []; let ti = 0;
  for (const ch of [...e.w]) {
    if (isHanziCh(ch)) { res.push({ ch, py: clean[ti] || '' }); ti++; }
  }
  return res;
}
const charGroups = new Map();
for (let i = 0; i < newEnt.length; i++) {
  const e = newEnt[i];
  const syls = entrySyllables(e);
  if (!syls) continue;
  for (const { ch, py } of syls) {
    if (!py) continue;
    if (!charGroups.has(ch)) charGroups.set(ch, new Map());
    const gm = charGroups.get(ch);
    const base = stripTone(py);
    if (!gm.has(base)) gm.set(base, []);
    gm.get(base).push([i, py]);
  }
}
const chars = oldChars.map(c => ({ c: c.c, r: c.r || '', ipa: '', d: c.d, x: c.x, g: [] }));
for (const c of chars) {
  const gm = charGroups.get(c.c);
  const g = [];
  if (gm) {
    for (const [base, lst] of gm) {
      const idxs = [...new Set(lst.map(x => x[0]))];
      const cnt = new Map();
      for (const [, py] of lst) cnt.set(py, (cnt.get(py) || 0) + 1);
      // 偏好带调号、非括号形态，其次频次
      let best = '', bs = -1;
      for (const [py, n2] of cnt) {
        const score = (new RegExp('\\d$').test(py) ? 1000 : 0) + (/^[（(]/.test(py) ? -500 : 0) + n2;
        if (score > bs) { bs = score; best = py; }
      }
      g.push([(best || base).replace(/^[（(]|[）)]$/g, '') || base, idxs]);
    }
  } else if (c.r) {
    g.push([c.r, []]);
  }
  const own = newEnt.filter(e => e.w === c.c && e.w.length === 1);
  if (own.length === 1) c.ipa = own[0].i;
  else if (own.length > 1) {
    const base = stripTone(c.r);
    const hit = own.find(e => stripTone(e.r) === base);
    c.ipa = hit ? hit.i : '';
  }
  if (c.r && !/\d$/.test(c.r)) {
    const base = stripTone(c.r);
    const g0 = g.find(x => stripTone(x[0]) === base && /\d$/.test(x[0]));
    if (g0) c.r = g0[0];
  }
  c.g = g;
}
console.log('\n== chars 重建 ==');
console.log('字头数:', chars.length, '无读音组:', chars.filter(c => !c.g.length).length, '有 ipa:', chars.filter(c => c.ipa).length);
for (const ch of ['水', '皮', '鞋', '拖', '鱼', '复', '搭', '锥', '葛', '疻']) {
  const c = chars.find(x => x.c === ch);
  if (c) console.log(' ', ch, 'r=' + c.r, 'ipa=' + c.ipa, 'g=' + JSON.stringify(c.g.map(g => g[0] + '(' + g[1].length + ')')));
}
const parenLeft = chars.filter(function (c) { return c.g.some(function (g) { return g[0].charAt(0) === '（'; }); }).length;
console.log('　括号标签合并后残留:', parenLeft);
/* ---------- 质量复核 ---------- */
console.log('\n== 质量复核 ==');
const noDig = newEnt.filter(e => e.r.split(/\s+/).some(t => t && !/^[—…（）()]+$/.test(t) && !/\d$/.test(t.replace(/[（）()]/g, ''))));
console.log('含无调音节（多为轻声）:', noDig.length);
noDig.slice(0, 12).forEach(e => console.log('  ~', e.w, '|', e.r, '|', e.i));
const badIpa = newEnt.filter(e => /[\uE000-\uF8FF\uFFFD“”꜏▪•]/.test(e.i || ''));
console.log('IPA 残留乱码:', badIpa.length);
const digConf = [];
for (const e of newEnt) {
  for (let k = 0; k < e.r.split(/\s+/).length; k++) {
    const t = e.r.split(/\s+/)[k];
    const mD = t.match(/(\d)$/);
    if (!mD) continue;
    const tok = (e.i || '').split(/\s+/)[k];
    const mI = tok && tok.match(/^([^\d]*)(\d+(?:-\d+)*)?/);
    if (!mI || !mI[2]) continue;
    const v = VAL2TONE[parseInt(mI[2].split('-')[0], 10)];
    if (v && String(v) !== mD[1]) digConf.push(e.w + ' [' + (k + 1) + '] py:' + mD[1] + ' vs ipa:' + mI[2] + ' | ' + e.r + ' | ' + e.i);
  }
}
console.log('拼音数字 vs IPA 调值冲突:', digConf.length); digConf.slice(0, 25).forEach(x => console.log('  !', x));

/* ---------- 写文件 ---------- */
console.log = origLog;
fs.writeFileSync(path.join(root, 'tools/rebuild_report.txt'), report.join('\n'), 'utf8');
if (!DRY) {
  fs.writeFileSync(path.join(root, 'data/entries.js'), 'window.WUU_ENTRIES=' + JSON.stringify(newEnt) + ';');
  fs.writeFileSync(path.join(root, 'data/chars.js'), 'window.WUU_CHARS=' + JSON.stringify(chars) + ';');
  console.log('written entries.js / chars.js');
} else {
  console.log('DRY RUN - not written');
}

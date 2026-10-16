/* 東吳詞典 wuudict — 蘇州閑話 */
(async function () {
'use strict';

let currentUser = null;
let pendingFeedbackContext = null;
const originalEntryKeys = [];
const originalCharKeys = [];
async function api(path, options = {}) {
  const headers = { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) };
  const response = await fetch('/api' + path, { credentials: 'same-origin', ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || '请求失败，请稍后再试。');
  return data;
}
function recordKeyForEntry(list, index) {
  if (list === window.WUU_ENTRIES && originalEntryKeys[index]) return originalEntryKeys[index];
  const e = list[index];
  let ordinal = 0;
  for (let i = 0; i < index; i++) if (list[i].w === e.w && list[i].r === e.r) ordinal++;
  return e.w + '\\t' + e.r + '\\t' + ordinal;
}
function recordKeyForChar(list, index) {
  if (list === window.WUU_CHARS && originalCharKeys[index]) return originalCharKeys[index];
  return list[index].c;
}
async function loadDictionaryEdits() {
  try {
    const { edits = [] } = await api('/dictionary');
    const entries = window.WUU_ENTRIES || [], chars = window.WUU_CHARS || [];
    const byEntry = new Map(), byChar = new Map();
    entries.forEach((e, i) => { const key = recordKeyForEntry(entries, i); originalEntryKeys[i] = key; byEntry.set(key, i); });
    chars.forEach((c, i) => { originalCharKeys[i] = c.c; byChar.set(c.c, i); });
    for (const edit of edits) {
      if (edit.kind === 'entry' && byEntry.has(edit.key)) entries[byEntry.get(edit.key)] = edit.data;
      if (edit.kind === 'char' && byChar.has(edit.key)) chars[byChar.get(edit.key)] = edit.data;
    }
  } catch (err) { console.warn('词典在线覆盖未载入：', err.message); }
}
await loadDictionaryEdits();
try { currentUser = (await api('/me')).user; } catch { currentUser = null; }
async function refreshUnread() {
  const badge = document.getElementById('mailBadge');
  if (!badge) return;
  try {
    const { count } = await api('/unread');
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.hidden = !count;
  } catch { badge.hidden = true; }
}
function refreshAccountButton() {
  const button = document.getElementById('accountBtn');
  if (!button) return;
  button.textContent = currentUser ? (currentUser.nickname || currentUser.username) : '登入';
  button.title = currentUser ? `${currentUser.nickname}（${currentUser.role === 'superadmin' ? '超级管理员' : '普通用户'}）` : '登入或註冊';
}
refreshAccountButton();
refreshUnread();
setInterval(refreshUnread, 60000);

/* ---------------- 繁簡轉換 ---------------- */
const CONV = window.WUU_CONV || { s2tChars: {}, s2tPhrases: {}, t2sChars: {}, t2sPhrases: {} };
const s2tChars = CONV.s2tChars, t2sChars = CONV.t2sChars;
const s2tPhrases = Object.keys(CONV.s2tPhrases || {}).sort((a, b) => b.length - a.length);
const t2sPhrases = Object.keys(CONV.t2sPhrases || {}).sort((a, b) => b.length - a.length);

function s2t(str) {
  let s = str;
  for (const p of s2tPhrases) {
    if (s.includes(p)) s = s.split(p).join(CONV.s2tPhrases[p]);
  }
  let out = '';
  for (const ch of s) {
    out += s2tChars[ch] || ch;
  }
  return out;
}
function t2s(str) {
  let s = str;
  for (const p of t2sPhrases) {
    if (s.includes(p)) s = s.split(p).join(CONV.t2sPhrases[p]);
  }
  let out = '';
  for (const ch of s) {
    out += t2sChars[ch] || ch;
  }
  return out;
}

/* ---------------- 數據 ---------------- */
const ENTRIES = window.WUU_ENTRIES || [];
const CHARS = window.WUU_CHARS || [];
const wordMap = new Map();   // word(simplified) -> [entryIdx]
const charMap = new Map();   // char(simplified) -> charIdx
ENTRIES.forEach((e, i) => {
  if (!wordMap.has(e.w)) wordMap.set(e.w, []);
  wordMap.get(e.w).push(i);
});
CHARS.forEach((c, i) => charMap.set(c.c, i));

function isHanzi(ch) {
  const cp = ch.codePointAt(0);
  return (cp >= 0x3400 && cp <= 0x9fff) || (cp >= 0xF900 && cp <= 0xFAFF) || (cp >= 0x20000 && cp <= 0x323AF);
}
function normPy(s) {
  return s.toLowerCase().replace(/[^a-z']/g, '').replace(/'+/g, "'");
}
function pySyllables(rom) {
  return rom.toLowerCase().split(/[\s,，]+/).map(t => t.replace(/[()（）]/g, '').replace(/\d+$/g, '').trim()).filter(Boolean);
}

/* ---- 吳拼檢索：解析查询音節（支持无调/数字调/附标调） ----
   附标 → 调类（依《吴语拼音文正字法》）：
   ā(U+0304)=1　á(U+0301)=2　à(U+0300)=3　ǎ(U+030C)=5　â(U+0302)=6
   入声（-q 尾）附标不标；輕聲不标；7/8 只能用数字輸入 */
const MARK2TONE = { '\u0304': 1, '\u0301': 2, '\u0300': 3, '\u030C': 5, '\u0302': 6 };
function parseQuerySyllable(tok) {
  let t = tok.trim().toLowerCase().replace(/[()（）]/g, '');
  if (!t) return null;
  let tone = null;
  // 数字调
  const dm = t.match(/(\d)$/);
  if (dm) { tone = parseInt(dm[1], 10); t = t.slice(0, -1); }
  // 附标调：NFD 分解后找组合符
  const nfd = t.normalize('NFD');
  for (const ch of nfd) {
    if (MARK2TONE[ch] !== undefined) { tone = MARK2TONE[ch]; break; }
  }
  // 去组合符，重新合成 NFC 字符串
  let base = '';
  for (const ch of nfd) {
    if (MARK2TONE[ch] !== undefined) continue;
    base += ch;
  }
  base = base.normalize('NFC').replace(/[^a-z']/g, '').replace(/'+/g, "'");
  if (!base) return null;
  return { base, tone };
}
function parseQueryPy(q) {
  return q.split(/[\s,，]+/).map(parseQuerySyllable).filter(Boolean);
}
/* 词条/字头的音節序列：[{base, tone, light}]，tone 取记录调号（ct 可作本调佐证） */
function entrySyls(r, ct) {
  const toks = String(r || '').split(/\s+/).filter(Boolean);
  const out = [];
  toks.forEach((t, k) => {
    if (!/[a-z]/i.test(t) || /^[—…]+$/.test(t)) return;
    const m = t.match(/^([（(]*)([a-z]+)(\d*)([）),，]*)$/);
    if (!m) return;
    let tone = m[3] ? parseInt(m[3], 10) : null;
    // 本字调佐证：记录调缺失时用 ct
    if (!tone && ct && ct[k]) tone = parseInt(ct[k], 10) || null;
    out.push({ base: m[2], tone, light: !m[3] });
  });
  return out;
}
/* 音節匹配：qBase 为前缀；qTone 为空则不限调，否则须相等（4 併 6） */
function sylMatch(s, qb) {
  if (!s.base.startsWith(qb.base)) return false;
  if (qb.tone === null || qb.tone === undefined) return true;
  if (s.tone === null || s.tone === undefined) return true; // 无调记录（轻声等）不排除
  let qt = qb.tone, st = s.tone;
  if (qt === 4) qt = 6; // 阳上併阳去
  if (st === 4) st = 6;
  return qt === st;
}

/* ---------------- 聲調顯示設置 ---------------- */
let scriptMode = localStorage.getItem('wuuScript') || 't';          // 't' 繁體 / 's' 簡體
let toneStyle = localStorage.getItem('wuuToneStyle') || 'digit';    // 'digit' 調類數字 / 'mark' 聲調附標
let toneData = localStorage.getItem('wuuToneData') || 'sandhi';     // 'sandhi' 連讀變調（記錄） / 'cite' 本字調
let ipaVariety = localStorage.getItem('wuuIpaVariety') || 'mid';    // 'mid' 中派 / 'new' 新派

/* 吳語拼音文正字法（蘇州話）聲調附標：
   1 陰平 ā　2 陽平 á　3 陰上 à　5 陰去 ǎ　6 陽上去 â
   7/8 入聲以 -q 收尾，不標（陰陽對轉情形方案建議另加記號，本站從略）
   輕聲不標。
   標記位置：有a標a，無a有o標o，二者無標e，三者皆無 iuy 標尾巴，
   聲母自成音節（m n ng）標於聲母後。 */
const TONE_COMB = { 1: '\u0304', 2: '\u0301', 3: '\u0300', 5: '\u030C', 6: '\u0302' };
const TONE_SPACER = { 1: '\u02C9', 2: '\u02CA', 3: '\u02CB', 5: '\u02C7', 6: '\u02C6' };

function applyToneMark(py, digit) {
  if (!digit) return py;
  if (!TONE_COMB[digit]) return py; // 7/8 與輕聲不標
  let idx = -1;
  if (/^(?:m|n|ng)$/.test(py)) {
    idx = py.length === 2 && py[1] === 'g' ? 0 : py.length - 1; // ng 標在 n 上；m/n 標在末尾
  } else {
    idx = py.indexOf('a');
    if (idx < 0) idx = py.indexOf('o');
    if (idx < 0) idx = py.indexOf('e');
    if (idx < 0) {
      for (let k = py.length - 1; k >= 0; k--) {
        const ch = py[k];
        if (ch === 'i' || ch === 'u' || ch === 'y') { idx = k; break; }
      }
    }
  }
  if (idx < 0) return py + (TONE_SPACER[digit] || ''); // 無元音可標（純聲母音節）：用間隔符號
  return py.slice(0, idx + 1) + TONE_COMB[digit] + py.slice(idx + 1);
}

/*
 * 吴语拼音文方案的连读变调附标。
 * 1X/2X/3X/5X/6X 标首字；7X/8X 首字保留入声 -q，标后字的变调调类。
 * 三字以上词仍视为同一变调单位，非入声首字只标首字。
 */
function parsePyTokens(r, ct) {
  return String(r || '').split(/\s+/).map((t, k) => {
    if (!/[a-z]/i.test(t) || /^[—…]+$/.test(t)) return null;
    const m = t.match(/^([（(]*)([a-z]+)(\d*)([）),，]*)$/);
    if (!m) return null;
    const raw = m[3] || (ct && ct[k]) || '';
    const digit = raw ? String(raw).replace(/[^1-8].*$/, '') : '';
    return { pre: m[1], base: m[2], digit, post: m[4] };
  });
}

function sandhiInitialTone(tokens, first) {
  // 3X 是“九”等少数特字专用型；数据中明确可识别的是 cieu（九）。
  if (first === '3') return tokens[0].base === 'cieu' ? 3 : 5;
  return ({ '1': 1, '2': 2, '5': 5, '6': 6 }[first] || null);
}

function sandhiAfterTone(first, next, firstBase) {
  if (first === '7') {
    // 7XA 后 1/2/部分 3/5/6；7XB 后大部 3/5/6；7XC 后 7/8；
    // 7XD 是词汇性的个别后 5，未列入数据时按主流 7XB 处理。
    if (next === '7' || next === '8') return null;
    if (next === '1' || next === '2') return 2;
    return 3;
  }
  if (first === '8') {
    // “搿/箇”等特定字为 8XC；其余 8 调按后字分型。
    if (/^geq$/.test(firstBase)) return 1;
    if (next === '7' || next === '8') return null;
    // 8XD 是词汇性的个别后 5，未列入数据时按 8XA 主流处理。
    return 3;
  }
  return null;
}

function fmtSandhiMarks(r, ct) {
  const all = String(r || '').split(/\s+/);
  const tokens = parsePyTokens(r, ct);
  if (tokens.length < 2 || tokens.some(t => !t)) return null;
  const first = tokens[0].digit;
  if (!first) return null;
  const entering = first === '7' || first === '8';
  const firstTone = sandhiInitialTone(tokens, first);
  const out = tokens.map((t, k) => {
    let mark = null;
    if (k === 0 && !entering) mark = firstTone;
    if (entering && k > 0) mark = sandhiAfterTone(first, t.digit, tokens[0].base);
    const core = mark ? applyToneMark(t.base, mark) : t.base;
    return t.pre + core + t.post;
  });
  return out.length === all.length ? out.join(' ') : null;
}

/* 把一条拼音按当前设置格式化；ct 为本字调数字数组（可空）。 */
function fmtPy(r, ct) {
  const toks = String(r || '').split(/\s+/);
  if (toneStyle === 'mark' && toneData === 'sandhi' && toks.length >= 2) {
    const sandhi = fmtSandhiMarks(r, ct);
    if (sandhi !== null) return sandhi;
  }
  return toks.map((t, k) => {
    if (!/[a-z]/i.test(t) || /^[—…]+$/.test(t)) return t;
    const m = t.match(/^([（(]*)([a-z]+)(\d*)([）),，]*)$/);
    if (!m) return t;
    let digit = m[3];
    if (toneData === 'cite' && ct && ct[k]) digit = ct[k];
    const core = toneStyle === 'mark' ? applyToneMark(m[2], digit) : m[2] + digit;
    return m[1] + core + m[4];
  }).join(' ');
}
/* 讀音組標籤（單字引用本調） */
function fmtGroupPy(label) {
  return fmtPy(label, null);
}

/* 拼音 → IPA（依《蘇州方言詞典》聲韻調對照表），用於讀音組標籤的音標展示 */
const PY_RHYME_IPA = {
  a: 'ɑ', aeq: 'aʔ', an: 'ã', aon: 'ɑ̃', aq: 'ɑʔ', au: 'æ', e: 'ᴇ', en: 'ən', eq: 'əʔ', er: 'əl',
  eu: 'øʏ', i: 'i\u1DBD', ia: 'iɑ', iaeq: 'iaʔ', ian: 'iã', iaon: 'iɑ̃', iaq: 'iɑʔ', iau: 'iæ',
  ie: 'i', ieu: 'y', in: 'in', iun: 'yn', io: 'io', ioe: 'iø', ion: 'ioŋ', ioq: 'ioʔ', iq: 'iəʔ',
  iu: 'y\u1DBD', iuq: 'yəʔ', o: 'o', oe: 'ø', on: 'oŋ', oq: 'oʔ', ou: 'əu',
  u: 'u', ua: 'uɑ', uaeq: 'uaʔ', uan: 'uã', uaon: 'uɑ̃', ue: 'uᴇ', uen: 'uən', ueq: 'uəʔ', uoe: 'uø',
  un: 'yn', uq: 'yəʔ', y: 'ɿ', yu: 'ʮ', yuq: 'yəʔ', m: 'm̩', n: 'n̩', ng: 'ŋ̍'
};
const PY_INI_IPA = {
  ch: 'tɕʰ', tsh: 'tsʰ', ph: 'pʰ', th: 'tʰ', kh: 'kʰ', sh: 'ɕ', ts: 'ts',
  b: 'b', p: 'p', m: 'm', f: 'f', v: 'v', d: 'd', t: 't', n: 'n', l: 'l',
  g: 'ɡ', k: 'k', h: 'h', gh: 'ɦ', gn: 'ȵ', j: 'dʑ', c: 'tɕ', x: 'ɕ', s: 's', z: 'z',
  ng: 'ŋ', y: 'ɦ', w: 'ɦu'
};
/* y/w 聲母的韻母特殊映射（介音併入聲母：鍵為去 y/w 後的餘部）
   yi=[ɦiᶽ]（i 韵母含鉤）、ye=[ɦi]（ie 韵母=[i]）、yu=[ɦyᶽ]（音節 yu 韵母按 iu 處理）
   yeu=[ɦy]（ieu 韵母=[y]）、yun=[ɦyn]、yuq=[ɦyəʔ] */
const Y_RHY_IPA = {
  '': 'ɦi\u1DBD', i: 'ɦi\u1DBD', in: 'ɦin', iq: 'ɦiəʔ', ie: 'ɦi', iun: 'ɦyn', iuq: 'ɦyəʔ',
  a: 'ɦiɑ', an: 'ɦiã', aon: 'ɦiɑ̃', au: 'ɦiæ', oe: 'ɦiø', on: 'ɦioŋ', eu: 'ɦy',
  aq: 'ɦiɑʔ', aeq: 'ɦiaʔ', oq: 'ɦioʔ', e: 'ɦi', u: 'ɦy\u1DBD', uq: 'ɦyəʔ', un: 'ɦyn', yu: 'ɦy'
};
const W_RHY_IPA = {
  a: 'ɦuɑ', aon: 'ɦuɑ̃', e: 'ɦuᴇ', an: 'ɦuã', eq: 'ɦuəʔ', aeq: 'ɦuaʔ', oe: 'ɦuø', en: 'ɦuən', u: 'ɦu', wu: 'ɦu'
};
const TONE_VALUE = { 1: '55', 2: '223', 3: '51', 5: '523', 6: '31', 7: '43', 8: '23' };

function sylIpa(syl) {
  // syl: 去調號拼音音節 → IPA 段（不含調值），失敗返回 null
  if (!syl) return null;
  if (syl[0] === 'y') {
    const v = Y_RHY_IPA[syl.slice(1)];
    if (v !== undefined) return v;
  }
  if (syl[0] === 'w') {
    const v = W_RHY_IPA[syl.slice(1)];
    if (v !== undefined) return v;
  }
  for (const ini of ['ch', 'tsh', 'ph', 'th', 'kh', 'sh', 'ts', 'gh', 'gn', 'ng', 'b', 'p', 'm', 'f', 'v', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'c', 'x', 's', 'z', 'y', 'w']) {
    if (syl.startsWith(ini)) {
      const rh = syl.slice(ini.length);
      if (rh === '') return PY_RHYME_IPA[ini] !== undefined ? PY_RHYME_IPA[ini] : PY_INI_IPA[ini];
      const v = PY_RHYME_IPA[rh];
      if (v !== undefined) return (PY_INI_IPA[ini] || '') + v;
      return null;
    }
  }
  const v0 = PY_RHYME_IPA[syl];
  return v0 !== undefined ? v0 : null;
}
/* 讀音組標籤 → "段+調值"（單字引用本調） */
function groupIpa(label) {
  const m = String(label || '').match(/^([（(]*)([a-z]+)(\d*)([）)]*)$/);
  if (!m || !m[2]) return null;
  const seg = sylIpa(m[2]);
  if (seg === null) return null;
  return fmtIpa(seg + (m[3] ? (TONE_VALUE[m[3]] || '') : ''));
}

/* 新派音标：只转换显示，不改动 data 中保存的中派原始音标。 */
function fmtIpa(ipa) {
  let s = String(ipa || '');
  if (ipaVariety !== 'new') return s;
  // 先处理带韵尾/鼻化的组合，避免随后单独替换 ɑ 造成误伤。
  s = s.replace(/øʏ/g, 'ᴇi')
    .replace(/iæ/g, 'iᴇ')
    .replace(/[aɑ]ʔ/g, 'ᴀʔ')
    .replace(/[aɑ]̃/g, 'ᴀ̃')
    .replace(/iəʔ/g, 'iɪʔ')
    .replace(/yəʔ/g, 'yɪʔ')
    // 尖团合流：ts/tsh/s/z 仅在 iᶽ/yᶽ/i/y 类韵母或介音前转为团音；
    // c/ch/j/sh 在拼音到 IPA 映射时已分别生成 tɕ/tɕʰ/dʑ/ɕ，始终保留该系列。
    .replace(/(^|[\s/(·-])(tsʰ|ts|s|z)(?=(?:i(?:ᶽ|̯)?|y(?:ᶽ|̯)?|[ɥj](?:i|y)|ɦ(?:i|y)))/g, (m, boundary, ini) => {
      const palatal = { tsʰ: 'tɕʰ', ts: 'tɕ', s: 'ɕ', z: 'ʑ' };
      return boundary + palatal[ini];
    })
    // 仅剩下的 ɑ 才是普通开后元音；ɑʔ、ɑ̃ 已在前面处理。
    .replace(/ɑ(?!ʔ|̃)/g, 'ɒ')
    .replace(/[ʮ]/g, 'ɿ');
  return s;
}

/* ---------------- 顯示腳本狀態 ---------------- */
function T(str) { return scriptMode === 't' ? s2t(str) : t2s(str); }
function updToggleBtn() {
  const b = document.getElementById('scriptToggle');
  // “简”始终使用简体字形，不随页面繁简模式转换。
  b.textContent = scriptMode === 't' ? '简' : '繁';
  b.title = scriptMode === 't' ? T('當前繁體，點擊切換簡體') : T('當前簡體，點擊切換繁體');
  const ts = document.getElementById('toneStyleToggle');
  const td = document.getElementById('toneDataToggle');
  const iv = document.getElementById('ipaToggle');
  if (ts) { ts.textContent = T(toneStyle === 'digit' ? '符' : '數'); ts.title = T(toneStyle === 'digit' ? '切換為聲調符號' : '切換為聲調數字'); }
  if (td) { td.textContent = T(toneData === 'sandhi' ? '本' : '變'); td.title = T(toneData === 'sandhi' ? '切換為本字調' : '切換為連讀變調'); }
  if (iv) { iv.textContent = T(ipaVariety === 'mid' ? '新' : '中'); iv.title = T(ipaVariety === 'mid' ? '切換為新派讀音' : '切換為中派讀音'); }
}

/* 页头页脚静态文字以繁体书写：快照原文，按模式转换，避免往返失真 */
const staticOrig = new Map();
function snapshotStatic() {
  document.querySelectorAll('#topbar, #foot').forEach(root => {
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = tw.nextNode())) {
      const p = n.parentElement;
      if (p && (['scriptToggle', 'toneStyleToggle', 'toneDataToggle', 'ipaToggle'].includes(p.id) || p.tagName === 'SCRIPT' || p.tagName === 'STYLE')) continue;
      if (n.nodeValue.trim()) staticOrig.set(n, n.nodeValue);
    }
  });
  const q = document.getElementById('q');
  if (q) q.dataset.origPh = q.placeholder;
}
function applyStaticScript() {
  staticOrig.forEach((orig, n) => {
    if (!n.isConnected) return;
    n.nodeValue = scriptMode === 's' ? t2s(orig) : orig;
  });
  const q = document.getElementById('q');
  if (q && q.dataset.origPh) q.placeholder = scriptMode === 's' ? t2s(q.dataset.origPh) : q.dataset.origPh;
}

/* ---------------- 工具 ---------------- */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

/* 把一段文本轉爲 DOM：漢字鏈接到字頭頁，～ 仍鏈接回詞條 */
function appendLinkedText(frag, text) {
  for (const ch of text) {
    if (isHanzi(ch) && charMap.has(ch)) {
      const a = el('a', 'char-link', scriptMode === 't' ? (s2tChars[ch] || ch) : ch);
      a.href = '#/c/' + encodeURIComponent(ch);
      frag.appendChild(a);
    } else {
      frag.appendChild(document.createTextNode(scriptMode === 't' ? s2t(ch) : ch));
    }
  }
}
function richText(text, headword, linkChars = true) {
  const frag = document.createDocumentFragment();
  const parts = text.split('～');
  parts.forEach((p, i) => {
    if (i > 0) {
      if (headword && linkChars) {
        const a = el('a', 'tilde', T(headword));
        a.href = '#/w/' + encodeURIComponent(headword);
        frag.appendChild(a);
      } else if (headword) {
        frag.appendChild(document.createTextNode(T(headword)));
      } else {
        frag.appendChild(el('span', 'tilde', '～'));
      }
    }
    if (p) {
      if (linkChars) appendLinkedText(frag, p);
      else frag.appendChild(document.createTextNode(T(p)));
    }
  });
  return frag;
}

/* 詞頭：每個漢字變成可點鏈接（鏈接 id 用簡體字） */
function wordWithLinks(word) {
  const frag = document.createDocumentFragment();
  appendLinkedText(frag, word);
  return frag;
}

/* 拼音 + 音標行 */
function pyRow(e, opts) {
  const r = el('div');
  r.appendChild(el('span', 'py', fmtPy(e.r, e.ct)));
  if (opts && opts.showTag && e.m === 1) r.appendChild(el('span', 'tag', T('拼音係推補')));
  if (e.i && e.i.trim()) r.appendChild(el('span', 'ipa', '/' + fmtIpa(e.i.trim()) + '/'));
  return r;
}

/* ---------------- 視圖 ---------------- */
const main = document.getElementById('main');

function viewHome() {
  main.innerHTML = '';
  const pane = el('div', 'pane');
  pane.appendChild(el('div', 'home-title', T('蘇州閑話')));
  pane.appendChild(el('div', 'home-sub', T('吳語·蘇州話詞典 —— 依據叶祥苓《蘇州方言詞典》（現代漢語方言大詞典分卷，江蘇教育出版社）詞典正文編成，注音採用吳語學堂式拼音，聲調以 1–8 調類數字標注。')));
  const stats = el('div', 'stat-row');
  const mk = (n, label) => { const d = el('div', 'stat'); d.appendChild(el('b', '', String(n))); d.appendChild(el('span', '', label)); return d; };
  stats.appendChild(mk(ENTRIES.length, T('詞條')));
  stats.appendChild(mk(CHARS.length, T('字頭')));
  stats.appendChild(mk(CHARS.filter(c => c.d.length).length, T('有釋義的字頭')));
  pane.appendChild(stats);
  main.appendChild(pane);

  const box = el('div', 'pane random-box');
  box.appendChild(el('div', '', T('隨便翻翻')));
  const idx = Math.floor(Math.random() * ENTRIES.length);
  const e = ENTRIES[idx];
  const a = el('a', 'random-word', T(e.w));
  a.href = '#/w/' + encodeURIComponent(e.w);
  box.appendChild(a);
  const rp = el('div', 'random-py');
  rp.appendChild(el('span', 'py', fmtPy(e.r, e.ct)));
  if (e.i && e.i.trim()) rp.appendChild(el('span', 'ipa', '/' + fmtIpa(e.i.trim()) + '/'));
  box.appendChild(rp);
  const again = el('button', 'tool-btn', T('再來一個'));
  again.onclick = () => { location.hash = '#/home'; setTimeout(viewHome, 0); };
  box.appendChild(el('div', '')).appendChild(again);
  main.appendChild(box);

  const tip = el('div', 'pane');
  tip.appendChild(el('h3', '', T('使用說明')));
  const ul = el('ul');
  const li1 = el('li'); li1.innerHTML = T('詞條正文中每個漢字均可點擊，跳至對應單字條目；單字條目下按讀音列出含有該字的詞語。');
  const li2 = el('li'); li2.innerHTML = T('支持繁體、簡體、吳語拼音三種檢索，全站默認顯示繁體；右上角可切換簡體、聲調表示法、連讀依據與讀音派別。');
  ul.appendChild(li1); ul.appendChild(li2);
  tip.appendChild(ul);
  main.appendChild(tip);
  document.title = T('東吳詞典');
}

/* ---------- 檢索 ---------- */
function searchEntries(q, mode) {
  // 返回 {exact:[], prefix:[], contains:[], defs:[]}
  const res = { exact: [], prefix: [], contains: [], defs: [] };
  if (mode === 'py') {
    const qs = parseQueryPy(q);
    if (!qs.length) return res;
    for (let i = 0; i < ENTRIES.length; i++) {
      const e = ENTRIES[i];
      const syls = entrySyls(e.r, e.ct);
      if (!syls.length) continue;
      let ok = syls.length >= qs.length;
      for (let j = 0; j < qs.length && ok; j++) {
        if (!sylMatch(syls[j], qs[j])) ok = false;
      }
      if (!ok) continue;
      if (syls.length === qs.length) res.exact.push(i); else res.prefix.push(i);
    }
    return res;
  }
  const qS = t2s(q.trim());
  for (let i = 0; i < ENTRIES.length; i++) {
    const w = ENTRIES[i].w;
    if (w === qS) res.exact.push(i);
    else if (w.startsWith(qS)) res.prefix.push(i);
    else if (w.includes(qS)) res.contains.push(i);
  }
  if (res.exact.length + res.prefix.length + res.contains.length < 30) {
    for (let i = 0; i < ENTRIES.length; i++) {
      if (res.exact.includes(i) || res.prefix.includes(i) || res.contains.includes(i)) continue;
      for (const d of ENTRIES[i].d) {
        if (d.includes(qS)) { res.defs.push(i); break; }
      }
    }
  }
  return res;
}

function searchChars(q, mode) {
  const out = [];
  if (mode === 'py') {
    const qs = parseQueryPy(q);
    if (!qs.length) return out;
    for (const c of CHARS) {
      const cands = [];
      if (c.r) cands.push(entrySyls(c.r, null)[0]);
      for (const g of c.g) if (g[0]) cands.push(entrySyls(g[0], null)[0]);
      let hit = false;
      for (const s of cands) {
        if (s && sylMatch(s, qs[0])) { hit = true; break; }
      }
      if (hit) { out.push(c); if (out.length > 100) break; }
    }
    return out;
  }
  const qS = t2s(q.trim());
  if (qS.length === 1) {
    const c = charMap.get(qS);
    if (c !== undefined) out.push(CHARS[c]);
  }
  if (!out.length) {
    for (const c of CHARS) {
      if (t2s(c.c).includes(qS) || c.c.includes(qS)) { out.push(c); if (out.length > 50) break; }
    }
  }
  return out;
}

function defSnippet(e) {
  const d = e.d && e.d[0] ? e.d[0] : '';
  return d.length > 46 ? d.slice(0, 46) + '…' : d;
}

function viewSearch(q, mode) {
  main.innerHTML = '';
  const wrap = el('div');
  // 字頭結果
  const charsFound = searchChars(q, mode === 'auto' ? guessMode(q) : mode);
  const entryRes = searchEntries(q, mode === 'auto' ? guessMode(q) : mode);
  const useMode = mode === 'auto' ? guessMode(q) : mode;

  if (useMode !== 'py' && charsFound.length) {
    wrap.appendChild(el('div', 'group-head', T('單字')));
    const box = el('div', 'char-list');
    for (const c of charsFound.slice(0, 60)) {
      const a = el('a', '', scriptMode === 't' ? (s2tChars[c.c] || c.c) : c.c);
      a.href = '#/c/' + encodeURIComponent(c.c);
      a.title = c.r ? fmtPy(c.r, null) : '';
      box.appendChild(a);
    }
    wrap.appendChild(box);
  }
  const total = entryRes.exact.length + entryRes.prefix.length + entryRes.contains.length;
  if (!total && !charsFound.length && !entryRes.defs.length) {
    main.appendChild(wrap);
    main.appendChild(el('div', 'empty-tip', T('查無「' + q + '」相關詞條。')));
    return;
  }
  const ordered = [...entryRes.exact, ...entryRes.prefix, ...entryRes.contains];
  const LABELS = [[entryRes.exact, T('完全相符')], [entryRes.prefix, T('詞首相符')], [entryRes.contains, T('包含該詞')]];
  let shown = 0;
  const LIMIT = 120;
  for (const [list, label] of LABELS) {
    if (!list.length) continue;
    wrap.appendChild(el('div', 'group-head', label + '（' + list.length + '）'));
    for (const i of list) {
      if (shown >= LIMIT) break;
      wrap.appendChild(resultRow(i));
      shown++;
    }
    if (shown >= LIMIT) break;
  }
  if (shown >= LIMIT) {
    const more = el('button', 'tool-btn more-btn', T('結果過多，僅顯示部分，請細化檢索詞'));
    more.disabled = true;
    wrap.appendChild(more);
  }
  if (entryRes.defs.length) {
    wrap.appendChild(el('div', 'group-head', T('釋義含此詞') + '（' + entryRes.defs.length + '）'));
    for (const i of entryRes.defs.slice(0, 40)) wrap.appendChild(resultRow(i));
  }
  main.appendChild(wrap);
}

function resultRow(i) {
  const e = ENTRIES[i];
  const div = el('div', 'result');
  const line = el('div');
  const a = el('a', 'rw');
  a.href = '#/w/' + encodeURIComponent(e.w);
  a.textContent = T(e.w);
  line.appendChild(a);
  line.appendChild(el('span', 'rpy', fmtPy(e.r, e.ct)));
  div.appendChild(line);
  if (e.d.length) div.appendChild(el('div', 'rdef', T(defSnippet(e))));
  return div;
}

function guessMode(q) {
  // 去掉声调数字与附标组合符后为纯拉丁字母（含隔音'）判为吳拼
  const stripped = q.trim()
    .normalize('NFD').replace(/[\u0300-\u036F]/g, '')
    .replace(/\d/g, '').replace(/[\s,，]/g, '');
  if (/^[a-z']+$/.test(stripped) && /[a-z]/.test(stripped)) return 'py';
  return 'hanzi';
}

/* ---------- 詞條頁 ---------- */
function viewEntry(word) {
  const idxs = wordMap.get(word);
  main.innerHTML = '';
  if (!idxs) { main.appendChild(el('div', 'empty-tip', T('查無此詞：' + word))); return; }
  const pane = el('div', 'pane');
  const head = el('div', 'entry-head');
  head.appendChild(el('div', 'entry-word')).appendChild(wordWithLinks(word));
  pane.appendChild(head);
  idxs.forEach((i, n) => {
    const e = ENTRIES[i];
    const sec = el('div', 'reading');
    if (idxs.length > 1) sec.appendChild(el('div', '', T('【' + '一二三四五六七八'[n] + '】')));
    sec.appendChild(pyRow(e, { showTag: true }));
    const ol = el('ul', 'defs');
    for (const d of e.d) {
      const li = el('li');
      li.appendChild(richText(d, word, false));
      ol.appendChild(li);
    }
    sec.appendChild(ol);
    for (const x of e.x) {
      const ex = el('div', 'ex');
      ex.appendChild(richText(x, word));
      sec.appendChild(ex);
    }
    addRecordActions(sec, 'entry', word, e, i);
    pane.appendChild(sec);
  });
  main.appendChild(pane);
  document.title = T(word) + ' — 東吳詞典';
}

/* ---------- 字條頁 ---------- */
function viewChar(ch) {
  const ci = charMap.get(ch);
  main.innerHTML = '';
  if (ci === undefined) { main.appendChild(el('div', 'empty-tip', T('查無此字：' + ch))); return; }
  const c = CHARS[ci];
  const pane = el('div', 'pane');
  const head = el('div', 'char-head');
  const left = el('div');
  left.appendChild(el('div', 'char-big', scriptMode === 't' ? (s2tChars[c.c] || c.c) : c.c));
  head.appendChild(left);
  const right = el('div');
  if (c.r) {
    const r = el('div', 'reading');
    r.appendChild(el('span', 'py', fmtPy(c.r, null)));
    const ipa = c.ipa && c.ipa.trim() ? c.ipa.trim() : (groupIpa(c.r) || '');
    if (ipa) r.appendChild(el('span', 'ipa', '/' + fmtIpa(ipa) + '/'));
    right.appendChild(r);
  }
  if (c.d.length) {
    const ol = el('ul', 'defs');
    for (const d of c.d) {
      const li = el('li');
      li.appendChild(richText(d, ch, false));
      ol.appendChild(li);
    }
    right.appendChild(ol);
  } else {
    right.appendChild(el('div', 'pinyin-note', c.r ? T('本詞典未收此字單獨釋義，下面按讀音列出含此字的詞語。') : T('本詞典未收此字單獨條目，下面列出含此字的詞語。')));
  }
  if (Array.isArray(c.x) && c.x.length) {
    const examples = el('div', 'char-examples');
    examples.appendChild(el('h4', 'group-head', T('例句')));
    for (const text of c.x) { const ex = el('div', 'ex'); ex.appendChild(richText(text, ch)); examples.appendChild(ex); }
    right.appendChild(examples);
  }
  head.appendChild(right);
  pane.appendChild(head);

  if (c.g.length) {
    for (const [label, words] of c.g) {
      const g = el('div', 'reading-group');
      const h4 = el('h4', '', label ? T('讀音：') : T('讀音待考'));
      if (label) {
        h4.appendChild(el('span', 'py gpy', fmtGroupPy(label)));
        const gi = groupIpa(label);
        if (gi) h4.appendChild(el('span', 'ipa gipa', '/' + fmtIpa(gi) + '/'));
      }
      g.appendChild(h4);
      const box = el('div');
      // 去重 & 排序：按詞長
      const uniq = [...new Set(words)];
      uniq.sort((a, b) => ENTRIES[a].w.length - ENTRIES[b].w.length || a - b);
      for (const wi of uniq) {
        const e = ENTRIES[wi];
        const a = el('a', 'word-chip');
        a.href = '#/w/' + encodeURIComponent(e.w);
        a.appendChild(document.createTextNode(scriptMode === 't' ? s2t(e.w) : e.w));
        box.appendChild(a);
      }
      g.appendChild(box);
      pane.appendChild(g);
    }
  } else {
    pane.appendChild(el('div', 'empty-tip', T('暫無含此字的多字詞條。')));
  }
  addRecordActions(pane, 'char', c.c, c, ci);
  main.appendChild(pane);
  document.title = T(ch) + ' — 東吳詞典';
}

/* ---------- 音序索引 ---------- */
function viewIndex() {
  main.innerHTML = '';
  const pane = el('div', 'pane');
  pane.appendChild(el('h2', '', T('音序索引')));
  pane.appendChild(el('div', 'pinyin-note', T('按字頭吳語拼音首字母排列（無讀音者列於末尾）。')));
  const byLetter = new Map();
  for (const c of CHARS) {
    const base = normPy(c.r || (c.g.find(g => g[0]) || ['', ''])[0]);
    const L = base ? base[0].toUpperCase() : '#';
    if (!byLetter.has(L)) byLetter.set(L, []);
    byLetter.get(L).push(c);
  }
  const letters = [...byLetter.keys()].sort((a, b) => a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b));
  const grid = el('div', 'idx-grid');
  for (const L of letters) {
    const a = el('a', 'idx-letter', L);
    a.href = '#/idx/' + L;
    grid.appendChild(a);
  }
  pane.appendChild(grid);
  main.appendChild(pane);
  document.title = T('音序索引 — 東吳詞典');
}

function viewIndexLetter(L) {
  main.innerHTML = '';
  const pane = el('div', 'pane');
  const back = el('a', '', T('← 全部字母'));
  back.href = '#/idx';
  pane.appendChild(back);
  pane.appendChild(el('h2', '', L === '#' ? T('其他') : L));
  const box = el('div', 'char-list');
  for (const c of CHARS) {
    const base = normPy(c.r || (c.g.find(g => g[0]) || ['', ''])[0]);
    const l = base ? base[0].toUpperCase() : '#';
    if (l !== L) continue;
    const a = el('a', '', scriptMode === 't' ? (s2tChars[c.c] || c.c) : c.c);
    a.href = '#/c/' + encodeURIComponent(c.c);
    a.title = c.r ? fmtPy(c.r, null) : '';
    box.appendChild(a);
  }
  pane.appendChild(box);
  main.appendChild(pane);
  document.title = L === '#' ? T('其他 — 東吳詞典') : L + ' — 東吳詞典';
}

/* ---------- 設置 ---------- */
function radioOpt(group, name, value, label, cur, onchange) {
  const lab = el('label', 'opt-item' + (cur === value ? ' checked' : ''));
  lab.dataset.value = value; lab.dataset.name = name;
  const dot = el('span', 'opt-dot');            // 自绘單選按鈕
  const txt = el('span', 'opt-text', label);
  lab.appendChild(dot); lab.appendChild(txt);
  if (cur === value) lab.classList.add('checked');
  lab.onclick = ev => {
    ev.preventDefault();
    if (lab.classList.contains('checked')) return;
    // 同組互斥
    group.querySelectorAll('.opt-item[data-name="' + name + '"]').forEach(x => x.classList.remove('checked'));
    lab.classList.add('checked');
    onchange();
  };
  group.appendChild(lab);
}

function viewSettings() {
  main.innerHTML = '';
  const pane = el('div', 'pane settings');
  pane.appendChild(el('h2', '', T('顯示設置')));

  pane.appendChild(el('h3', '', T('吳語拼音聲調表示法')));
  const g1 = el('div', 'opt-group');
  radioOpt(g1, 'toneStyle', 'digit', T('調類數字 —— 綴於音節之後標 1–8（1 陰平 55、2 陽平 223、3 陰上 51、5 陰去 523、6 陽上去 231、7 陰入 43、8 陽入 23；陽上併陽去，故無 4）'), toneStyle === 'digit', () => setTone('toneStyle', 'digit'));
  radioOpt(g1, 'toneStyle', 'mark', T('聲調附標 —— 依《吳語拼音文正字法》：ā á à ǎ â 分標 1/2/3/5/6 調，入聲（-q 尾）不標，輕聲不標'), toneStyle === 'mark', () => setTone('toneStyle', 'mark'));
  pane.appendChild(g1);

  pane.appendChild(el('h3', '', T('聲調依據')));
  const g2 = el('div', 'opt-group');
  radioOpt(g2, 'toneData', 'sandhi', T('連讀變調 —— 按《吳語拼音文方案》1X–8XC 規則重拼多字詞（推薦）'), toneData === 'sandhi', () => setTone('toneData', 'sandhi'));
  radioOpt(g2, 'toneData', 'cite', T('本字調 —— 各字按其單字調（引用調）標注'), toneData === 'cite', () => setTone('toneData', 'cite'));
  pane.appendChild(g2);

  pane.appendChild(el('h3', '', T('讀音')));
  const g3 = el('div', 'opt-group');
  radioOpt(g3, 'ipaVariety', 'mid', T('中派 —— 保留目前音標讀音'), ipaVariety === 'mid', () => setTone('ipaVariety', 'mid'));
  radioOpt(g3, 'ipaVariety', 'new', T('新派 —— øʏ→ᴇi、iæ→iᴇ、鸭压/打党不分、尖团不分、司书不分等'), ipaVariety === 'new', () => setTone('ipaVariety', 'new'));
  pane.appendChild(g3);

  // 即時示例
  const demo = el('div', 'demo-box');
  demo.appendChild(el('div', 'demo-head', T('示例：')));
  for (const w of ['拖鞋皮', '滋味', '疙里疙瘩', '纸头店']) {
    const idxs = wordMap.get(w);
    if (!idxs) continue;
    const e = ENTRIES[idxs[0]];
    const row = el('div', 'demo-row');
    const a = el('a', 'rw', T(e.w));
    a.href = '#/w/' + encodeURIComponent(e.w);
    row.appendChild(a);
    row.appendChild(el('span', 'py demo-py', fmtPy(e.r, e.ct)));
    if (e.i && e.i.trim()) row.appendChild(el('span', 'ipa', '/' + fmtIpa(e.i.trim()) + '/'));
    demo.appendChild(row);
  }
  pane.appendChild(demo);
  pane.appendChild(el('p', 'pinyin-note', T('設置即改即存（瀏覽器本地）。國際音標一律保留吳語學堂記錄的調值（含連讀變調），不受以上選項影響。')));
  main.appendChild(pane);
  document.title = T('設置 — 東吳詞典');
}

function setTone(key, val) {
  if (key === 'toneStyle') toneStyle = val;
  else if (key === 'toneData') toneData = val;
  else ipaVariety = val;
  const storageKey = key === 'toneStyle' ? 'wuuToneStyle' : key === 'toneData' ? 'wuuToneData' : 'wuuIpaVariety';
  localStorage.setItem(storageKey, val);
  updToggleBtn();
  // 三个快捷开关都影响当前页面显示，统一重绘当前路由。
  route();
  return;
  // 原位更新設置頁示例，不整頁重繪（避免單選按鈕狀態閃空）
  const pane = main.querySelector('.settings');
  if (pane) {
    const demo = pane.querySelector('.demo-box');
    if (demo) {
      demo.querySelectorAll('.demo-row').forEach(row => {
        const a = row.querySelector('a.rw');
        if (!a) return;
        const m = a.getAttribute('href').match(/^#\/w\/(.+)$/);
        if (!m) return;
        const ee = (wordMap.get(decodeURIComponent(m[1])) || [])[0];
        if (ee === undefined) return;
        let py = row.querySelector('.demo-py');
        if (!py) { py = el('span', 'py demo-py'); row.appendChild(py); }
        py.textContent = fmtPy(ENTRIES[ee].r, ENTRIES[ee].ct);
      });
    }
  }
}

/* ---------- 關於 ---------- */
function viewAbout() {
  main.innerHTML = '';
  const pane = el('div', 'pane about');
  pane.appendChild(el('h2', '', T('關於東吳詞典')));
  pane.appendChild(el('p', '', T('《東吳詞典》（wuudict）是一個吳語在線詞典，現開設「蘇州閑話」板塊，以後擬陸續增加其他方言點。')));
  pane.appendChild(el('h3', '', T('詞庫來源')));
  pane.appendChild(el('p', '', T('詞條、釋義同例句，依據叶祥苓《蘇州方言詞典》（《現代漢語方言大詞典》分卷，江蘇教育出版社 1993）詞典正文（約 8400 條）整理錄入。')));
  pane.appendChild(el('h3', '', T('注音方案')));
  pane.appendChild(el('p', '', T('採用吳語學堂式拼音（蘇州話）。全站拼音一律帶調，聲調以調類數字表示，綴於音節之後；可用頁頭右上角按鈕切換聲調數字／附標、連讀變調／本字調及中派／新派讀音。')));
  const tbl = el('table');
  tbl.innerHTML = T('<tr><th>調類</th><th>1 陰平</th><th>2 陽平</th><th>3 陰上</th><th>5 陰去</th><th>6 陽上去</th><th>7 陰入</th><th>8 陽入</th></tr>' +
    '<tr><th>調值</th><td>55</td><td>223</td><td>51</td><td>523</td><td>231</td><td>43</td><td>23</td></tr>' +
    '<tr><th>數字</th><td>-1</td><td>-2</td><td>-3</td><td>-5</td><td>-6</td><td>-7</td><td>-8</td></tr>' +
    '<tr><th>附標</th><td>ā</td><td>á</td><td>à</td><td>ǎ</td><td>â</td><td>-q（不標）</td><td>-q（不標）</td></tr>');
  pane.appendChild(tbl);
  pane.appendChild(el('p', '', T('蘇州話陽上併入陽去，故無第 4 調；輕聲（音標中以 · 表示）不標調。右上角可選擇按《吳語拼音文方案》1X–8XC 規則重拼連讀變調，抑或按各字本調顯示。')));
  pane.appendChild(el('p', '', T('音標（IPA）一律依《蘇州方言詞典》聲韻調對照表標注，聲調保留吳語學堂記錄的調值與連讀變調。')));
  pane.appendChild(el('h3', '', T('檢索說明')));
  const ul = el('ul');
  for (const s of [
    '繁體檢索：輸入繁體字，自動轉爲簡體後查詞。',
    '簡體檢索：直接以簡體查詞。',
    '吳語拼音檢索：輸入吳拼音節（如 tsyu、ghou、thie），支持音節前綴匹配，聲調數字可省略。',
    '自動模式：純拉丁字母判爲吳拼，其餘判爲漢字。',
  ]) { const li = el('li'); li.textContent = T(s); ul.appendChild(li); }
  pane.appendChild(ul);
  pane.appendChild(el('h3', '', T('鳴謝')));
  pane.appendChild(el('p', '', T('詞庫電子文本參考了吳語學堂（wugniu.com）社區志願者整理錄入的蘇州閒話詞典數據；繁簡轉換採用 OpenCC 詞表。特此致謝。')));
  main.appendChild(pane);
  document.title = T('關於 — 東吳詞典');
}

/* ---------- 帳戶、信箱與管理員 ---------- */
let inboxTab = 'messages';
let selectedThreadId = null;
let composeNewFeedback = false;
function setUser(user) {
  currentUser = user;
  refreshAccountButton(); refreshUnread();
}
function actionButton(label, handler, kind = '') {
  const b = el('button', 'action-btn' + (kind ? ' ' + kind : ''), label);
  b.type = 'button'; b.addEventListener('click', handler); return b;
}
function openRecordEditor(type, record, entryIndex) {
  const isEntry = type === 'entry';
  const overlay = el('div', 'wuu-editor-overlay');
  overlay.setAttribute('role', 'presentation');
  const dialog = el('section', 'wuu-editor-dialog');
  dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'wuuEditorTitle');
  const header = el('header', 'wuu-editor-header');
  const heading = el('div');
  heading.append(el('h2', '', isEntry ? '编辑词条' : '编辑字头'), el('p', 'notice', '修改内容会作为在线词典覆盖保存。'));
  const closeBtn = el('button', 'wuu-editor-close', '×');
  closeBtn.type = 'button'; closeBtn.setAttribute('aria-label', '关闭编辑器');
  header.append(heading, closeBtn);
  const title = heading.querySelector('h2'); title.id = 'wuuEditorTitle';
  const tabs = el('div', 'wuu-editor-tabs');
  const editTab = el('button', 'wuu-editor-tab active', '编辑');
  const previewTab = el('button', 'wuu-editor-tab', '预览');
  editTab.type = previewTab.type = 'button';
  tabs.append(editTab, previewTab);
  const body = el('div', 'wuu-editor-body');
  const editPane = el('div', 'wuu-editor-form');
  const previewPane = el('article', 'wuu-editor-preview'); previewPane.hidden = true;
  const fields = {};
  const makeField = (label, key, value, hint = '') => {
    const wrap = el('label', 'wuu-editor-field');
    wrap.appendChild(el('span', 'wuu-editor-label', label));
    const input = el('input', 'wuu-editor-input'); input.type = 'text'; input.value = value == null ? '' : String(value);
    input.autocomplete = 'off'; wrap.appendChild(input);
    if (hint) wrap.appendChild(el('small', 'wuu-editor-hint', hint));
    editPane.appendChild(wrap); fields[key] = input; return input;
  };
  makeField(isEntry ? '词头' : '字头', isEntry ? 'w' : 'c', isEntry ? record.w : record.c);
  makeField('吴语拼音', 'r', record.r || '', '按词典原有格式填写，例如：tsy1 syu1');
  makeField('国际音标（IPA）', isEntry ? 'i' : 'ipa', isEntry ? (record.i || '') : (record.ipa || ''), '可留空；多个音节之间以空格分隔');

  const makeListEditor = (key, label, values) => {
    const section = el('section', 'wuu-editor-list-section');
    const sectionHead = el('div', 'wuu-editor-section-head');
    sectionHead.append(el('h3', '', label), el('span', 'wuu-editor-count'));
    const list = el('div', 'wuu-editor-list');
    const add = el('button', 'wuu-editor-add', '+ 添加' + label);
    add.type = 'button';
    const rows = [];
    const refreshCount = () => { sectionHead.querySelector('.wuu-editor-count').textContent = `${rows.filter(r => r.input.value.trim()).length} 项`; };
    const addRow = value => {
      const row = el('div', 'wuu-editor-item');
      const input = el('textarea', 'wuu-editor-textarea'); input.rows = 2; input.value = value == null ? '' : String(value);
      input.setAttribute('aria-label', label + '内容');
      const remove = el('button', 'wuu-editor-remove', '移除'); remove.type = 'button';
      row.append(input, remove); list.appendChild(row); rows.push({ input, row });
      input.addEventListener('input', refreshCount);
      const item = rows[rows.length - 1];
      remove.addEventListener('click', () => { row.remove(); rows.splice(rows.indexOf(item), 1); refreshCount(); updatePreview(); });
      refreshCount();
    };
    (Array.isArray(values) ? values : []).forEach(addRow);
    add.addEventListener('click', () => { addRow(''); const last = rows[rows.length - 1]; last.input.focus(); updatePreview(); });
    sectionHead.appendChild(add);
    section.append(sectionHead, list); editPane.appendChild(section);
    fields[key] = { rows, addRow };
  };
  makeListEditor('d', '释义', record.d);
  makeListEditor('x', '例句', record.x);
  const toolbar = el('div', 'wuu-editor-toolbar');
  toolbar.append(el('span', 'wuu-editor-hint', '快速添加：'));
  const addMeaning = el('button', 'wuu-editor-tool', '+ 释义'); addMeaning.type = 'button';
  const addExample = el('button', 'wuu-editor-tool', '+ 例句'); addExample.type = 'button';
  toolbar.append(addMeaning, addExample);
  editPane.insertBefore(toolbar, editPane.children[3]);
  addMeaning.addEventListener('click', () => { fields.d.addRow(''); fields.d.rows.at(-1).input.focus(); });
  addExample.addEventListener('click', () => { fields.x.addRow(''); fields.x.rows.at(-1).input.focus(); });

  const getEditedRecord = () => {
    const next = { ...record };
    if (isEntry) next.w = fields.w.value.trim(); else next.c = fields.c.value.trim();
    next.r = fields.r.value.trim();
    if (isEntry) next.i = fields.i.value.trim(); else next.ipa = fields.ipa.value.trim();
    next.d = fields.d.rows.map(r => r.input.value.trim()).filter(Boolean);
    next.x = fields.x.rows.map(r => r.input.value.trim()).filter(Boolean);
    return next;
  };
  function updatePreview() {
    previewPane.replaceChildren();
    const data = getEditedRecord();
    previewPane.appendChild(el('h2', 'wuu-preview-word', isEntry ? data.w : data.c));
    const reading = el('p', 'wuu-preview-reading');
    if (data.r) reading.appendChild(el('span', 'py', data.r));
    const ipa = isEntry ? data.i : data.ipa;
    if (ipa) reading.appendChild(el('span', 'ipa', '/' + ipa + '/'));
    if (reading.childNodes.length) previewPane.appendChild(reading);
    if (data.d.length) {
      previewPane.appendChild(el('h3', '', '释义'));
      const defs = el('ol', 'wuu-preview-list');
      data.d.forEach(text => { const li = el('li'); li.textContent = text; defs.appendChild(li); });
      previewPane.appendChild(defs);
    }
    if (data.x.length) {
      previewPane.appendChild(el('h3', '', '例句'));
      const examples = el('ul', 'wuu-preview-list wuu-preview-examples');
      data.x.forEach(text => { const li = el('li'); li.textContent = text; examples.appendChild(li); });
      previewPane.appendChild(examples);
    }
    if (!data.d.length && !data.x.length) previewPane.appendChild(el('p', 'notice', '暂无释义或例句。'));
  }
  const setTab = isPreview => {
    editPane.hidden = isPreview; previewPane.hidden = !isPreview;
    editTab.classList.toggle('active', !isPreview); previewTab.classList.toggle('active', isPreview);
    if (isPreview) updatePreview();
  };
  editTab.addEventListener('click', () => setTab(false));
  previewTab.addEventListener('click', () => setTab(true));
  editPane.addEventListener('input', updatePreview);
  body.append(editPane, previewPane);
  const footer = el('footer', 'wuu-editor-footer');
  const status = el('span', 'wuu-editor-status', '所有修改保存后立即应用。');
  const cancel = el('button', 'action-btn secondary', '取消'); cancel.type = 'button';
  const save = el('button', 'action-btn', '保存更改'); save.type = 'button';
  const footerActions = el('div', 'wuu-editor-actions'); footerActions.append(cancel, save);
  footer.append(status, footerActions);
  dialog.append(header, tabs, body, footer); overlay.appendChild(dialog); document.body.appendChild(overlay);
  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKeyDown); };
  const onKeyDown = event => { if (event.key === 'Escape') close(); };
  closeBtn.addEventListener('click', close); cancel.addEventListener('click', close);
  overlay.addEventListener('mousedown', event => { if (event.target === overlay) close(); });
  document.addEventListener('keydown', onKeyDown);
  save.addEventListener('click', async () => {
    const edited = getEditedRecord();
    if (!(isEntry ? edited.w : edited.c)) { status.textContent = '词头不能为空。'; status.classList.add('error'); return; }
    save.disabled = true; status.classList.remove('error'); status.textContent = '正在保存…';
    const key = isEntry ? recordKeyForEntry(ENTRIES, entryIndex) : recordKeyForChar(CHARS, entryIndex);
    try {
      await api('/admin/dictionary', { method: 'POST', body: JSON.stringify({ kind: type, key, record: edited }) });
      status.textContent = '保存成功，正在重新载入词典…'; location.reload();
    } catch (err) { status.textContent = err.message; status.classList.add('error'); save.disabled = false; }
  });
  const firstInput = editPane.querySelector('input'); if (firstInput) firstInput.focus();
}
function addRecordActions(parent, type, value, record, entryIndex) {
  const row = el('div', 'action-row edit-feedback');
  row.appendChild(actionButton('✉ 反馈此' + (type === 'entry' ? '词条' : '字头'), () => {
    pendingFeedbackContext = { type, value };
    composeNewFeedback = true;
    location.hash = '#/mail';
  }, 'secondary'));
  if (currentUser && currentUser.role === 'superadmin') {
    row.appendChild(actionButton('可视化编辑', () => openRecordEditor(type, record, entryIndex)));
  }
  parent.appendChild(row);
}
function viewAccount() {
  main.innerHTML = '';
  const pane = el('div', 'pane settings');
  if (currentUser) {
    pane.appendChild(el('h2', '', T('账户')));
    const role = currentUser.role === 'superadmin' ? T('超级管理员') : T('普通用户');
    pane.appendChild(el('p', '', `${T('已登入：')}${currentUser.nickname}（${currentUser.username}） · ${role}`));
    pane.appendChild(actionButton(T('打开信箱'), () => { location.hash = '#/mail'; }));
    pane.appendChild(actionButton(T('退出登入'), async () => {
      try { await api('/logout', { method: 'POST' }); } catch {}
      setUser(null); location.hash = '#/home';
    }, 'secondary'));
    main.appendChild(pane); document.title = T('账户 — 東吳詞典'); return;
  }
  pane.appendChild(el('h2', '', T('登入 / 注册')));
  const tabs = el('div', 'action-row');
  const form = el('form', 'form-grid');
  let mode = 'login';
  const notice = el('div', 'notice');
  const renderForm = () => {
    form.innerHTML = '';
    const field = (label, name, type = 'text', required = true, attrs = {}) => {
      const wrap = el('label', '', T(label)), input = el('input');
      input.name = name; input.type = type; input.required = required;
      Object.entries(attrs).forEach(([k,v]) => input.setAttribute(k, v));
      wrap.appendChild(input); form.appendChild(wrap); return input;
    };
    field('用户名', 'username', 'text', true, { autocomplete: 'username', pattern: '[A-Za-z0-9_]{1,32}', maxlength: '32' });
    if (mode === 'register') field('昵称', 'nickname', 'text', true, { maxlength: '48' });
    field('密码', 'password', 'password', true, { autocomplete: mode === 'login' ? 'current-password' : 'new-password', minlength: mode === 'login' ? '1' : '8', maxlength: '128' });
    if (mode === 'register') {
      field('邀请码', 'inviteCode', 'text', true, { autocomplete: 'off' });
      form.appendChild(el('div', 'notice', T('用户名只能包含英文字母、数字和下划线；密码至少 8 位。')));
    }
    const submit = el('button', 'action-btn', T(mode === 'login' ? '登入' : '注册')); submit.type = 'submit'; form.appendChild(submit);
  };
  const loginBtn = actionButton(T('登入'), () => { mode = 'login'; renderForm(); notice.textContent = ''; }, 'secondary');
  const registerBtn = actionButton(T('注册'), () => { mode = 'register'; renderForm(); notice.textContent = ''; }, 'secondary');
  tabs.append(loginBtn, registerBtn); pane.appendChild(tabs); pane.appendChild(notice); renderForm();
  form.addEventListener('submit', async ev => {
    ev.preventDefault(); notice.className = 'notice'; notice.textContent = T('处理中…');
    const input = Object.fromEntries(new FormData(form).entries());
    try {
      const data = await api(mode === 'login' ? '/login' : '/register', { method: 'POST', body: JSON.stringify(input) });
      setUser(data.user); notice.textContent = T('操作成功。');
      location.hash = pendingFeedbackContext ? '#/mail' : '#/home';
    } catch (err) { notice.className = 'notice error'; notice.textContent = T(err.message); }
  });
  pane.appendChild(form); main.appendChild(pane); document.title = T('登入 / 注册 — 東吳詞典');
}
function targetHref(type, value) {
  return type === 'entry' ? '#/w/' + encodeURIComponent(value) : '#/c/' + encodeURIComponent(value);
}
async function viewInbox() {
  main.innerHTML = '';
  const pane = el('div', 'pane');
  pane.appendChild(el('h2', '', '信箱'));
  if (!currentUser) {
    pane.appendChild(el('p', '', '登入后即可发送反馈并查看私信。'));
    pane.appendChild(actionButton('登入 / 註冊', () => { location.hash = '#/account'; }));
    main.appendChild(pane); return;
  }
  const toolbar = el('div', 'action-row');
  toolbar.appendChild(actionButton('✉ 撰写反馈', () => { pendingFeedbackContext = null; composeNewFeedback = true; renderInbox(); }, 'secondary'));
  if (currentUser.role === 'superadmin') toolbar.appendChild(actionButton(inboxTab === 'users' ? '返回信箱' : '用户管理', () => { inboxTab = inboxTab === 'users' ? 'messages' : 'users'; renderInbox(); }, 'secondary'));
  pane.appendChild(toolbar);
  const notice = el('div', 'notice'); pane.appendChild(notice);
  if (inboxTab === 'users' && currentUser.role === 'superadmin') {
    try { await renderAdminUsers(pane, notice); } catch (err) { notice.className = 'notice error'; notice.textContent = err.message; }
    main.appendChild(pane); return;
  }
  const layout = el('div', 'mail-layout'), list = el('div', 'thread-list'), detail = el('div', 'thread-messages');
  layout.append(list, detail); pane.appendChild(layout); main.appendChild(pane);
  try {
    const { threads } = await api('/threads');
    for (const thread of threads) {
      const b = el('button', 'thread-item' + (Number(thread.id) === Number(selectedThreadId) ? ' selected' : '') + (thread.unread ? ' unread' : ''));
      b.type = 'button';
      b.appendChild(el('strong', '', currentUser.role === 'superadmin' ? `${thread.nickname || thread.username}：${thread.subject}` : thread.subject));
      b.appendChild(el('span', 'thread-preview', `${thread.unread ? '● 未读 · ' : ''}${thread.preview || ''}`));
      b.addEventListener('click', () => { selectedThreadId = thread.id; composeNewFeedback = false; renderInbox(); });
      list.appendChild(b);
    }
    if (!threads.length) list.appendChild(el('div', 'notice', '目前没有消息。'));
    if (composeNewFeedback) renderComposer(detail, notice);
    else if (selectedThreadId) await renderThread(detail, notice, selectedThreadId);
    else detail.appendChild(el('div', 'empty-tip', '选择一封私信，或撰写新的反馈。'));
  } catch (err) { notice.className = 'notice error'; notice.textContent = err.message; }
}
async function renderInbox() { await viewInbox(); }
function renderComposer(parent, notice) {
  parent.appendChild(el('h3', '', pendingFeedbackContext ? `反馈：${pendingFeedbackContext.value}` : '发送反馈'));
  if (pendingFeedbackContext) parent.appendChild(el('p', 'notice', '此反馈会自动附上对应词条 / 字头的跳转卡片。'));
  const form = el('form', 'message-compose form-grid'), textarea = el('textarea');
  textarea.name = 'text'; textarea.required = true; textarea.maxLength = 5000; textarea.placeholder = '写下你的反馈…';
  const label = el('label', '', '内容'); label.appendChild(textarea); form.appendChild(label);
  const submit = el('button', 'action-btn', '发送给超级管理员'); submit.type = 'submit'; form.appendChild(submit);
  form.addEventListener('submit', async ev => {
    ev.preventDefault(); submit.disabled = true; notice.textContent = '发送中…';
    try {
      const input = { text: textarea.value, subject: pendingFeedbackContext ? `关于「${pendingFeedbackContext.value}」的反馈` : '用户反馈' };
      if (pendingFeedbackContext) { input.targetType = pendingFeedbackContext.type; input.targetValue = pendingFeedbackContext.value; }
      const result = await api('/feedback', { method: 'POST', body: JSON.stringify(input) });
      selectedThreadId = result.threadId; pendingFeedbackContext = null; composeNewFeedback = false;
      notice.className = 'notice'; notice.textContent = '反馈已发送。'; await refreshUnread(); await renderInbox();
    } catch (err) { submit.disabled = false; notice.className = 'notice error'; notice.textContent = err.message; }
  });
  parent.appendChild(form);
}
async function renderThread(parent, notice, id) {
  try {
    const { thread, messages } = await api('/threads/' + encodeURIComponent(id));
    parent.appendChild(el('h3', '', thread.subject));
    if (currentUser.role === 'superadmin') parent.appendChild(el('div', 'notice', `来自：${thread.user.nickname}（${thread.user.username}）`));
    if (thread.targetType && thread.targetValue) {
      const card = el('div', 'context-card');
      card.appendChild(el('strong', '', thread.targetType === 'entry' ? '相关词条' : '相关字头'));
      const link = el('a', '', thread.targetValue); link.href = targetHref(thread.targetType, thread.targetValue); card.appendChild(link);
      parent.appendChild(card);
    }
    const transcript = el('div');
    for (const message of messages) {
      const mine = Number(message.sender_id) === Number(currentUser.id);
      const box = el('div', 'message' + (mine ? ' mine' : ''));
      box.appendChild(el('div', 'message-meta', `${mine ? '我' : (message.nickname || message.username)} · ${new Date(message.created_at).toLocaleString()}`));
      box.appendChild(el('div', '', message.body)); transcript.appendChild(box);
    }
    parent.appendChild(transcript);
    const form = el('form', 'message-compose form-grid'), label = el('label', '', currentUser.role === 'superadmin' ? '回复' : '追加消息'), textarea = el('textarea');
    textarea.name = 'text'; textarea.required = true; textarea.maxLength = 5000; textarea.placeholder = '输入消息…'; label.appendChild(textarea); form.appendChild(label);
    const send = el('button', 'action-btn', currentUser.role === 'superadmin' ? '发送回复' : '发送'); send.type = 'submit'; form.appendChild(send);
    form.addEventListener('submit', async ev => {
      ev.preventDefault(); send.disabled = true; notice.textContent = '发送中…';
      try { await api('/threads/' + encodeURIComponent(id), { method: 'POST', body: JSON.stringify({ text: textarea.value }) }); await refreshUnread(); await renderInbox(); }
      catch (err) { send.disabled = false; notice.className = 'notice error'; notice.textContent = err.message; }
    });
    parent.appendChild(form); await refreshUnread();
  } catch (err) { notice.className = 'notice error'; notice.textContent = err.message; }
}
async function renderAdminUsers(parent, notice) {
  parent.appendChild(el('h3', '', '用户管理'));
  const { users } = await api('/admin/users');
  const table = el('table', 'admin-users'), head = el('tr');
  ['用户名 / 昵称', '权限', '状态', '操作'].forEach(x => head.appendChild(el('th', '', x)));
  const thead = el('thead'); thead.appendChild(head); table.appendChild(thead);
  const tbody = el('tbody');
  for (const user of users) {
    const row = el('tr');
    row.appendChild(el('td', '', `${user.username}\n${user.nickname}`));
    row.appendChild(el('td', '', user.role === 'superadmin' ? '超级管理员' : '普通用户'));
    row.appendChild(el('td', '', user.banned ? '已封禁' : '正常'));
    const ops = el('td');
    if (user.role !== 'superadmin' || Number(user.id) === Number(currentUser.id)) {
      ops.appendChild(actionButton('修改资料', async () => {
        const username = prompt('用户名：', user.username); if (username === null) return;
        const nickname = prompt('昵称：', user.nickname); if (nickname === null) return;
        const password = prompt('新密码（留空则不修改）：', ''); if (password === null) return;
        try {
          await api('/admin/users', { method: 'POST', body: JSON.stringify({ action: 'edit', id: user.id, username, nickname, password }) });
          if (Number(user.id) === Number(currentUser.id)) {
            if (password) { setUser(null); location.hash = '#/account'; return; }
            currentUser = (await api('/me')).user; refreshAccountButton();
          }
          notice.textContent = '用户资料已更新。'; await renderInbox();
        } catch (err) { notice.className = 'notice error'; notice.textContent = err.message; }
      }, 'secondary'));
      if (user.role !== 'superadmin') ops.appendChild(actionButton(user.banned ? '解除封禁' : '封禁', async () => {
        if (!confirm(`确定${user.banned ? '解除封禁' : '封禁'} ${user.username}？`)) return;
        try { await api('/admin/users', { method: 'POST', body: JSON.stringify({ action: user.banned ? 'unban' : 'ban', id: user.id }) }); await renderInbox(); }
        catch (err) { notice.className = 'notice error'; notice.textContent = err.message; }
      }, user.banned ? 'secondary' : 'danger'));
    }
    row.appendChild(ops); tbody.appendChild(row);
  }
  table.appendChild(tbody); parent.appendChild(table);
}

/* ---------------- 路由 ---------------- */
function route() {
  const h = location.hash || '#/home';
  const m = h.match(/^#\/([^/]*)(?:\/(.*))?$/);
  const page = m ? m[1] : 'home';
  const arg = m && m[2] ? decodeURIComponent(m[2]) : '';
  window.scrollTo(0, 0);
  if (page === 'w') viewEntry(arg);
  else if (page === 'c') viewChar(arg);
  else if (page === 'idx') arg ? viewIndexLetter(arg) : viewIndex();
  else if (page === 'account') viewAccount();
  else if (page === 'mail') { if (arg.startsWith('thread/')) selectedThreadId = Number(arg.slice(7)) || null; viewInbox(); }
  else if (page === 'set') { location.hash = '#/home'; return; }
  else if (page === 'about') viewAbout();
  else if (page === 's') doSearch(arg);
  else viewHome();
}
window.addEventListener('hashchange', route);

function doSearch(q) {
  if (!q) { location.hash = '#/home'; return; }
  const mode = document.getElementById('searchMode').value;
  viewSearch(q, mode);
  document.getElementById('q').value = q;
  document.title = T(q) + ' — 東吳詞典';
}

/* ---------------- 事件 ---------------- */
const qInput = document.getElementById('q');
qInput.addEventListener('keydown', ev => {
  if (ev.key === 'Enter') {
    const q = qInput.value.trim();
    if (q) location.hash = '#/s/' + encodeURIComponent(q);
  }
});
document.getElementById('searchBtn').addEventListener('click', () => {
  const q = qInput.value.trim();
  if (q) location.hash = '#/s/' + encodeURIComponent(q);
});
document.getElementById('scriptToggle').addEventListener('click', () => {
  scriptMode = scriptMode === 't' ? 's' : 't';
  localStorage.setItem('wuuScript', scriptMode);
  updToggleBtn();
  applyStaticScript();
  route();
});
document.getElementById('toneStyleToggle').addEventListener('click', () => {
  setTone('toneStyle', toneStyle === 'digit' ? 'mark' : 'digit');
});
document.getElementById('toneDataToggle').addEventListener('click', () => {
  setTone('toneData', toneData === 'sandhi' ? 'cite' : 'sandhi');
});
document.getElementById('ipaToggle').addEventListener('click', () => {
  setTone('ipaVariety', ipaVariety === 'mid' ? 'new' : 'mid');
});
document.getElementById('backBtn').addEventListener('click', () => {
  if (history.length > 1) history.back();
  else location.hash = '#/home';
});
document.getElementById('randomBtn').addEventListener('click', ev => {
  ev.preventDefault();
  const e = ENTRIES[Math.floor(Math.random() * ENTRIES.length)];
  location.hash = '#/w/' + encodeURIComponent(e.w);
});

/* init */
snapshotStatic();
if (scriptMode === 's') applyStaticScript();
updToggleBtn();
route();
})();

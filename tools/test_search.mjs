import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ENTRIES = load('data/entries.js');
const CHARS = load('data/chars.js');

// —— 从 app.js 提取待测函数 ——
const src = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8');
function grab(name) {
  const i = src.indexOf('function ' + name);
  let d = 0, j = i;
  for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) { j++; break; } } }
  return src.slice(i, j);
}
const code = [grab('parseQuerySyllable'), grab('parseQueryPy'), grab('entrySyls'), grab('sylMatch'), grab('guessMode')].join('\n')
  .replace(/ENTRIES|CHARS/g, '[]');
const mt = src.slice(src.indexOf('const MARK2TONE'), src.indexOf(';', src.indexOf('const MARK2TONE')) + 1);
// MARK2TONE：直接从源码正则抽取（源码含 \u 转义，不能直接 eval 声明文本）
const mtObj = { '̄': 1, '́': 2, '̀': 3, '̌': 5, '̂': 6 };
const fn = new Function('ENTRIES', 'CHARS', 'MARK2TONE', code + '\nreturn { parseQuerySyllable, parseQueryPy, entrySyls, sylMatch, guessMode };');
const t = fn(ENTRIES, CHARS, mtObj);
const o = [];
const W = s => o.push(s);
const chk = (label, actual, expect) => W((String(actual) === String(expect) ? 'OK  ' : 'FAIL') + ' ' + label + ' → ' + JSON.stringify(actual));

// guessMode
chk('guessMode(thou1)', t.guessMode('thou1'), 'py');
chk('guessMode(thōu)', t.guessMode('thōu'), 'py');
chk('guessMode(thou)', t.guessMode('thou'), 'py');
chk('guessMode(tshóu 附标)', t.guessMode('tshóu'), 'py');
chk('guessMode(拖鞋)', t.guessMode('拖鞋'), 'hanzi');
chk('guessMode(thou gha)', t.guessMode('thou gha'), 'py');

// parseQuerySyllable
const p = t.parseQuerySyllable;
chk('p(thou1) base', p('thou1').base, 'thou'); chk('p(thou1) tone', p('thou1').tone, 1);
chk('p(thōu) tone', p('th\u014du').tone, 1); chk('p(thōu) base', p('th\u014du').base, 'thou');
chk('p(ghá) tone', p('gh\u00e1').tone, 2);
chk('p(bì) tone', p('b\u00ec').tone, 3);
chk('p(ǎ 附标5)', p('ts\u01CE').tone, 5);
chk('p(â) tone', p('m\u00e2').tone, 6);
chk('p(aeq7)', p('aeq7').tone, 7);
chk('p(aeq) 无调', p('aeq').tone, null);

// entrySyls + sylMatch
const e = ENTRIES.find(x => x.w === '拖鞋皮');
const syls = t.entrySyls(e.r, e.ct);
chk('拖鞋皮 syls', JSON.stringify(syls.map(s => s.base + (s.tone || ''))), JSON.stringify(['thou1', 'gha2', 'bi2']));
chk('match thou(无调)', t.sylMatch(syls[0], { base: 'thou', tone: null }), true);
chk('match thou1', t.sylMatch(syls[0], { base: 'thou', tone: 1 }), true);
chk('match thou2 (调不对)', t.sylMatch(syls[0], { base: 'thou', tone: 2 }), false);
chk('match tho 前缀', t.sylMatch(syls[0], { base: 'th', tone: null }), true);
chk('match pōu 附标1', t.sylMatch(syls[0], { base: 'thou', tone: 1 }), true);

// 附标 NFC 输入（浏览器常见形态：预组合 ô）
chk('p(ô 预组合)', JSON.stringify(p('th\u00f4u1'.replace('1', ''))), JSON.stringify({ base: 'thou', tone: 1 }));
// NFD 输入
chk('p(ô NFD)', JSON.stringify(p('tho\u0302u')), JSON.stringify({ base: 'thou', tone: 6 }));

// 全流程：模拟 searchEntries py 分支
function searchPy(q) {
  const qs = t.parseQueryPy(q);
  const hits = [];
  for (let i = 0; i < ENTRIES.length; i++) {
    const ee = ENTRIES[i];
    const ss = t.entrySyls(ee.r, ee.ct);
    if (!ss.length) continue;
    let ok = ss.length >= qs.length;
    for (let j = 0; j < qs.length && ok; j++) if (!t.sylMatch(ss[j], qs[j])) ok = false;
    if (ok) hits.push(ee.w + '|' + ee.r);
  }
  return hits;
}
W('');
W('搜索 thou gha bi（无调）: ' + JSON.stringify(searchPy('thou gha bi').slice(0, 3)));
W('搜索 thou1 gha2 bi2（数字）: ' + JSON.stringify(searchPy('thou1 gha2 bi2').slice(0, 3)));
W('搜索 thōu ghá bí（附标）: ' + JSON.stringify(searchPy('th\u014du gh\u00e1 b\u00ed').slice(0, 3)));
W('搜索 t（单前缀，前5）: ' + JSON.stringify(searchPy('t').slice(0, 5)));
W('搜索 pi2（数字）: ' + JSON.stringify(searchPy('pi2').slice(0, 4)));
W('搜索 tsyu（旧例）: ' + JSON.stringify(searchPy('tsyu').slice(0, 3)));
// 字头
function searchCharsPy(q) {
  const qs = t.parseQueryPy(q);
  const out = [];
  for (const c of CHARS) {
    const cands = [];
    if (c.r) cands.push(t.entrySyls(c.r, null)[0]);
    for (const g of c.g) if (g[0]) cands.push(t.entrySyls(g[0], null)[0]);
    let hit = false;
    for (const s of cands) if (s && t.sylMatch(s, qs[0])) { hit = true; break; }
    if (hit) { out.push(c.c + ':' + c.r); if (out.length > 8) break; }
  }
  return out;
}
W('字头 pi2: ' + JSON.stringify(searchCharsPy('pi2')));
W('字头 bi2: ' + JSON.stringify(searchCharsPy('bi2').slice(0, 6)));
fs.writeFileSync(path.join(root, 'tools/test_search_report.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

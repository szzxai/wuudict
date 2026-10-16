// 依用户修订的对照表再次重标音标（声调一律不变）：
//  dz→dʑ  ɲ→ȵ  ɛ→ᴇ（uɛ→uᴇ 先行）  ɪ→i（ie 韵母=[i]）
//  ieu: ʏ→y（裸 y，无钩）
//  成音节鼻音：ŋ→ŋ̍(U+030D)、m→m̩(U+0329)、n→n̩(U+0329)（仅整音节成音节，声母/coda 不动）
//  i 韵母 → iᶽ（U+1DBD；含音节 yi 的韵母）
//  iu 韵母 → yᶽ；音节 yu（y 声母+u 韵）的韵母 → yᶽ；韵母 yu（ʮ）不动
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOK = '\u1DBD';   // ᶽ
const SYL_ABOVE = '\u030D'; // ŋ̍
const SYL_BELOW = '\u0329'; // m̩ n̩

const INIS = ['tsh', 'ph', 'th', 'kh', 'ch', 'sh', 'gh', 'gn', 'ng', 'ts', 'b', 'p', 'm', 'f', 'v', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'c', 'x', 's', 'z', 'y', 'w'];
function pySplit(base) {
  for (const c of INIS) if (base.startsWith(c)) return [c, base.slice(c.length)];
  return ['', base];
}
function baseOf(py) { return py.replace(/[()（）]/g, '').replace(/\d+$/, ''); }

function applyToken(tok, pySyl) {
  // 返回改后的 token；seg/tone 拆解
  let lead = '', t = tok, trail = '', light = false;
  if (/^[·]/.test(t)) { light = true; t = t.slice(1); }
  const pm = t.match(/^([（(])(.*)([）)])$/);
  if (pm) { lead = pm[1]; t = pm[2]; trail = pm[3]; }
  const m = t.match(/^([^\d]*)(\d+(?:-\d+)*)?$/);
  if (!m) return tok;
  let seg = m[1] || '', tones = m[2] || '';
  if (!seg) return tok;
  // 1) 盲替换
  seg = seg.replace(/dz/g, 'dʑ').replace(/ɲ/g, 'ȵ');
  seg = seg.replace(/uɛ/g, 'uᴇ').replace(/ɛ/g, 'ᴇ');
  seg = seg.replace(/ɪ/g, 'i');
  seg = seg.replace(/øʏ|ʏ/g, s => (s[0] === 'ø' ? 'øʏ' : 'y'));
  // 2) 成音节鼻音（整音节）
  if (seg === 'ŋ') seg += SYL_ABOVE;
  else if (seg === 'm') seg += SYL_BELOW;
  else if (seg === 'n') seg += SYL_BELOW;
  // 3) 拼音对位：i 韵母 → iᶽ；iu 韵母/音节 yu → yᶽ
  if (pySyl) {
    const [ini, rh] = pySplit(baseOf(pySyl));
    if (rh === 'i' || (ini === 'y' && rh === 'i')) {
      if (/i$/.test(seg)) seg += HOOK;
    } else if (rh === 'iu' || (ini === 'y' && rh === 'u')) {
      if (/y$/.test(seg)) seg += HOOK;
    }
  }
  return light ? '·' + lead + seg + tones + trail : lead + seg + tones + trail;
}
function toneSeq(s) { return (String(s || '').match(/\d+(?:-\d+)*/g) || []).join(','); }

function reAnnotate(iStr, rStr) {
  const toks = String(iStr || '').split(/\s+/).filter(Boolean);
  const pys = String(rStr || '').split(/\s+/).filter(t => !/^[—…]+$/.test(t));
  const aligned = toks.length === pys.length && toks.length > 0;
  return toks.map((t, k) => applyToken(t, aligned ? pys[k] : null)).join(' ');
}

const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const chars = load('data/chars.js');
const report = [];
let nEnt = 0, nChar = 0, toneViol = 0, iHook = 0, yHook = 0, syl = 0;
for (const e of ent) {
  const oldI = e.i || '';
  if (!oldI.trim()) continue;
  const newI = reAnnotate(oldI, e.r);
  if (newI !== oldI) {
    nEnt++;
    if (newI.includes(HOOK)) { // 统计新增的钩
      const a = (oldI.match(/\u1DBD/g) || []).length, b = (newI.match(/\u1DBD/g) || []).length;
      // 无法区分 iᶽ/yᶽ 来源，粗计
    }
    if (/ŋ\u030D|m\u0329|n\u0329/.test(newI)) syl++;
    if (toneSeq(oldI) !== toneSeq(newI)) {
      toneViol++;
      report.push('!! 调值变动: ' + e.w + ' | ' + oldI + ' → ' + newI);
    }
    e.i = newI;
  }
}
for (const c of chars) {
  const oldI = c.ipa || '';
  if (!oldI.trim()) continue;
  const newI = reAnnotate(oldI, c.r);
  if (newI !== oldI) { nChar++; if (toneSeq(oldI) !== toneSeq(newI)) { toneViol++; report.push('!! 调值变动(字): ' + c.c); } c.ipa = newI; }
}
// 全库统计
const cnt = re => ent.reduce((a, e) => a + ((e.i || '').match(re) || []).length, 0);
report.unshift(`词条改动: ${nEnt}  字头改动: ${nChar}  调值变动: ${toneViol}（必须为 0）`);
report.push(`iᶽ(含yi): ${cnt(/i\u1DBD/g)}  yᶽ: ${cnt(/y\u1DBD/g)}  裸y(ieu): ${cnt(/y/g)}  ʮ(韵母yu): ${cnt(/ʮ/g)}  øʏ: ${cnt(/øʏ/g)}  dʑ: ${cnt(/dʑ/g)}  ȵ: ${cnt(/ȵ/g)}  ᴇ: ${cnt(/\u1D07/g)}  ŋ̍: ${cnt(/ŋ\u030D/g)}  m̩: ${cnt(/m\u0329/g)}  n̩: ${cnt(/n\u0329/g)}`);
// 残留检查
const bad = [];
for (const e of ent) for (const sym of ['dz', 'ɲ', 'ɛ', 'uɛ', 'ɪ', 'ʏ']) if ((e.i || '').includes(sym)) bad.push(e.w);
report.push('残留旧符号词条: ' + bad.length + (bad.length ? ' ' + bad.slice(0, 10).join(',') : ''));
fs.writeFileSync(path.join(root, 'data/entries.js'), 'window.WUU_ENTRIES=' + JSON.stringify(ent) + ';');
fs.writeFileSync(path.join(root, 'data/chars.js'), 'window.WUU_CHARS=' + JSON.stringify(chars) + ';');
report.push('');
report.push('== 校样 ==');
for (const w of ['拖鞋皮', '旗袍', '旗袍裙', '私盐', '眉毛云', '滋五十六', '紫菜', '糍饭', '纸头', '猪油', '皮球', '雨', '遗', '于', '居', '书', '锥']) {
  const e = ent.find(x => x.w === w);
  const c = chars.find(x => x.c === w);
  if (e) report.push('  词 ' + e.w + ' | ' + e.r + ' | ' + e.i);
  if (c) report.push('  字 ' + c.c + ' | ' + c.r + ' | ' + c.ipa);
}
fs.writeFileSync(path.join(root, 'tools/reipa2_report.txt'), report.join('\n'), 'utf8');
console.log(report.join('\n'));

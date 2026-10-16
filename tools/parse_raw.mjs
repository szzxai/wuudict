// 解析 data/raw/suzhou_dict.html → data/raw/parsed.json
// panel 结构: word / 拼音 / IPA / dictClass / dictDetail / 例句
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'data/raw/suzhou_dict.html'), 'utf8');

// 每个 panel 从 <div class="panel panel-success"> 到下一个之前
const parts = html.split('panel panel-success').slice(1);
const items = [];
for (const raw of parts) {
  const seg = raw.slice(0, raw.indexOf('panel panel-success') === -1 ? raw.length : raw.indexOf('panel panel-success'));
  // word
  const mWord = seg.match(/<strong class="word">\s*([\s\S]*?)\s*<\/strong>/);
  // heading 内拼音与 IPA（在 </div> 之前），body 内容
  const headEnd = seg.indexOf('panel-body');
  let head = seg.slice(0, headEnd);
  let body = seg.slice(headEnd);
  const word = mWord ? mWord[1].replace(/\s+/g, ' ').trim() : '';
  // head 中 strong 之后的两行文本块
  const afterStrong = head.slice(head.indexOf('</strong>') + 9);
  // 两个非空文本块（拼音、IPA），允许换行
  const blocks = afterStrong.split(/\n+/).map(s => s.trim()).filter(Boolean);
  const py = blocks[0] || '';
  const ipa = blocks[1] || '';
  // dictClass
  const mClass = body.match(/<div class="dictClass center-block">([\s\S]*?)<\/div>/);
  const cls = mClass ? mClass[1].replace(/<[^>]+>/g, '').trim() : '';
  // dictDetail
  const mDetail = body.match(/<div class="dictDetail center-block">([\s\S]*?)<\/div>/);
  let detail = mDetail ? mDetail[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
  // 例句：dictDetail 之后、panel-body 结束之前的文本
  const dEnd = body.indexOf('</div>', body.indexOf('dictDetail'));
  const pEnd = body.indexOf('</div>\r\n      </div>');
  let tail = body.slice(dEnd + 6, pEnd >= 0 ? pEnd : body.length);
  tail = tail.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  items.push({ word, py, ipa, cls, detail, tail });
}
fs.writeFileSync(path.join(root, 'data/raw/parsed.json'), JSON.stringify(items, null, 1), 'utf8');
console.log('parsed:', items.length);
// 统计
const noWord = items.filter(x => !x.word).length;
const noPy = items.filter(x => !x.py).length;
const noIpa = items.filter(x => !x.ipa).length;
const noDetail = items.filter(x => !x.detail).length;
console.log('noWord', noWord, 'noPy', noPy, 'noIpa', noIpa, 'noDetail', noDetail);
// 重复 word
const seen = new Map();
const dups = [];
items.forEach((x, i) => { const k = x.word + '|' + x.py; if (seen.has(k)) dups.push(k); else seen.set(k, i); });
console.log('dups(word+py):', dups.length);

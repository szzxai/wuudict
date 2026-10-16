import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')
  .replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');

const LINES = [];
function out(s) { LINES.push(s); }
const origLog = console.log.bind(console);
console.log = (...a) => { out(a.join(' ')); };
const tokEx = new Map(); // full token -> [count, example]
for (const e of ent) {
  const ipa = (e.i || '').trim();
  if (!ipa) continue;
  for (const tok of ipa.split(/\s+/)) {
    if (!tokEx.has(tok)) tokEx.set(tok, [0, e.w + '|' + e.r]);
    tokEx.get(tok)[0]++;
  }
}
console.log('== 全部 token（含示例） ==');
for (const [t, [c, ex]] of [...tokEx.entries()].sort((a, b) => b[1][0] - a[1][0])) console.log(JSON.stringify(t), c, 'ex:', ex);

// dash 后段分布
const dash = new Map();
for (const [t, [c]] of tokEx) {
  const m = t.match(/(\d+)-(\d+)/);
  if (m) { const k = m[2]; dash.set(k, (dash.get(k) || 0) + c); }
}
console.log('\n== dash 后段（变调值）分布 ==');
for (const [k, c] of [...dash.entries()].sort((a, b) => b[1] - a[1])) console.log(k, c);

// 孤立 token（无数字）条目样例
console.log('\n== 轻声点前缀 token（无数字）==');
const light = new Map();
for (const e of ent) for (const tok of (e.i || '').split(/\s+/)) {
  if (/^[·•]/.test(tok) && !/\d/.test(tok)) light.set(tok, (light.get(tok) || 0) + 1);
}
console.log(light.size, '种;', [...light.entries()].slice(0, 20).map(([k, c]) => k + ':' + c).join(' '));
// 无点也无数字
const bare = new Map();
for (const e of ent) for (const tok of (e.i || '').split(/\s+/)) {
  if (!/^[(（·•]/.test(tok) && !/\d/.test(tok)) bare.set(tok, (bare.get(tok) || 0) + 1);
}
console.log('\n== 无点无数字 token ==');
console.log([...bare.entries()].map(([k, c]) => k + ':' + c).join(' '));
console.log = origLog;
fs.writeFileSync(path.join(root, 'data/raw/tok_audit.txt'), LINES.join('\n'), 'utf8');

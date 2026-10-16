import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const oldEnt = load('data/entries.js');

const word = '—子';
const e = oldEnt.find(x => x.w === word);
console.log('found:', JSON.stringify(e).slice(0, 120));
const hanzi = [...e.w].filter(ch => /[\u3400-\u9fff\uF900-\uFAFF\u20000-\u323AF]/.test(ch));
console.log('hanzi:', hanzi, 'codepoints:', [...e.w].map(c => 'U+' + c.codePointAt(0).toString(16)));
const oldPyToks = e.r.split(/\s+/).filter(Boolean);
console.log('oldPyToks:', oldPyToks);
const oldRaw = oldPyToks.filter(t => !/^[—…]+$/.test(t));
console.log('oldRaw:', oldRaw);
const oldBases = oldRaw.map(t => t.replace(/\d+$/, '').replace(/[()（）]/g, ''));
console.log('oldBases:', oldBases, 'len', oldBases.length, 'target', hanzi.length);
// 测 stripTone 行为
function stripTone(py) { return py.replace(/\d+$/, '').replace(/[()（）]/g, ''); }
console.log('stripTone("tsy"):', JSON.stringify(stripTone('tsy')));
// hanzi 正则测试（注意 \u20000 无 u 标志的问题）
const re = /[\u3400-\u9fff\uF900-\uFAFF\u20000-\u323AF]/;
console.log('re.test("子"):', re.test('子'), 're.test("0"):', re.test('0'), 're.test("F"):', re.test('F'));

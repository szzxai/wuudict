import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8').replace(/^window\.WUU_[A-Z]+=/, '').replace(/;\s*$/, ''));
const ent = load('data/entries.js');
const o = [];
const W = s => o.push(s);
const e = ent.find(x => x.w === '碗店');
W('BEFORE ' + JSON.stringify(e));
e.i = e.i.replace(/ts[ʰ]?ᴇ523-33/, 'ti523-33');
W('AFTER  ' + JSON.stringify(e));
fs.writeFileSync(path.join(root, 'data/entries.js'), 'window.WUU_ENTRIES=' + JSON.stringify(ent) + ';');
// 干儿子复核
const g = ent.find(x => x.w === '干儿子');
W('干儿子 now: ' + JSON.stringify(g));
fs.writeFileSync(path.join(root, 'tools/fix_wandian_report.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

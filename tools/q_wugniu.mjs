import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function get(u) {
  return new Promise((res, rej) => {
    const lib = u.startsWith('https:') ? 'https' : 'http';
    import(lib).then(({ default: h }) => {
      const r = h.get(u, { timeout: 25000, headers: { 'User-Agent': 'Mozilla/5.0' } }, x => {
        const chunks = [];
        x.on('data', d => chunks.push(d));
        x.on('end', () => res(Buffer.concat(chunks).toString('utf8')));
      });
      r.on('error', rej);
      r.on('timeout', () => { r.destroy(); rej(new Error('timeout ' + u)); });
    });
  });
}

const words = process.argv.slice(2);
for (const w of words) {
  const u = 'https://wugniu.com/dict?word=' + encodeURIComponent(w) + '&dict=suzhou_dict';
  const html = await get(u);
  // 提取 panels
  const parts = html.split('panel panel-success').slice(1);
  console.log('=== ' + w + ' === panels:' + parts.length);
  for (const raw of parts) {
    const seg = raw.slice(0, raw.indexOf('panel-body'));
    const mW = seg.match(/<strong class="word">\s*([\s\S]*?)\s*<\/strong>/);
    const after = seg.slice(seg.indexOf('</strong>') + 9);
    const blocks = after.split(/\n+/).map(s => s.trim()).filter(Boolean);
    console.log('  [' + (mW ? mW[1].trim() : '?') + '] py=' + JSON.stringify(blocks[0] || '') + ' ipa=' + JSON.stringify(blocks[1] || ''));
  }
}

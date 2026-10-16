import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'data/raw/wugniu_live');

function get(u, binary) {
  return new Promise((res, rej) => {
    const mod = u.startsWith('https') ? await_ : null;
    function await_() {}
    const lib = u.startsWith('https:') ? 'https' : 'http';
    import(lib).then(({ default: h }) => {
      const r = h.get(u, { timeout: 25000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, x => {
        if (x.statusCode >= 300 && x.statusCode < 400 && x.headers.location) {
          get(new URL(x.headers.location, u).href, binary).then(res).catch(rej);
          return;
        }
        const chunks = [];
        x.on('data', d => chunks.push(d));
        x.on('end', () => res({ s: x.statusCode, b: Buffer.concat(chunks), hdr: x.headers }));
      });
      r.on('error', rej);
      r.on('timeout', () => { r.destroy(); rej(new Error('timeout ' + u)); });
    }).catch(rej);
  });
}

const target = process.argv[2];
const asName = process.argv[3] || 'page.bin';
const r = await get(target);
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, asName), r.b);
console.log('status', r.s, 'bytes', r.b.length, 'type', r.hdr && r.hdr['content-type']);
const txt = r.b.toString('utf8');
console.log(txt.slice(0, 1800));

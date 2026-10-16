// 从吴语学堂“单地查询”接口批量抓取苏州字音，并去重合并到 data/chars.js。
// 用法：node tools/scrape_single_place_chars.mjs --plan
//       node tools/scrape_single_place_chars.mjs --start=0 --count=40   （分批抓取）
//       node tools/scrape_single_place_chars.mjs --merge                （全部抓完后合并）
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { spawn } from 'node:child_process';

const liveDir = 'data/raw/wugniu_live';
const charsFile = 'data/chars.js';
const entriesFile = 'data/entries.js';
const parsedFile = 'data/raw/parsed.json';
const reportFile = 'docs/苏州单地查询重复字清单.md';
const pageUrl = 'https://wugniu.com/search';
const sourceUrl = 'https://wugniu.com/';
const tableName = 'suzhou_zi';
const encodedBatchLimit = 1620;
const args = process.argv.slice(2);
const isMerge = args.includes('--merge');
const isPlan = args.includes('--plan');
const dryRun = args.includes('--dry-run');
const getArg = (name, fallback) => {
  const value = args.find(arg => arg.startsWith(`--${name}=`));
  return value ? Number(value.slice(name.length + 3)) : fallback;
};

const han = /\p{Script=Han}/u;
const candidates = new Set();
function addHanText(value) {
  for (const ch of String(value || '')) if (han.test(ch)) candidates.add(ch);
}
// 单地查询接口没有公开的全量索引路由；枚举目前已编码的 CJK 统一汉字区及兼容区。
for (const [from, to] of [
  [0x3400, 0x4DBF], [0x4E00, 0x9FFF], [0xF900, 0xFAFF],
  [0x20000, 0x2A6DF], [0x2A700, 0x2B73F], [0x2B740, 0x2B81F], [0x2B820, 0x2CEAF],
  [0x2CEB0, 0x2EBEF], [0x2EBF0, 0x2EE5F], [0x2F800, 0x2FA1F],
  [0x30000, 0x3134F], [0x31350, 0x323AF], [0x323B0, 0x3347F],
]) {
  for (let cp = from; cp <= to; cp++) candidates.add(String.fromCodePoint(cp));
}
// 扩展补入仓库字头、苏州词条及已有解析快照中出现的扩展区/异体汉字。
globalThis.window = {};
eval(fs.readFileSync(charsFile, 'utf8'));
for (const row of window.WUU_CHARS || []) addHanText(row.c);
eval(fs.readFileSync(entriesFile, 'utf8'));
for (const row of window.WUU_ENTRIES || []) addHanText(row.w);
if (fs.existsSync(parsedFile)) {
  for (const row of JSON.parse(fs.readFileSync(parsedFile, 'utf8'))) addHanText(row.word);
}
const ordered = [...candidates].sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
const batches = [];
let batch = '';
let encodedLength = 0;
for (const ch of ordered) {
  const encodedCharLength = encodeURIComponent(ch).length;
  if (batch && encodedLength + encodedCharLength > encodedBatchLimit) {
    batches.push(batch);
    batch = '';
    encodedLength = 0;
  }
  batch += ch;
  encodedLength += encodedCharLength;
}
if (batch) batches.push(batch);
const batchPath = index => path.join(liveDir, `suzhou_single_${String(index).padStart(4, '0')}.html`);

if (isPlan) {
  console.log(JSON.stringify({ candidateCharacters: ordered.length, encodedBatchLimit, batchCount: batches.length, cachedBatches: batches.filter((_, i) => fs.existsSync(batchPath(i))).length }, null, 2));
  process.exit(0);
}

function curlToFile(batch, file) {
  return new Promise((resolve, reject) => {
    const child = spawn('curl.exe', [
      '--fail', '--location', '--silent', '--show-error', '--retry', '2', '--retry-delay', '1', '--max-time', '60',
      '--get', '--data-urlencode', `char=${batch}`, '--data-urlencode', `table=${tableName}`,
      '--output', file, pageUrl,
    ], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`curl exit ${code}: ${stderr.trim()}`)));
  });
}

if (!isMerge) {
  const start = Math.max(0, getArg('start', 0));
  const end = Math.min(batches.length, start + Math.max(0, getArg('count', batches.length)));
  fs.mkdirSync(liveDir, { recursive: true });
  for (let i = start; i < end; i++) {
    const file = batchPath(i);
    await curlToFile(batches[i], file);
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes('name="char"') || !html.includes(`value="${tableName}"`)) {
      throw new Error(`第 ${i + 1} 批返回页面校验失败：${file}`);
    }
    const hitRows = (html.match(/class="resultRow"/g) || []).length;
    if ((i + 1) % 10 === 0 || i + 1 === end) console.log(`批次 ${i + 1}/${batches.length}：已抓取，最近一批返回 ${hitRows} 行`);
    await delay(300);
  }
  console.log(`抓取批次 ${start + 1}-${end} 完成。尚未修改字头；全部批次完成后运行 --merge。`);
  process.exit(0);
}

function decodeEntities(value) {
  return String(value || '').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (all, entity) => {
    const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    if (entity[0] !== '#') return named[entity.toLowerCase()] ?? all;
    const hex = entity[1]?.toLowerCase() === 'x';
    const cp = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
    return Number.isFinite(cp) ? String.fromCodePoint(cp) : all;
  });
}
function textContent(value) {
  return decodeEntities(String(value || '').replace(/<br\s*\/?>/gi, '；').replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}
function parseRows(html) {
  const parsedRows = [];
  for (const rowMatch of html.matchAll(/<tr\b[^>]*class="resultRow"[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const rowHtml = rowMatch[1];
    const cells = [...rowHtml.matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi)];
    if (cells.length < 4) continue;
    const charLinks = [...cells.slice(0, 2).map(cell => cell[2]).join('').matchAll(/<a\b[^>]*class="switch"[^>]*>([\s\S]*?)<\/a>/gi)]
      .map(match => textContent(match[1])).filter(Boolean);
    const chars = [...new Set(charLinks.flatMap(text => [...text]))].filter(ch => han.test(ch));
    const firstCellColspan = Number(cells[0][1].match(/colspan\s*=\s*["']?(\d+)/i)?.[1] || 1);
    const noteIndex = firstCellColspan === 2 ? 3 : 4;
    const note = cells[noteIndex] ? textContent(cells[noteIndex][2]) : '';
    const audio = rowHtml.match(/\/sounds\/suzhou_zi\/([^"'/?#]+)\.mp3/i)?.[1] || '';
    const reading = decodeURIComponent(audio);
    if (!chars.length) continue;
    for (const ch of chars) parsedRows.push({ c: ch, r: reading, note });
  }
  return parsedRows;
}

const missing = batches.map((_, index) => batchPath(index)).filter(file => !fs.existsSync(file));
if (missing.length) throw new Error(`尚缺 ${missing.length} 個抓取批次；先按 --start/--count 分批抓完，再執行 --merge。首個缺失：${missing[0]}`);
const source = new Map();
let htmlRows = 0;
for (let i = 0; i < batches.length; i++) {
  const rows = parseRows(fs.readFileSync(batchPath(i), 'utf8'));
  htmlRows += rows.length;
  for (const row of rows) {
    if (!source.has(row.c)) source.set(row.c, { readings: new Set(), notes: new Set() });
    const target = source.get(row.c);
    if (row.r) target.readings.add(row.r);
    if (row.note) target.notes.add(row.note);
  }
}

// Load the site's character records and merge by the exact headword; never create a second record for an existing character.
globalThis.window = {};
eval(fs.readFileSync(charsFile, 'utf8'));
const chars = window.WUU_CHARS;
const byChar = new Map(chars.map((record, index) => [record.c, index]));
const existing = new Set(byChar.keys());
const priorReport = fs.existsSync(reportFile) ? fs.readFileSync(reportFile, 'utf8') : '';
const priorNewSection = priorReport.split('## 新增字头')[1] || '';
const previouslyAddedHeadwords = new Set([...priorNewSection.matchAll(/^\|\s*([^|]+?)\s*\|/gm)]
  .map(match => match[1].trim()).filter(ch => [...ch].length === 1 && han.test(ch)));
const duplicateHeadwords = [...source.keys()].filter(ch => existing.has(ch) && !previouslyAddedHeadwords.has(ch)).sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
const newHeadwords = [...source.keys()].filter(ch => !existing.has(ch) || previouslyAddedHeadwords.has(ch)).sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
const noReadingHeadwords = [...source.keys()].filter(ch => !source.get(ch).readings.size).sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
const sourceReadingPairs = [...source.values()].reduce((sum, row) => sum + row.readings.size, 0);
const sourceNoteTexts = [...source.values()].reduce((sum, row) => sum + row.notes.size, 0);
const sourceAttribution = '来源：吴语学堂苏州单地查询';
let addedSourceAttributions = 0;
let addedReadings = 0;
let addedNotes = 0;
let filledPrimaryReadings = 0;
for (const ch of [...source.keys()].sort((a, b) => a.codePointAt(0) - b.codePointAt(0))) {
  const record = byChar.has(ch) ? chars[byChar.get(ch)] : { c: ch, r: '', ipa: '', d: [], x: [], g: [] };
  if (!byChar.has(ch)) {
    byChar.set(ch, chars.length);
    chars.push(record);
  }
  record.d = Array.isArray(record.d) ? record.d : [];
  record.x = Array.isArray(record.x) ? record.x : [];
  record.g = Array.isArray(record.g) ? record.g : [];
  const incoming = source.get(ch);
  for (const note of [...incoming.notes, sourceAttribution]) if (!record.d.includes(note)) {
    record.d.push(note);
    addedNotes++;
    if (note === sourceAttribution) addedSourceAttributions++;
  }
  for (const reading of incoming.readings) {
    if (!reading) continue;
    if (!record.r) { record.r = reading; filledPrimaryReadings++; }
    if (!record.g.some(group => group[0] === reading)) { record.g.push([reading, []]); addedReadings++; }
  }
}

const readingText = ch => [...(source.get(ch)?.readings || [])].join('、') || '（来源未提供音频拼写）';
const reportLines = [
  '# 吴语学堂苏州单地查询字头去重清单',
  '',
  `- 来源入口：${sourceUrl}（“单地查询”）`,
  `- 查询接口：\`${pageUrl}?char=汉字&table=${tableName}\`；查询的是字音表，不是词典。`,
  `- 抓取日期：${new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)}（UTC+8）。`,
  `- 候选集：枚举基本汉字、扩展 A–J 与兼容汉字区，并补入本项目字头、词条及本地解析快照中出现的其他汉字；共查询 ${ordered.length} 个候选字，分 ${batches.length} 批。`,
  `- 单地查询命中 ${source.size} 个不同字头（页面结果行展开后 ${htmlRows} 个字符/读音组合）；新增 ${newHeadwords.length} 个字头，已存在而去重合并 ${duplicateHeadwords.length} 个。`,
  `- 来源提供 ${sourceReadingPairs} 个字头—读音组合、${sourceNoteTexts} 条不同释义/备注文本；为 ${source.size} 个命中字头写入“${sourceAttribution}”来源标注。页面 IPA/吴拼以 SVG 轮廓输出，本次以播放音频文件名所含吴拼录入读音，不推测 IPA。`,
  `- 没有解析到音频吴拼的字头：${noReadingHeadwords.length ? noReadingHeadwords.join('、') : '无'}。`,
  '- 单地查询未发现公开的全量索引路由；本次穷举当前已编码的 CJK 统一汉字范围至扩展 J，并补入项目资料中的其他汉字。未来新增区段、未编码字符及站点非 Unicode 私用映射不在本次范围内。',
  '',
  '## 已有字头（已合并，不重复新建）',
  '',
  '| 字头 | 吴语学堂单地查询读音 |',
  '|---|---|',
  ...duplicateHeadwords.map(ch => `| ${ch} | ${readingText(ch)} |`),
  '',
  '## 新增字头',
  '',
  newHeadwords.length ? '| 字头 | 吴语学堂单地查询读音 | 来源备注 |\n|---|---|---|' : '无。',
  ...newHeadwords.map(ch => `| ${ch} | ${readingText(ch)} | ${(source.get(ch)?.notes.size ? [...source.get(ch).notes].join('；') : '—').replaceAll('|', '\\|')} |`),
  '',
].join('\n');
if (!dryRun) {
  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(charsFile, `window.WUU_CHARS=${JSON.stringify(chars)};\n`, 'utf8');
  fs.writeFileSync(reportFile, reportLines, 'utf8');
}
console.log(JSON.stringify({
  dryRun,
  candidateCharacters: ordered.length,
  queryBatches: batches.length,
  resultRows: htmlRows,
  uniqueQueriedHeadwords: source.size,
  existingDuplicateHeadwords: duplicateHeadwords.length,
  newHeadwordCount: newHeadwords.length,
  addedReadings,
  addedNotes,
  addedSourceAttributions,
  headwordsWithoutAudioReading: noReadingHeadwords,
  filledPrimaryReadings,
  outputs: [charsFile, reportFile],
}, null, 2));

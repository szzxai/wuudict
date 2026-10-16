// 将 data/raw/parsed.json 中的吴语学堂苏州单字记录合并进 data/chars.js。
// 默认写入 chars.js 和 docs/苏州单字重复字清单.md；--dry-run 只统计不写文件。
import fs from 'node:fs';

const dryRun = process.argv.includes('--dry-run');
const sourceFile = 'data/raw/parsed.json';
const charsFile = 'data/chars.js';
const reportFile = 'docs/苏州单字重复字清单.md';
const sourceUrl = 'https://wugniu.com/dict?word=%25&dict=suzhou_dict';
const parsed = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
globalThis.window = {};
eval(fs.readFileSync(charsFile, 'utf8'));
const chars = window.WUU_CHARS;
const priorReport = fs.existsSync(reportFile) ? fs.readFileSync(reportFile, 'utf8') : '';
const priorNewHeadwords = new Set((priorReport.match(/新增字头：\d+ 个（([^）]*)）/)?.[1] || '').split(/[、，]/).filter(Boolean));
const priorCount = label => Number(priorReport.match(new RegExp(`${label}：([0-9]+)`))?.[1] || 0);
const byChar = new Map(chars.map((c, i) => [c.c, i]));
const sourceRows = parsed.filter(row => [...row.word].length === 1);
const grouped = new Map();
for (const row of sourceRows) {
  if (!grouped.has(row.word)) grouped.set(row.word, []);
  grouped.get(row.word).push(row);
}

// 吴拼拼音列在部分单字记录中不带调；用该行 IPA 的本调调值按现有重建脚本规则补调，未知值不推测。
const toneClassByValue = {55:1,44:1,223:2,13:2,12:2,22:2,51:3,52:3,523:5,41:5,412:5,512:5,31:6,231:6,24:6,21:6,33:6,43:7,4:7,5:7,435:7,23:8,3:8,2:8};
function normalizeSourcePy(value) {
  let py = String(value || '').trim().replace(/^\/+|\/+$/g, '').replace(/\s+/g, ' ').replace(/ɡ/g, 'g');
  // 吴语学堂页面有“keq 7”或“gnin,2”这类调号被分隔到拼音栏的记录。
  const spacedTone = py.match(/^(.*\S)\s+([1-8])$/);
  const commaTone = py.match(/^(.*\S)[,，]\s*([1-8])$/);
  if (spacedTone) py = spacedTone[1] + spacedTone[2];
  else if (commaTone) py = commaTone[1] + commaTone[2];
  // 若来源拼音直接写调值（如 55、51），转换为本项目使用的调类；只处理明确映射值。
  py = py.split(' ').map(token => {
    const contour = token.match(/^(.+?)(\d+)$/);
    if (!contour) return token;
    const value = Number(contour[2]);
    return value > 8 && toneClassByValue[value] ? contour[1] + toneClassByValue[value] : token;
  }).join(' ');
  return py;
}
function readingLabel(row) {
  let py = normalizeSourcePy(row.py);
  if (!py) return '';
  if (/\d$/.test(py)) return py;
  const ipa = String(row.ipa || '').replace(/^\/+|\/+$/g, '');
  const syllables = py.split(/\s+/);
  const ipaSyllables = ipa.match(/[^\s/]+?\d+(?:-\d+)*/g) || [];
  if (syllables.length === 1) {
    const digits = ipa.match(/(\d+(?:-\d+)*)/);
    const tone = digits && toneClassByValue[Number(digits[1].split('-')[0])];
    return tone ? py + tone : py;
  }
  // 多音节单字面板按来源完整保留；仅当拼音与 IPA 音节可逐一对应时才补调。
  if (ipaSyllables.length === syllables.length) {
    const toned = syllables.map((syl, i) => {
      const digits = ipaSyllables[i].match(/(\d+(?:-\d+)*)$/);
      const tone = digits && toneClassByValue[Number(digits[1].split('-')[0])];
      return tone ? syl + tone : syl;
    });
    if (toned.some((syl, i) => syl !== syllables[i])) return toned.join(' ');
  }
  return py;
}
function cleanIpa(value) {
  return String(value || '').trim().replace(/^\/+|\/+$/g, '');
}
function uniquePush(array, value) {
  if (value && !array.includes(value)) { array.push(value); return true; }
  return false;
}

const sourceChars = [...grouped.keys()].sort((a, b) => a.localeCompare(b, 'zh-Hans-u-co-pinyin'));
const duplicates = sourceChars.filter(c => byChar.has(c) && !priorNewHeadwords.has(c));
const newChars = sourceChars.filter(c => !byChar.has(c) || priorNewHeadwords.has(c));
let addedReadingGroups = 0, normalizedReadingGroups = 0, addedDefinitions = 0, filledPrimaryReadings = 0, normalizedPrimaryReadings = 0, filledIpa = 0;
const noReading = [];
const readingsByChar = new Map();
for (const ch of sourceChars) {
  const rows = grouped.get(ch);
  const readings = [];
  for (const row of rows) uniquePush(readings, readingLabel(row));
  readingsByChar.set(ch, readings);
  if (!readings.length || readings.some(r => !r)) noReading.push(ch);

  let index = byChar.get(ch);
  if (index === undefined) {
    const record = { c: ch, r: '', ipa: '', d: [], x: [], g: [] };
    chars.push(record);
    index = chars.length - 1;
    byChar.set(ch, index);
  }
  const record = chars[index];
  record.d = Array.isArray(record.d) ? record.d : [];
  record.x = Array.isArray(record.x) ? record.x : [];
  record.g = Array.isArray(record.g) ? record.g : [];
  for (const row of rows) if (uniquePush(record.d, String(row.detail || '').trim())) addedDefinitions++;
  for (const label of readings) {
    if (!label) continue;
    // 修正前一轮导入把括号异读末尾右括号裁掉的情况，保留原有词目索引。
    const unclosedVariant = /\(或/.test(label) ? label.replace(/\s*\)$/, '').trimEnd() : '';
    const oldVariantGroup = unclosedVariant && record.g.find(g => String(g[0]).trimEnd() === unclosedVariant);
    if (oldVariantGroup) {
      const exactVariantGroup = record.g.find(g => g[0] === label);
      if (exactVariantGroup) {
        for (const index of oldVariantGroup[1] || []) if (!exactVariantGroup[1].includes(index)) exactVariantGroup[1].push(index);
        record.g.splice(record.g.indexOf(oldVariantGroup), 1);
      } else oldVariantGroup[0] = label;
      normalizedReadingGroups++;
      continue;
    }
    if (record.g.some(g => g[0] === label)) continue;
    record.g.push([label, []]);
    addedReadingGroups++;
  }
  const primaryRow = rows.find(row => normalizeSourcePy(row.py));
  const primaryLabel = primaryRow ? readingLabel(primaryRow) : '';
  if (!record.r && primaryLabel) { record.r = primaryLabel; filledPrimaryReadings++; }
  else if (record.r && primaryRow && primaryLabel && normalizeSourcePy(record.r) === normalizeSourcePy(primaryRow.py) && record.r !== primaryLabel && !/或/.test(primaryRow.py)) {
    record.r = primaryLabel;
    normalizedPrimaryReadings++;
  }
  if (!record.ipa) {
    const ipaRow = rows.find(row => cleanIpa(row.ipa));
    if (ipaRow) { record.ipa = cleanIpa(ipaRow.ipa); filledIpa++; }
  }
}

// 规范前一轮可能导入的调值式组名（如 tshau55 -> tshau1），再按词目音节重建。
for (const record of chars) for (const group of record.g) {
  if (/^[\p{L}]+(?:[,，]?\d+)?$/u.test(group[0])) group[0] = normalizeSourcePy(group[0]);
}
// 对可逐字对齐的词条按该字所在拼音音节重建读音组，修正多音字误归组；不对齐者保留旧索引。
eval(fs.readFileSync('data/entries.js', 'utf8'));
const entries = window.WUU_ENTRIES;
let alignedWordEntries = 0, alignedCharacterAssignments = 0;
const charRecords = new Map(chars.map(c => [c.c, c]));
for (let index = 0; index < entries.length; index++) {
  const entry = entries[index];
  const han = [...entry.w].filter(ch => /\p{Script=Han}/u.test(ch));
  const syllables = String(entry.r || '').trim().split(/\s+/).filter(Boolean).map(token => token.replace(/^[（(［\[]+|[）)］\],，。；;]+$/g, ''));
  if (!han.length || han.length !== syllables.length || syllables.some(syl => !/^[\p{L}]+[1-8]?$/u.test(syl))) continue;
  alignedWordEntries++;
  for (let pos = 0; pos < han.length; pos++) {
    const record = charRecords.get(han[pos]);
    if (!record) continue;
    const reading = syllables[pos];
    for (const group of record.g) group[1] = (group[1] || []).filter(wordIndex => wordIndex !== index);
    let group = record.g.find(g => g[0] === reading);
    if (!group) { group = [reading, []]; record.g.push(group); }
    if (!group[1].includes(index)) group[1].push(index);
    alignedCharacterAssignments++;
  }
}
let resolvedUntonedGroups = 0;
for (const record of chars) {
  const remove = new Set();
  for (const group of record.g) {
    if (!/^[\p{L}]+$/u.test(group[0]) || group[1]?.length) continue;
    const candidates = record.g.filter(other => other !== group && (other[1]?.length || 0) > 0 && other[0].startsWith(group[0]) && /^[\p{L}]+[1-8]$/u.test(other[0]));
    if (candidates.length === 1) { remove.add(group); resolvedUntonedGroups++; }
  }
  const merged = new Map();
  for (const group of record.g) {
    if (remove.has(group) || (!group[0] && !group[1]?.length)) continue;
    const label = group[0];
    if (!merged.has(label)) merged.set(label, [label, []]);
    const target = merged.get(label);
    for (const index of group[1] || []) if (!target[1].includes(index)) target[1].push(index);
  }
  record.g = [...merged.values()];
}

const reportAddedReadingGroups = priorCount('合并后新增读音组') + addedReadingGroups;
const reportAddedDefinitions = priorCount('新增释义/备注文本') + addedDefinitions;
const reportFilledPrimaryReadings = priorCount('补填原本空缺的主读音') + filledPrimaryReadings;
const reportNormalizedPrimaryReadings = priorCount('规范来源中分离调号的主读音') + normalizedPrimaryReadings;
const reportFilledIpa = priorCount('补填 IPA') + filledIpa;
const md = [
  '# 吴语学堂苏州单字重复字清单',
  '',
  `- 来源：${sourceUrl}`,
  `- 使用的本地来源快照：\`${sourceFile}\`（由吴语学堂苏州词典查询页解析；词条面板数 ${parsed.length}）`,
  `- 单字面板记录：${sourceRows.length} 条；去重后单字：${sourceChars.length} 个。`,
  `- 按词条拼音逐字对齐重分组：${alignedWordEntries} 条词条、${alignedCharacterAssignments} 个汉字位置；其余无法可靠逐字对齐的词条保留原分组。`,
  '- 来源未标调的单字读音，仅在与唯一一个有词目支撑的同拼音调类相符时合并；有歧义者保留来源原读音。',
  `- 已存在于网站字头、因此没有另建重复字头：${duplicates.length} 个。重复只表示字头已存在；其吴语学堂读音和释义/备注已合并到现有字头。`,
  `- 新增字头：${newChars.length} 个（${newChars.join('、') || '无'}）。`,
  `- 合并后新增读音组：${reportAddedReadingGroups} 组；新增释义/备注文本：${reportAddedDefinitions} 条；补填原本空缺的主读音：${reportFilledPrimaryReadings} 个；规范来源中分离调号的主读音：${reportNormalizedPrimaryReadings} 个；补填 IPA：${reportFilledIpa} 个。`,
  `- 未能识别出拼音的字：${noReading.length ? noReading.join('、') : '无'}。未能从 IPA 映射到调类的情况保留来源拼音，不臆造调号。`,
  '- “重复字”按字符去重，不按同一字的不同读音、分义项面板重复计数。源面板中的 `detail` 内容作为字头释义/备注合并；已有网站释义保留并按完全相同文本去重。',
  '',
  '## 已有字头（重复字）',
  '',
  '| 字头 | 吴语学堂读音（去重） |',
  '|---|---|',
  ...duplicates.map(ch => `| ${ch} | ${(readingsByChar.get(ch) || []).join('、') || '（来源未识别）'} |`),
  '',
  '## 新增字头',
  '',
  newChars.length ? '| 字头 | 吴语学堂读音 | 来源释义/备注 |\n|---|---|---|' : '无。',
  ...(newChars.length ? newChars.map(ch => `| ${ch} | ${(readingsByChar.get(ch) || []).join('、') || '（来源未识别）'} | ${(grouped.get(ch) || []).map(row => row.detail).filter(Boolean).join('；') || '—'} |`) : []),
  ''
].join('\n');

if (!dryRun) {
  fs.writeFileSync(charsFile, `window.WUU_CHARS=${JSON.stringify(chars)};\n`, 'utf8');
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync(reportFile, md, 'utf8');
}
console.log(JSON.stringify({
  dryRun,
  sourcePanelCount: parsed.length,
  singleCharacterPanels: sourceRows.length,
  uniqueSourceHeadwords: sourceChars.length,
  existingDuplicateHeadwords: duplicates.length,
  newHeadwords: newChars,
  addedReadingGroups,
  addedDefinitions,
  filledPrimaryReadings,
  normalizedPrimaryReadings,
  filledIpa,
  unreadableHeadwords: noReading,
  unreadableSourceRows: noReading.flatMap(ch => (grouped.get(ch) || []).map(row => ({ c: ch, py: row.py, ipa: row.ipa, detail: row.detail }))),
  alignedWordEntries,
  alignedCharacterAssignments,
  resolvedUntonedGroups,
  output: dryRun ? [] : [charsFile, reportFile]
}, null, 2));

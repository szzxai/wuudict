import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const SB = 'C:/Users/WILLIAMYANG/AppData/Local/Temp/chatbox-sandbox/8b4e262a-fab0-4acb-99a3-42400d989c6a/tools/rebuild_data.mjs';
const PROJ = 'E:/WILLIAMYANG/Documents/GitHub/wuudict/tools/rebuild_data.mjs';
let t = fs.readFileSync(SB, 'utf8');
const o = [];
const rep = (name, from, to) => {
  if (!t.includes(from)) { o.push('MISS: ' + name); return; }
  t = t.split(from).join(to);
  o.push('OK: ' + name);
};

rep('IPRHY block',
`  'ʏ': 'ieu', 'iʏ': 'ieu', 'øʏ': 'eu',
  'i': 'i', 'iɑ': 'ia', 'ia': 'ia', 'iaʔ': 'iaeq', 'iã': 'ian', 'iɑ̃': 'iaon',
  'iɑʔ': 'iaq', 'iæ': 'iau', 'iɪ': 'ie', 'ɪ': 'ie', 'in': 'in', 'io': 'io', 'iø': 'ioe',
  'ioŋ': 'ion', 'ioʔ': 'ioq', 'iəʔ': 'iq', 'y': 'iu', 'yəʔ': 'iuq', 'yən': 'iun', 'yn': 'iun',`,
`  'øʏ': 'eu', 'y': 'ieu', 'y\u1DBD': 'iu', '\u1DBD': 'iu',
  'i': 'i', 'i\u1DBD': 'i', 'iɑ': 'ia', 'ia': 'ia', 'iaʔ': 'iaeq', 'iã': 'ian', 'iɑ̃': 'iaon',
  'iɑʔ': 'iaq', 'iæ': 'iau', 'in': 'in', 'io': 'io', 'iø': 'ioe',
  'ioŋ': 'ion', 'ioʔ': 'ioq', 'iəʔ': 'iq', 'yəʔ': 'iuq', 'yən': 'iun', 'yn': 'iun',`);

rep('IPRHY 尾部（含 uᴇ/韵尾/辅音）',
`  'uᴇ': 'ue', 'uɛ': 'ue', 'uən': 'uen', 'uəʔ': 'ueq', 'uø': 'uoe', 'ɿ': 'y', 'ʮ': 'yu',
  'm̩': 'm', 'n̩': 'n', 'ŋ̍': 'ng', 'ŋ̩': 'ng', 'm': 'm', 'n': 'n', 'ŋ': 'ng'
};`,
`  'uᴇ': 'ue', 'uən': 'uen', 'uəʔ': 'ueq', 'uø': 'uoe', 'ɿ': 'y', 'ʮ': 'yu',
  'ŋ̍': 'ng', 'ŋ̩': 'ng', 'm̩': 'm', 'n̩': 'n', 'ŋ': 'ng', 'm': 'm', 'n': 'n',
  'i\u1DBD': 'i', 'y\u1DBD': 'iu',
  'dz': 'j', 'dʑ': 'j', 'ʥ': 'j', 'ʣ': 'j', 'ȵ': 'gn', 'ɲ': 'gn'
};`);

rep('ɦʏ 特判',
`  if (seg === 'ɦʏ') return 'yeu';`,
`  if (seg === 'ɦʏ' || seg === 'ɦy') return 'yeu';
  if (seg === 'ɦy\u1DBD') return 'yu';
  if (seg === 'ɦi\u1DBD') return 'yi';`);

rep('GL_YI',
`  const GL_YI = { '': 'yi', 'ɪ': 'ye',`,
`  const GL_YI = { '': 'yi', '\u1DBD': 'yi', 'i': 'yi', 'ɪ': 'ye',`);

rep('GL_YU',
`  const GL_YU = { '': 'yu', 'ən': 'yun', 'əʔ': 'yuq', 'aʔ': 'yuaeq' };`,
`  const GL_YU = { '\u1DBD': 'yu', 'ən': 'yun', 'n': 'yun', 'əʔ': 'yuq', 'aʔ': 'yuaeq' };`);

fs.writeFileSync(SB, t, 'utf8');
fs.writeFileSync(PROJ, t, 'utf8');
fs.writeFileSync(path.join(path.dirname(SB), 'fix_maps_report.txt'), o.join('\n'), 'utf8');
console.log(o.join('\n'));

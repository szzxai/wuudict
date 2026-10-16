import fs from 'fs';
const p = 'C:/Users/WILLIAMYANG/AppData/Local/Temp/chatbox-sandbox/8b4e262a-fab0-4acb-99a3-42400d989c6a/tools/rebuild_data.mjs';
let lines = fs.readFileSync(p, 'utf8').split('\n');
console.log('BEFORE:', JSON.stringify(lines[364]), JSON.stringify(lines[365]), JSON.stringify(lines[366]));
lines[365] = "const parenLeft = chars.filter(function (c) { return c.g.some(function (g) { return g[0].charAt(0) === '\uFF08'; }); }).length;";
lines[366] = "console.log('\u3000\u62EC\u53F7\u6807\u7B7E\u5408\u5E76\u540E\u6B8B\u7559:', parenLeft);";
fs.writeFileSync(p, lines.join('\n'));
console.log('AFTER:', JSON.stringify(lines[365]), JSON.stringify(lines[366]));

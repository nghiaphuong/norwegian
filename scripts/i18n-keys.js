// Liệt kê các chuỗi giao diện tiếng Việt chưa có bản tiếng Anh trong public/js/lang/en.js.
// Dùng: node scripts/i18n-keys.js        (in các khóa còn thiếu)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'public', 'js');
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.js') && !/pron-data|[\\/]lang[\\/]|i18n\.js$/.test(p)) files.push(p);
  }
})(root);

const VI = /[ăâđêôơưàáảãạèéẻẽẹìíỉĩịòóỏõọùúủũụỳýỷỹỵĂÂĐÊÔƠƯÀÁẢÃẠÈÉẺẼẸÌÍỈĨỊÒÓỎÕỌÙÚỦŨỤỲÝỶỸỴ]/;
const unq = x => x.replace(/\\'/g, "'").replace(/\\"/g, '"');
// Chuỗi tiếng Việt không hiển thị qua t() (nhãn từ loại, dữ liệu nội bộ).
const SKIP = new Set(['danh từ', 'động từ', 'tính từ', 'trạng từ', 'đại từ', 'giới từ', 'liên từ', 'liên từ phụ', 'số từ', 'thán từ', 'từ hạn định', 'cụm từ', 'thành ngữ', 'danh từ riêng', 'phương', 'chào']);

const keys = new Set();
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) keys.add(unq(m[1]));
  // Nhãn trong mảng/đối tượng (dòng không chứa template literal).
  for (const line of s.split('\n')) {
    if (line.includes('`') || /^\s*\/\//.test(line) || /INFL_EN|POS_EN|POS_VI|G_LABEL|dirs =|giống (đực|cái|trung)/.test(line) || /^\s*\['/.test(line)) continue;
    for (const m of line.matchAll(/'((?:[^'\\]|\\.)*)'/g)) if (VI.test(m[1])) keys.add(unq(m[1]));
  }
}

let EN = {};
try {
  const src = fs.readFileSync(path.join(root, 'lang', 'en.js'), 'utf8').replace(/^export default\s*/m, 'module.exports = ');
  const mod = { exports: {} };
  new Function('module', src)(mod);
  EN = mod.exports;
} catch (e) { /* chưa có tệp */ }

const missing = [...keys].filter(k => !SKIP.has(k) && EN[k] === undefined);
if (process.argv.includes('--json')) console.log(JSON.stringify(missing, null, 1));
else {
  console.log(`Tổng ${keys.size} khóa, thiếu EN: ${missing.length}`);
  missing.forEach(k => console.log(k));
}
process.exitCode = missing.length ? 1 : 0;

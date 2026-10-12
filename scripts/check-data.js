// Kiểm tra dữ liệu bài học: JSON hợp lệ, đủ trường, chỉ số câu hỏi nằm trong phạm vi.
const path = require('path');
const dir = path.join(__dirname, '..', 'public', 'data');
const load = n => require(path.join(dir, `${n}.json`));
const errs = [];
const need = (cond, msg) => { if (!cond) errs.push(msg); };

const course = load('course');
const ids = new Set();
for (const u of course.units) {
  for (const l of u.lessons) {
    need(!ids.has(l.id), `trùng id bài ${l.id}`); ids.add(l.id);
    need(l.vocab.length >= 4, `${l.id}: ít hơn 4 từ`);
    l.vocab.forEach((v, i) => need(v.no && v.vi, `${l.id} vocab ${i} thiếu no/vi`));
    l.sentences.forEach((s, i) => need(s.no && s.vi, `${l.id} câu ${i} thiếu no/vi`));
  }
}
for (const t of load('phrasebook').topics) t.items.forEach((x, i) => need(x.no && x.vi, `phrase ${t.id}/${i}`));
for (const s of load('stories').stories) {
  s.lines.forEach((l, i) => need(l.who === 'narrator' || s.characters[l.who], `${s.id} dòng ${i}: nhân vật ${l.who}`));
  s.questions.forEach((q, i) => need(q.after < s.lines.length && q.answer < q.options.length, `${s.id} câu hỏi ${i}`));
}
for (const g of load('grammar').lessons) g.quiz.forEach((q, i) => need(q.answer < q.options.length, `${g.id} quiz ${i}`));
const gl = load('glossary');
gl.forEach((r, i) => need(Array.isArray(r) && r.length === 5, `glossary dòng ${i}`));

console.log(`Chương: ${course.units.length}, bài: ${ids.size}, từ vựng tích hợp: ${gl.length}`);
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log('Dữ liệu hợp lệ');

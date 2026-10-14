// Kiểm tra dữ liệu bài học: JSON hợp lệ, đủ trường, chỉ số câu hỏi nằm trong phạm vi.
const path = require('path');
const dir = path.join(__dirname, '..', 'public', 'data');
const load = n => require(path.join(dir, `${n}.json`));
const errs = [];
const need = (cond, msg) => { if (!cond) errs.push(msg); };

const course = load('course');
const ids = new Set();
const unitIds = new Set();
const LEVELS = ['A1', 'A2', 'B1', 'B2'];
let lastLevel = 0;
const dupIn = (arr, f) => { const seen = new Set(); return arr.map(x => String(x[f] || '').trim().toLowerCase()).filter(k => (seen.has(k) ? true : (seen.add(k), false))); };
for (const u of course.units) {
  need(!unitIds.has(u.id), `trùng id chương ${u.id}`); unitIds.add(u.id);
  const li = LEVELS.indexOf(u.level);
  need(li >= 0, `${u.id}: cấp độ không hợp lệ ${u.level}`);
  need(li >= lastLevel, `${u.id}: thứ tự cấp độ sai (${u.level} sau cấp cao hơn)`); lastLevel = Math.max(lastLevel, li);
  for (const l of u.lessons) {
    need(!ids.has(l.id), `trùng id bài ${l.id}`); ids.add(l.id);
    need(l.vocab.length >= 4, `${l.id}: ít hơn 4 từ`);
    l.vocab.forEach((v, i) => need(v.no && v.vi && v.en && v.pos, `${l.id} vocab ${i} thiếu no/vi/en/pos`));
    l.vocab.forEach((v, i) => need(v.pos !== 'n' || ['m', 'f', 'n'].includes(v.g), `${l.id} vocab ${i} (${v.no}) danh từ thiếu giống`));
    l.sentences.forEach((s, i) => need(s.no && s.vi && /[.!?]$/.test(s.no.trim()), `${l.id} câu ${i} thiếu no/vi hoặc dấu kết câu`));
    // Nghĩa dùng làm phương án trắc nghiệm nên không được trùng trong một bài.
    for (const f of ['no', 'vi', 'en']) { const d = dupIn(l.vocab, f); need(!d.length, `${l.id}: từ vựng trùng ${f}: ${d.join(', ')}`); }
    for (const f of ['vi', 'en']) { const d = dupIn(l.sentences, f); need(!d.length, `${l.id}: câu trùng ${f}: ${d.join(', ')}`); }
  }
}
// Không dùng dấu gạch ngang dài trong nội dung.
for (const n of ['course', 'phrasebook', 'stories', 'grammar']) {
  const raw = JSON.stringify(load(n));
  need(!raw.includes('—'), `${n}.json có dấu gạch ngang dài (—)`);
}
for (const t of load('phrasebook').topics) t.items.forEach((x, i) => need(x.no && x.vi, `phrase ${t.id}/${i}`));
for (const s of load('stories').stories) {
  s.lines.forEach((l, i) => need(l.who === 'narrator' || s.characters[l.who], `${s.id} dòng ${i}: nhân vật ${l.who}`));
  s.questions.forEach((q, i) => need(q.after < s.lines.length && q.answer < q.options.length, `${s.id} câu hỏi ${i}`));
}
for (const g of load('grammar').lessons) g.quiz.forEach((q, i) => need(q.answer < q.options.length, `${g.id} quiz ${i}`));
const gl = load('glossary');
gl.forEach((r, i) => need(Array.isArray(r) && r.length === 5, `glossary dòng ${i}`));

// Bản tiếng Anh của nội dung
for (const u of course.units) { need(u.title_en, `${u.id} thiếu title_en`); for (const l of u.lessons) { l.vocab.forEach((v, i) => need(v.en, `${l.id} vocab ${i} thiếu en`)); l.sentences.forEach((x, i) => need(x.en && (!x.tip || x.tip_en), `${l.id} câu ${i} thiếu en/tip_en`)); } }
for (const tp of load('phrasebook').topics) { need(tp.title_en, `phrase ${tp.id} thiếu title_en`); tp.items.forEach((x, i) => need(x.en, `phrase ${tp.id}/${i} thiếu en`)); }
for (const s of load('stories').stories) { s.lines.forEach((l, i) => need(l.en, `${s.id} dòng ${i} thiếu en`)); s.questions.forEach((q, i) => need(q.q_en && q.options_en?.length === q.options.length, `${s.id} câu hỏi ${i} thiếu bản EN`)); }
for (const g of load('grammar').lessons) { need(g.title_en, `${g.id} thiếu title_en`); g.sections.forEach((x, i) => need(x.body_en, `${g.id} mục ${i} thiếu body_en`)); g.quiz.forEach((q, i) => need(q.q_en && q.options_en?.length === q.options.length, `${g.id} quiz ${i} thiếu bản EN`)); }

console.log(`Chương: ${course.units.length}, bài: ${ids.size}, từ vựng tích hợp: ${gl.length}`);
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log('Dữ liệu hợp lệ');

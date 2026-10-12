// Bộ kiểm thử toàn bộ chức năng, chạy bên trong trang (localhost, dữ liệu thử).
const sleep = ms => new Promise(r => setTimeout(r, ms));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const UA = navigator.userAgent;
const BR = UA.includes('Firefox') ? 'ff' : UA.includes('Edg/') ? 'edge' : UA.includes('OPR') ? 'opera' : 'chrome';
const MOBILE = innerWidth < 500;
const results = []; const t00 = performance.now();
async function test(name, fn) {
  const errsBefore = (window.__errs || []).length; const t = performance.now();
  try { const info = await fn(); const newErrs = (window.__errs || []).slice(errsBefore); results.push({ name, ok: !newErrs.length, ms: Math.round(performance.now() - t), ...(info ? { info } : {}), ...(newErrs.length ? { jsErrors: newErrs } : {}) }); }
  catch (e) { results.push({ name, ok: false, ms: Math.round(performance.now() - t), fail: String(e?.message || e).slice(0, 400), jsErrors: (window.__errs || []).slice(errsBefore) }); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };
async function waitFor(fn, ms = 6000, msg = 'timeout') { const t = performance.now(); while (performance.now() - t < ms) { try { const v = await fn(); if (v) return v; } catch (e) { /* */ } await sleep(50); } throw new Error(msg); }
async function go(hash, settle = 350) { location.hash = '#/' + hash; await sleep(settle); }
const mainText = () => $('#main').innerText;
const VI_RE = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const typeInto = (el, v) => { el.focus(); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };

await waitFor(() => $('#sideNav a') || $('#tabbar a'), 8000, 'app không khởi động');
const { mean, lang } = await import('/js/i18n.js');
const { store } = await import('/js/store.js');
const appMod = await import('/js/app.js');
// Bộ kiểm thử làm bài rất nhanh: dùng giọng thiết bị để không gửi hàng trăm yêu cầu đọc/phút tới máy chủ TTS
// (giọng trực tuyến có bài kiểm tra riêng: scripts/qa/voice.js).
store.s.settings.voiceMode = 'device'; store.save(true);

// ---------- Bộ giải bài tập ----------
async function solve(max = 160) {
  const main = $('#main');
  for (let s = 0; s < max; s++) {
    await sleep(45);
    if ($('#pDone')) return true;
    const m = $('#pMain');
    if (m && $('.p-foot.ok, .p-foot.bad')) { if ($('.p-foot.bad')) throw new Error('trả lời đúng mà bị chấm sai: ' + main._cur?.type + ' ' + JSON.stringify(main._cur?.item?.no)); m.click(); continue; }
    const c = main._cur; if (!c) continue;
    if (c.type === 'match') { const o = $$('.match .opt'); for (const l of o.filter(x => x.dataset.side === 'l')) { l.click(); const r = o.find(x => x.dataset.side === 'r' && x.dataset.k === l.dataset.k); assert(r, 'thiếu cặp ghép ' + l.dataset.k); r.click(); await sleep(15); } continue; }
    if (c.type === 'speak') { $('#pSkipSpeak').click(); continue; }
    const pick = v => { const o = $$('.opts .opt').find(x => x.dataset.v === v); assert(o, `không có đáp án đúng (${c.type}): ${v}`); o.click(); };
    if (c.type === 'pick_vi') pick(mean(c.item));
    if (c.type === 'pick_no' || c.type === 'listen_pick') pick(c.item.no);
    if (c.type === 'cloze') pick(c.answer);
    if (c.type === 'build') { const w = c.item.no.replace(/[.!?]+$/, '').split(/\s+/).map(x => x.replace(/[,;:«»"“”]/g, '')); const tiles = $$('#bank .wtile'); for (const x of w) { const tl = tiles.find(y => !y.classList.contains('used') && y.textContent === x); assert(tl, `thiếu thẻ chữ "${x}" trong "${c.item.no}"`); tl.click(); } }
    if (c.type === 'dictation' || c.type === 'type_no') typeInto($('textarea.answer, input.answer'), c.item.no);
    await sleep(20); const b = $('#pMain'); if (b && !b.disabled) b.click();
  }
  throw new Error('bài học không kết thúc, đang ở ' + main._cur?.type);
}
async function finishLesson() { const d = $('#pDone'); const h = location.hash; d.click(); await waitFor(() => location.hash !== h || !$('#pDone'), 4000, 'nút Tiếp tục không hoạt động'); await sleep(250); $('#modal [data-close]')?.click(); }

if (!MOBILE) {
  // ================= 1. KHÁCH: TRANG CHUNG =================
  await test('Mặc định tiếng Anh', async () => { assert(lang() === 'en', 'lang=' + lang()); assert(document.documentElement.lang === 'en', 'html lang'); assert(/Learn Norwegian/.test(document.title), document.title); });
  await test('Tài nguyên tĩnh (icon, manifest, sw)', async () => {
    for (const u of ['/manifest.webmanifest', '/icons/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png', '/sw.js', '/data/glossary.json', '/data/course.json', '/data/phrasebook.json', '/data/stories.json', '/data/grammar.json']) { const r = await fetch(u); assert(r.ok, u + ' ' + r.status); }
  });
  const ROUTES = ['', 'path', 'review', 'review?tab=words', 'review?tab=mistakes', 'dict', 'phrases', 'phrases/intro', 'pron', 'pron?tab=guide', 'pron?tab=pairs', 'stories', 'grammar', 'grammar/g1', 'tutor', 'me', 'more'];
  await test('Mọi trang hiển thị, không sót tiếng Việt (EN)', async () => {
    const bad = {};
    for (const r of ROUTES) {
      await go(r, 450);
      assert(!/Không tải được trang này|This page could not be loaded/.test(mainText()), 'lỗi tải trang ' + r);
      const lines = (mainText() + '\n' + $('#sideNav').innerText + '\n' + $('#rail').innerText).split('\n').filter(l => VI_RE.test(l) && !/Tiếng Việt|Ngôn ngữ|^VI:/.test(l));
      if (lines.length) bad[r || 'home'] = lines.slice(0, 3);
    }
    assert(!Object.keys(bad).length, 'còn tiếng Việt: ' + JSON.stringify(bad));
  });

  // ================= 2. BÀI HỌC =================
  const course = await (await fetch('/data/course.json')).json();
  const ids = course.units.flatMap(u => [...u.lessons.map(l => l.id), u.id + '-check']);
  await test(`Làm hết ${ids.length} bài học (EN)`, async () => {
    const fails = [];
    for (const id of ids) {
      await go('learn/' + id, 300);
      try { await solve(); await finishLesson(); } catch (e) { fails.push(id + ': ' + e.message); location.hash = '#/'; await sleep(300); }
    }
    assert(!fails.length, fails.slice(0, 5).join(' | '));
    return { xp: store.totalXp(), lessonsDone: Object.keys(store.s.lessons).length, cards: Object.keys(store.s.cards).length };
  });
  await test('Huy hiệu được trao', async () => { assert(store.s.badges['first-lesson'] && store.s.badges['lessons-30'], JSON.stringify(Object.keys(store.s.badges))); });
  await test('Lộ trình: trạng thái nút & hộp thoại bài', async () => {
    await go('path', 500);
    assert($$('.node').length === ids.length, 'số nút ' + $$('.node').length);
    $$('.node')[0].click(); await sleep(200);
    assert($('#modal .modal-card a[href^="#/learn/"]'), 'không mở hộp thoại bài');
    $('#modal [data-close]').click(); await sleep(100);
    assert($('#modal').hidden, 'hộp thoại không đóng');
    $('[data-guide]').click(); await sleep(200); assert($$('#modal .row').length > 5, 'không có danh sách từ vựng'); $('#modal [data-close]').click();
  });
  await test('Luyện lỗi sai / luyện nghe', async () => {
    store.addMistake({ no: 'Jeg heter Phuong.', vi: 'Tôi tên là Phương.', en: 'My name is Phuong.' }); store.addMistake({ no: 'et hus', vi: 'ngôi nhà', en: 'house' }); store.save(true);
    await go('learn/mistakes', 400); await solve(); await finishLesson();
    await go('learn/listen', 400); await solve(); await finishLesson();
  });
  await test('Thoát bài giữa chừng', async () => {
    await go('learn/u3l1', 400); const orig = window.confirm; window.confirm = () => true;
    $('#pQuit').click(); await sleep(400); window.confirm = orig;
    assert(!document.body.classList.contains('in-player'), 'vẫn ở chế độ làm bài');
  });

  // ================= 3. ÔN TẬP =================
  await test('Ôn thẻ: lật, chấm điểm, phím tắt', async () => {
    Object.values(store.s.cards).slice(0, 12).forEach(c => { c.due = Date.now() - 1000; }); store.save(true);
    await go('review', 400); $('#go').click(); await sleep(200);
    let n = 0;
    while ($('#fl') && n < 40) { document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); await sleep(30); assert($('#fl').classList.contains('flipped'), 'Space không lật thẻ'); document.dispatchEvent(new KeyboardEvent('keydown', { key: String(1 + (n % 4)) })); await sleep(40); n++; }
    assert(/\+\d+ XP/.test(mainText()), 'không có màn hình kết thúc');
    $('#again').click(); return { cardsReviewed: n };
  });
  await test('Ôn ngược (nghĩa → Na Uy)', async () => {
    Object.values(store.s.cards).slice(0, 3).forEach(c => { c.due = Date.now() - 1000; }); store.save(true);
    await go('review', 400); $('#dir').click(); await sleep(200); $('#fl').click(); await sleep(50); $('[data-g="3"]').click(); await sleep(100);
  });
  await test('Sổ từ: thêm, tìm, xóa', async () => {
    await go('review?tab=words', 400); $('#add').click(); await sleep(150);
    typeInto($('#aNo'), 'en qa-ord'); typeInto($('#aVi'), 'qa meaning'); $('#aOk').click(); await sleep(200);
    typeInto($('#q'), 'qa-ord'); await sleep(100); assert($$('#wl .row').length === 1, 'tìm thấy ' + $$('#wl .row').length);
    const orig = window.confirm; window.confirm = () => true; $('#wl [data-del]').click(); window.confirm = orig; await sleep(150);
    assert(!store.s.cards['qa-ord'], 'chưa xóa');
  });

  // ================= 4. TỪ ĐIỂN =================
  await test('Từ điển: gợi ý, tra Na Uy (huset → hus)', async () => {
    await go('dict', 400); const inp = $('#dq'); typeInto(inp, 'hyg'); await waitFor(() => !$('#dsug').hidden && $$('#dsug button').length, 5000, 'không có gợi ý');
    await go('dict/huset', 300); await waitFor(() => $$('#online section').length, 10000, 'không có kết quả Bokmålsordboka');
    assert(/hus/.test($('#online section h2').textContent), 'mục đầu không phải hus: ' + $('#online section h2').textContent);
    assert($$('.infl tr').length >= 4, 'thiếu bảng biến cách');
    await waitFor(() => $$('.defs .tr').some(e => e.textContent.trim()), 10000, 'không dịch nghĩa');
  });
  await test('Từ điển: tra ngược en: và vi:, dịch câu', async () => {
    await go('dict/en:house', 900); assert($$('.vi-results .row').length, 'en:house không có kết quả');
    await go('dict/vi:cảm ơn', 900); assert($$('.vi-results .row').some(r => /takk/.test(r.innerText)), 'vi:cảm ơn thiếu takk');
    await go('dict', 400); typeInto($('#trIn'), 'Jeg bor i Oslo'); $('#trGo').click(); await waitFor(() => !$('#trOut .typing') && $('#trOut').innerText.trim().length > 3, 10000, 'không dịch được câu');
    return { translation: $('#trOut').innerText.split('\n')[0] };
  });
  await test('Từ điển: lưu thẻ', async () => {
    await go('dict/katt', 300); await waitFor(() => $('[data-save]'), 10000, 'không có nút lưu');
    const n0 = Object.keys(store.s.cards).length; const op = window.prompt; window.prompt = () => 'cat';
    $('[data-save]').click(); window.prompt = op; await sleep(150);
    assert(Object.keys(store.s.cards).length === n0 + 1 || store.s.cards.katt, 'chưa lưu thẻ');
  });
  await test('Chạm từ xem nghĩa (popover)', async () => {
    await go('phrases/intro', 400); $('.tw').click(); await sleep(250);
    assert(!$('#pop').hidden && $('#pop').innerText.length > 3, 'popover không hiện');
    window.dispatchEvent(new Event('scroll')); await sleep(50); assert($('#pop').hidden, 'popover không ẩn khi cuộn');
  });

  // ================= 5. CÂU GIAO TIẾP & PHÁT ÂM =================
  await test('Câu giao tiếp: thuộc câu, nhại theo, nghe hiểu, bài tập', async () => {
    await go('phrases/kiwi', 400); $('[data-act="learn"]').click(); await sleep(100); assert(store.s.phrases.length >= 1, 'chưa đánh dấu');
    $('[data-m="shadow"]').click(); await sleep(100); $('#sStart').click(); await sleep(400); assert($('#sStart').textContent !== '', 'nút'); $('#sStart').click(); await sleep(100);
    $('[data-m="quiz"]').click(); await sleep(100); $('#qStart').click(); await sleep(150);
    for (let i = 0; i < 20 && $('.opt'); i++) { $('.opt').click(); await sleep(60); $('#qNext')?.click(); await sleep(60); }
    assert($('#qAgain'), 'quiz không kết thúc');
    await go('learn/phrases/kiwi', 400); await solve(); await finishLesson();
  });
  await test('Phát âm: gõ câu, mẹo, đánh vần, bảng âm, cặp âm', async () => {
    await go('pron', 400); typeInto($('#ptxt'), 'Hvor er kjøkkenet?'); await sleep(400);
    assert($$('#pwords .word').length === 3, 'từng từ'); assert($$('#phints li').length >= 2, 'mẹo đọc');
    $('#pplay').click(); $('#pstop').click();
    await go('pron?tab=guide', 400); assert($$('.g').length > 60, 'bảng âm thiếu dòng');
    await go('pron?tab=pairs', 400); $('#st').click(); await sleep(100);
    for (let i = 0; i < 12 && !$('#again'); i++) { $('.opt')?.click(); await sleep(50); $('#nx')?.click(); await sleep(50); }
    assert($('#again'), 'cặp âm không kết thúc');
  });

  // ================= 6. TRUYỆN & NGỮ PHÁP =================
  await test('Đọc hết 10 truyện', async () => {
    const st = await (await fetch('/data/stories.json')).json(); const fails = [];
    for (const s of st.stories) {
      await go('stories/' + s.id, 400);
      for (let i = 0; i < 80; i++) { const b = $('#snext'); if (!b || b.dataset.done) break; if (b.disabled) { $('.q-card .opt:not([disabled])')?.click(); await sleep(40); } b.click(); await sleep(35); }
      if (!$('.done-screen')) fails.push(s.id);
    }
    assert(!fails.length, 'không xong: ' + fails); assert(Object.keys(store.s.stories).length === 10, 'chưa lưu đủ');
  });
  await test('Làm hết 14 bài ngữ pháp', async () => {
    const fails = [];
    for (let i = 1; i <= 14; i++) {
      await go('grammar/g' + i, 400);
      for (let k = 0; k < 10 && !$('#redo'); k++) { $('#gq .opt')?.click(); await sleep(40); $('#gn')?.click(); await sleep(40); }
      if (!$('#redo')) fails.push('g' + i);
    }
    assert(!fails.length, fails); assert(Object.keys(store.s.grammar).length === 14, 'chưa lưu đủ');
  });

  // ================= 7. HỒ SƠ & CÀI ĐẶT =================
  await test('Cài đặt: mục tiêu, giao diện tối/sáng, âm thanh', async () => {
    await go('me', 500); $('#goal [data-g="50"]').click(); await sleep(100); assert(store.s.settings.dailyGoal === 50, 'goal');
    $('#theme [data-t="dark"]').click(); await sleep(100); assert(document.documentElement.dataset.theme === 'dark', 'dark');
    const bg = getComputedStyle(document.body).backgroundColor;
    $('#theme [data-t="light"]').click(); await sleep(100); assert(getComputedStyle(document.body).backgroundColor !== bg, 'màu nền không đổi');
    $('#theme [data-t="auto"]').click(); $('#sfx').click(); $('#sfx').click();
  });
  await test('Đổi ngôn ngữ EN ⇄ VI', async () => {
    $('[data-lang="vi"]').click(); await sleep(500);
    assert(lang() === 'vi' && /Hôm nay/.test($('#sideNav').innerText), 'không sang VI');
    await go('path', 400); assert(/Chào hỏi/.test(mainText()), 'nội dung chưa VI');
    await go('learn/u1l1', 400); await solve(); await finishLesson();
    $('[data-lang="en"]').click(); await sleep(400); assert(lang() === 'en' && /Today/.test($('#sideNav').innerText), 'không về EN');
  });
  await test('Sao lưu dữ liệu (xuất JSON)', async () => {
    await go('me', 400); let blobOk = false; const oc = URL.createObjectURL; URL.createObjectURL = b => { blobOk = b.size > 500; return oc.call(URL, b); };
    $('#exp').click(); URL.createObjectURL = oc; assert(blobOk, 'không tạo được tệp');
  });

  // ================= 8. TÀI KHOẢN, ĐỒNG BỘ =================
  const ADMIN = { username: 'qa-admin', password: 'qa-admin-pass' };
  const api = (p, o = {}) => fetch('/api' + p, { method: o.method || (o.body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', 'X-Lang': 'en' }, body: o.body ? JSON.stringify(o.body) : undefined, credentials: o.omit ? 'omit' : 'same-origin' }).then(async r => ({ status: r.status, d: await r.json().catch(() => ({})) }));
  await test('Đăng ký / đăng nhập qua form', async () => {
    await go('me', 500);
    const form = $('#aform'); assert(form, 'không có form đăng nhập');
    const login = await api('/auth/login', { body: ADMIN, omit: true });
    if (login.status === 401) { $('[data-m="register"]').click(); await sleep(100); form.elements.name.value = 'QA Admin'; }
    form.elements.username.value = ADMIN.username; form.elements.password.value = ADMIN.password;
    form.requestSubmit(); await waitFor(() => store.user, 6000, 'không đăng nhập được');
    await waitFor(() => !$('#aform'), 3000, 'form vẫn còn');
    return { admin: store.user.admin };
  });
  await test('Đồng bộ tiến độ lên máy chủ', async () => {
    const xp = store.totalXp(); store.addXp(3);
    await store.push(); const r = await api('/state');
    const sx = Object.values(r.d.state.xpByDay).reduce((a, b) => a + b, 0);
    assert(sx >= xp + 3, `máy chủ ${sx} < ${xp + 3}`);
  });
  await test('Bảng xếp hạng & cột phải', async () => {
    await go('', 800); await waitFor(() => $('#railBoard .board') || innerWidth < 1280, 5000, 'bảng xếp hạng không hiện');
    const r = await api('/leaderboard'); assert(r.d.rows.some(x => x.me), 'không thấy chính mình');
  });
  await test('Đổi tên hiển thị', async () => {
    await go('me', 500); typeInto($('#pname'), 'QA Admin ' + BR); $('#psave').click(); await sleep(400);
    const c = await api('/config'); assert(c.d.user.name === 'QA Admin ' + BR, c.d.user.name);
  });

  // ================= 9. QUẢN TRỊ =================
  await test('Quản trị: tổng quan', async () => {
    assert(store.user.admin, 'qa-admin không phải admin');
    await go('admin', 900); assert($$('.stat-boxes .sbox').length === 8, 'thiếu ô thống kê'); assert($$('.achart').length === 2, 'thiếu biểu đồ');
  });
  const NEWU = 'qa-' + BR + '-' + Date.now().toString(36).slice(-4);
  await test('Quản trị: thêm người dùng qua form', async () => {
    await go('admin/users', 900); $('#uadd').click(); await sleep(200);
    const f = $('#uform'); typeInto(f.elements.namedItem('name'), 'Trần QA ' + BR); await sleep(50);
    assert(/^tran\.qa/.test(f.elements.namedItem('username').value), 'không gợi ý tên đăng nhập: ' + f.elements.namedItem('username').value);
    typeInto(f.elements.namedItem('username'), NEWU); f.requestSubmit();
    await waitFor(() => $('#npw'), 5000, 'không hiện mật khẩu mới');
    const pw = $('#npw').textContent; $('#modal [data-close]').click();
    const l = await api('/auth/login', { body: { username: NEWU, password: pw }, omit: true }); assert(l.status === 200, 'mật khẩu mới không đăng nhập được');
    await waitFor(() => $$('#ub tr').some(r => r.innerText.includes(NEWU)), 5000, 'danh sách chưa có người mới');
  });
  await test('Quản trị: sửa, khóa, mở khóa người dùng', async () => {
    const row = $$('#ub tr').find(r => r.innerText.includes(NEWU)); row.querySelector('[data-edit]').click(); await sleep(200);
    const f = $('#uform'); typeInto(f.elements.namedItem('name'), 'QA Edited'); typeInto(f.elements.namedItem('password'), 'newpass-123'); f.elements.namedItem('is_disabled').checked = true; f.requestSubmit(); await sleep(800);
    const l = await api('/auth/login', { body: { username: NEWU, password: 'newpass-123' }, omit: true }); assert(l.status === 403, 'người bị khóa vẫn đăng nhập: ' + l.status);
    const row2 = $$('#ub tr').find(r => r.innerText.includes(NEWU)); assert(/QA Edited/.test(row2.innerText), 'tên chưa đổi'); row2.querySelector('[data-edit]').click(); await sleep(200);
    const f2 = $('#uform'); f2.elements.namedItem('is_disabled').checked = false; f2.requestSubmit(); await sleep(600);
    const l2 = await api('/auth/login', { body: { username: NEWU, password: 'newpass-123' }, omit: true }); assert(l2.status === 200, 'mở khóa không được');
  });
  await test('Quản trị: chi tiết, lọc, sắp xếp, CSV', async () => {
    $$('#ub tr').find(r => r.innerText.includes('qa-admin')).click(); await waitFor(() => $('.admin-user-head'), 5000, 'không mở chi tiết');
    assert($$('.unit-row').length === 14, 'thiếu tiến độ chương'); assert(!$('[data-act="delete"]'), 'có nút xóa chính mình');
    await go('admin/users', 800); $('[data-f="admin"]').click(); await sleep(100); assert($$('#ub tr').every(r => /admin/.test(r.innerText)), 'lọc admin sai');
    $('[data-f="all"]').click(); $('th[data-s="totalXp"]').click(); await sleep(100);
    const csv = await (await fetch('/api/admin/users.csv')).text(); assert(csv.includes(NEWU) && csv.split('\n').length >= 3, 'CSV thiếu');
  });
  await test('Quản trị: cài đặt đăng ký (mã mời, đóng, mở)', async () => {
    await go('admin/settings', 700); $('[data-m="invite"]').click(); typeInto($('#ic'), 'qa-code-' + BR); $('#rsSave').click(); await sleep(600);
    let c = await api('/config'); assert(c.d.invite && c.d.registration === 'invite', 'chưa bật mã mời');
    const bad = await api('/auth/register', { body: { username: NEWU + 'x', password: 'abcdef', invite: 'sai' }, omit: true }); assert(bad.status === 403, 'mã mời sai vẫn đăng ký');
    await go('admin/settings', 600); $('[data-m="closed"]').click(); $('#rsSave').click(); await sleep(600);
    c = await api('/config'); assert(c.d.registration === 'closed', 'chưa đóng');
    await go('admin/settings', 600); $('[data-m="open"]').click(); typeInto($('#ic'), ''); $('#rsSave').click(); await sleep(600);
    c = await api('/config'); assert(c.d.registration === 'open', 'chưa mở lại');
  });
  await test('Quản trị: xóa người dùng', async () => {
    await go('admin/users', 800); const op = window.prompt; window.prompt = () => NEWU;
    $$('#ub tr').find(r => r.innerText.includes(NEWU)).querySelector('[data-del]').click(); window.prompt = op;
    await waitFor(() => !$$('#ub tr').some(r => r.innerText.includes(NEWU)), 5000, 'chưa xóa');
  });
  await test('Người thường không vào được quản trị', async () => {
    const r = await api('/admin/overview', { omit: true }); assert(r.status === 401, 'khách: ' + r.status);
  });
  await test('Chuyển trang lặp lại không rò rỉ', async () => {
    const before = $$('*').length;
    for (let i = 0; i < 30; i++) { await go(['path', 'review', '', 'dict', 'admin'][i % 5], 120); }
    let renders = 0; const m = $('#modal'); const d = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    Object.defineProperty(m, 'innerHTML', { set(v) { if (v) renders++; d.set.call(this, v); }, get() { return d.get.call(this); }, configurable: true });
    await go('path', 400); $('.node').click(); await sleep(200); delete m.innerHTML; $('#modal [data-close]')?.click();
    assert(renders === 1, 'hộp thoại vẽ ' + renders + ' lần');
    return { domNodes: [before, $$('*').length] };
  });
} else {
  // ================= ĐIỆN THOẠI: BỐ CỤC =================
  const ROUTES = ['', 'path', 'review', 'review?tab=words', 'dict', 'dict/hus', 'phrases', 'phrases/intro', 'pron', 'pron?tab=guide', 'pron?tab=pairs', 'stories', 'grammar', 'grammar/g3', 'tutor', 'me', 'more', 'learn/u1l1', 'stories/s1'];
  await test('Điện thoại: không tràn ngang trên mọi trang', async () => {
    const bad = {};
    for (const r of ROUTES) {
      await go(r, r.startsWith('dict/') ? 2500 : 500);
      const sw = document.documentElement.scrollWidth;
      if (sw > innerWidth + 1) { const wide = $$('#main *').filter(e => e.getBoundingClientRect().right > innerWidth + 1).slice(0, 3).map(e => e.tagName + '.' + String(e.className).slice(0, 30)); bad[r || 'home'] = { sw, wide }; }
    }
    assert(!Object.keys(bad).length, JSON.stringify(bad));
  });
  await test('Điện thoại: thanh tab dưới và menu Thêm', async () => {
    await go('', 400); assert(getComputedStyle($('#tabbar')).display !== 'none', 'thiếu thanh tab'); assert(getComputedStyle($('.sidebar')).display === 'none', 'sidebar vẫn hiện');
    $$('#tabbar .tab')[4].click(); await sleep(400); assert(location.hash === '#/more' && $$('#main .row').length >= 7, 'menu Thêm');
    await go('learn/u1l1', 500); assert(getComputedStyle($('#tabbar')).display === 'none', 'tab bar che bài học');
    const foot = $('.p-foot').getBoundingClientRect(); assert(foot.bottom <= innerHeight + 1, 'nút kiểm tra bị khuất');
    await solve(); await finishLesson();
  });
  await test('Điện thoại: chữ đủ lớn, nút đủ to', async () => {
    await go('learn/u2l1', 500);
    const small = $$('.opt, .btn, .tab, .wtile').filter(e => e.offsetParent && e.getBoundingClientRect().height < 32).map(e => e.className).slice(0, 5);
    assert(!small.length, 'nút nhỏ hơn 32px: ' + small);
    location.hash = '#/'; await sleep(300);
  });
}
return { browser: BR, mobile: MOBILE, totalMs: Math.round(performance.now() - t00), passed: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, results, pendingErrors: (window.__errs || []).slice(0, 10) };

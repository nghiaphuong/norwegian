// Hồ sơ: tài khoản, thống kê, bảng xếp hạng, huy hiệu, cài đặt, sao lưu dữ liệu.
import { $, $$, esc, ICON, api, toast } from '../ui.js';
import { store, BADGES } from '../store.js';
import { app, switchLang, mountBoard } from '../app.js';
import { tts } from '../speech.js';
import { getCourse, progress } from '../course.js';
import { t, lang, locale } from '../i18n.js';

export async function render(main, params, query) {
  const course = await getCourse();
  const s = store.s;
  const pr = progress(course);
  const acc = s.stats.answers ? Math.round(s.stats.correct / s.stats.answers * 100) : 0;
  const mins = Math.round(s.stats.seconds / 60);

  main.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>${store.user ? esc(store.user.name) : t('Hồ sơ')}</h1><p>${store.user ? `@${esc(store.user.username)} · ${t('tiến độ được đồng bộ trên mọi thiết bị')}` : app.config.db ? t('Đang dùng chế độ khách: tiến độ chỉ lưu trên trình duyệt này.') : t('Tiến độ được lưu trên trình duyệt này.')}</p></div>
    ${store.user ? `<button class="btn" id="logout">${t('Đăng xuất')}</button>` : ''}</div>

    ${!store.user && app.config.db ? `<section class="card" id="auth" style="margin-bottom:18px">
      <div class="seg" id="amode" style="margin-bottom:14px"><button data-m="login" aria-pressed="true">${t('Đăng nhập')}</button>${app.config.registration === 'closed' ? '' : `<button data-m="register" aria-pressed="false">${t('Tạo tài khoản')}</button>`}</div>
      <form id="aform">
        <label class="field reg" hidden>${t('Tên hiển thị')}<input type="text" name="name" placeholder="${t('vd: Phương')}" autocomplete="nickname"></label>
        <label class="field">${t('Tên đăng nhập')}<input type="text" name="username" autocomplete="username" autocapitalize="off" required></label>
        <label class="field">${t('Mật khẩu')}<input type="password" name="password" autocomplete="current-password" required></label>
        ${app.config.invite ? `<label class="field reg" hidden>${t('Mã mời')}<input type="text" name="invite"></label>` : ''}
        <button class="btn primary block" type="submit" id="asub">${t('Đăng nhập')}</button>
        <p class="muted small" style="margin-top:10px">${t('Tiến độ đang có trên máy này sẽ được gộp vào tài khoản, không bị mất.')}</p>
      </form></section>` : ''}

    <div class="stat-boxes">
      <div class="sbox"><b>🔥 ${store.streak()}</b><small>${t('chuỗi hiện tại · kỷ lục {n}', { n: store.bestStreak() })}</small></div>
      <div class="sbox"><b>⚡ ${store.totalXp().toLocaleString(locale())}</b><small>${t('tổng XP')}</small></div>
      <div class="sbox"><b>${pr.done}/${pr.total}</b><small>${t('bài học')}</small></div>
      <div class="sbox"><b>${Object.keys(s.cards).length}</b><small>${t('thẻ từ')}</small></div>
      <div class="sbox"><b>${acc}%</b><small>${t('trả lời đúng ({n})', { n: s.stats.answers })}</small></div>
      <div class="sbox"><b>${mins}</b><small>${t('phút luyện tập')}</small></div>
      <div class="sbox"><b>${Object.keys(s.stories).length}</b><small>${t('truyện đã đọc')}</small></div>
      <div class="sbox"><b>${Object.keys(s.grammar).length}</b><small>${t('bài ngữ pháp')}</small></div>
    </div>

    ${app.config.db ? `<div class="section-title"><h2>${t('Bảng xếp hạng')}</h2></div><section class="card" id="board"></section>` : ''}

    <div class="section-title"><h2>${t('Huy hiệu')}</h2><span class="muted small">${Object.keys(BADGES).filter(k => s.badges[k]).length}/${Object.keys(BADGES).length}</span></div>
    <div class="badges">${Object.entries(BADGES).map(([k, [ic, ti, d]]) => `<div class="badge ${s.badges[k] ? '' : 'locked'}" title="${esc(t(d))}"><span>${ic}</span><b>${esc(t(ti))}</b><small>${esc(t(d))}</small></div>`).join('')}</div>

    <div class="section-title"><h2>${t('Cài đặt')}</h2></div>
    <div class="list settings-list">
      <div class="row"><div><b>${t('Ngôn ngữ giao diện')}</b><div class="vi">Language · Ngôn ngữ</div></div><div class="seg" id="lang"><button data-l="en" aria-pressed="${lang() === 'en'}">English</button><button data-l="vi" aria-pressed="${lang() === 'vi'}">Tiếng Việt</button></div></div>
      <div class="row"><div><b>${t('Mục tiêu mỗi ngày')}</b><div class="vi">${t('Số XP cần đạt để giữ nhịp học')}</div></div><div class="seg" id="goal">${[10, 20, 30, 50, 80].map(g => `<button data-g="${g}" aria-pressed="${s.settings.dailyGoal === g}">${g}</button>`).join('')}</div></div>
      <div class="row"><div><b>${t('Giao diện')}</b></div><div class="seg" id="theme">${[['auto', 'Tự động'], ['light', 'Sáng'], ['dark', 'Tối']].map(([k, ti]) => `<button data-t="${k}" aria-pressed="${s.settings.theme === k}">${t(ti)}</button>`).join('')}</div></div>
      <div class="row"><div><b>${t('Tốc độ đọc')}</b><div class="vi" id="rv">${s.settings.rate}×</div></div><input type="range" id="rate" min="0.5" max="1.2" step="0.05" value="${s.settings.rate}" style="accent-color:var(--deep);width:180px"></div>
      <div class="row"><div><b>${t('Nguồn giọng đọc')}</b><div class="vi">${tts.mode() === 'online' ? t('Đang dùng giọng trực tuyến') : t('Đang dùng giọng Na Uy của thiết bị')}${tts.hasNorwegian() ? '' : ` · ${t('thiết bị chưa có giọng Na Uy')}`}</div></div><div class="seg" id="vmode">${[['auto', 'Tự động'], ['online', 'Trực tuyến'], ['device', 'Thiết bị']].map(([k, v]) => `<button data-v="${k}" aria-pressed="${(s.settings.voiceMode || 'auto') === k}">${t(v)}</button>`).join('')}</div><button class="btn small" data-say="Hei! Hva heter du?">${ICON.sound} ${t('Thử')}</button></div>
      ${tts.hasNorwegian() ? `<div class="row"><div><b>${t('Giọng đọc tiếng Na Uy')}</b><div class="vi">${t('{n} giọng trên thiết bị', { n: tts.voices().length })}</div></div><select id="voice" style="width:auto;max-width:240px">${tts.voices().map(v => `<option ${tts.current() === v ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></div>` : ''}
      <div class="row"><div><b>${t('Tự đọc to')}</b><div class="vi">${t('Phát âm câu khi hiện ra và sau khi trả lời')}</div></div><label class="toggle"><input type="checkbox" id="autoplay" ${s.settings.autoplay ? 'checked' : ''}> ${t('Bật')}</label></div>
      <div class="row"><div><b>${t('Âm thanh hiệu ứng')}</b></div><label class="toggle"><input type="checkbox" id="sfx" ${s.settings.sfx ? 'checked' : ''}> ${t('Bật')}</label></div>
      <div class="row"><div><b>${t('Mở khóa toàn bộ bài học')}</b><div class="vi">${t('Cho người đã biết tiếng Na Uy, muốn học tự do')}</div></div><label class="toggle"><input type="checkbox" id="unlock" ${s.settings.unlockAll ? 'checked' : ''}> ${t('Bật')}</label></div>
    </div>

    ${store.user ? `<div class="section-title"><h2>${t('Tài khoản')}</h2></div><div class="list settings-list">
      <div class="row"><div><b>${t('Tên hiển thị')}</b></div><input type="text" id="pname" value="${esc(store.user.name)}" style="width:200px"><button class="btn small" id="psave">${t('Lưu')}</button></div>
      <div class="row"><div><b>${t('Đổi mật khẩu')}</b></div><input type="password" id="pold" placeholder="${t('Mật khẩu cũ')}" style="width:150px"><input type="password" id="pnew" placeholder="${t('Mật khẩu mới')}" style="width:150px"><button class="btn small" id="ppw">${t('Đổi')}</button></div>
    </div>` : ''}

    <div class="section-title"><h2>${t('Dữ liệu')}</h2></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" id="exp">${t('Tải bản sao lưu (.json)')}</button>
      <label class="btn" style="cursor:pointer">${t('Khôi phục từ tệp')}<input type="file" id="imp" accept="application/json" hidden></label>
      <button class="btn" id="reset" style="color:var(--bad)">${t('Xóa toàn bộ tiến độ')}</button>
    </div>
    <p class="muted small" style="margin-top:24px">${t('Từ điển dùng dữ liệu Bokmålsordboka © Språkrådet và Universitetet i Bergen, Wiktionary (CC BY-SA). Giọng đọc và nhận dạng giọng nói do trình duyệt cung cấp.')}</p>
  </div>`;

  // ---------- Tài khoản ----------
  const lo = $('#logout', main);
  if (lo) lo.onclick = async () => { await api('/auth/logout', { body: {} }).catch(() => {}); location.reload(); };
  const form = $('#aform', main);
  if (form) {
    let mode = 'login';
    $('#amode', main).onclick = e => {
      const b = e.target.closest('button'); if (!b) return; mode = b.dataset.m;
      $$('#amode button', main).forEach(x => x.setAttribute('aria-pressed', x === b));
      $$('.reg', form).forEach(x => { x.hidden = mode !== 'register'; });
      $('#asub', main).textContent = mode === 'login' ? t('Đăng nhập') : t('Tạo tài khoản');
      form.password.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
    };
    form.onsubmit = async e => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(form));
      try {
        const r = await api(`/auth/${mode}`, { body });
        store.user = r.user; app.config.user = r.user;
        await store.pull();
        toast(t('Chào {n}!', { n: r.user.name }), 'ok');
        render(main, params, query);
      } catch (err) { toast(err.message, 'bad'); }
    };
  }
  const ps = $('#psave', main);
  if (ps) ps.onclick = async () => { try { await api('/auth/profile', { body: { name: $('#pname', main).value } }); store.user.name = $('#pname', main).value.trim(); toast(t('Đã lưu'), 'ok'); store.emit(); } catch (e) { toast(e.message, 'bad'); } };
  const pp = $('#ppw', main);
  if (pp) pp.onclick = async () => { try { await api('/auth/password', { body: { old: $('#pold', main).value, password: $('#pnew', main).value } }); toast(t('Đã đổi mật khẩu'), 'ok'); $('#pold', main).value = ''; $('#pnew', main).value = ''; } catch (e) { toast(e.message, 'bad'); } };

  // ---------- Bảng xếp hạng ----------
  if (app.config.db) mountBoard($('#board', main));

  // ---------- Cài đặt ----------
  const set = (k, v) => { s.settings[k] = v; store.save(); };
  $('#lang', main).onclick = e => { const b = e.target.closest('button'); if (b) switchLang(b.dataset.l); };
  $('#goal', main).onclick = e => { const b = e.target.closest('button'); if (!b) return; set('dailyGoal', Number(b.dataset.g)); $$('#goal button', main).forEach(x => x.setAttribute('aria-pressed', x === b)); };
  $('#theme', main).onclick = e => { const b = e.target.closest('button'); if (!b) return; set('theme', b.dataset.t); $$('#theme button', main).forEach(x => x.setAttribute('aria-pressed', x === b)); };
  $('#rate', main).oninput = e => { s.settings.rate = Number(e.target.value); $('#rv', main).textContent = `${s.settings.rate}×`; store.save(true); };
  const vs = $('#voice', main); if (vs) vs.onchange = e => tts.setVoice(e.target.value);
  $('#vmode', main).onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; tts.setMode(b.dataset.v); render(main, params, query); };
  $('#autoplay', main).onchange = e => set('autoplay', e.target.checked);
  $('#sfx', main).onchange = e => set('sfx', e.target.checked);
  $('#unlock', main).onchange = e => set('unlockAll', e.target.checked);

  // ---------- Dữ liệu ----------
  $('#exp', main).onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(s, null, 1)], { type: 'application/json' }));
    a.download = `norsk-backup-${new Date().toLocaleDateString('sv-SE')}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $('#imp', main).onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const d = JSON.parse(await f.text()); if (d.v !== 1) throw new Error(t('Tệp không đúng định dạng')); store.replace(d); toast(t('Đã khôi phục và gộp dữ liệu'), 'ok'); render(main, params, query); } catch (err) { toast(err.message, 'bad'); }
  };
  $('#reset', main).onclick = () => { if (confirm(t('Xóa toàn bộ tiến độ trên máy này? Không thể hoàn tác.')) && confirm(t('Chắc chắn chứ?'))) { store.reset(); if (store.user) store.push(); render(main, params, query); } };
}

// Gia sư AI (tùy chọn, cần ANTHROPIC_API_KEY trên máy chủ): hội thoại nhập vai, sửa câu, giải thích câu.
import { $, $$, esc, ICON, api, toast, tapWords } from '../ui.js';
import { store } from '../store.js';
import { tts, stt } from '../speech.js';
import { app } from '../app.js';
import { t, isEn } from '../i18n.js';

const SCEN = {
  cafe: ['☕', 'Quán cà phê', 'Gọi đồ uống, hỏi giá, trả tiền'],
  kiwi: ['🛒', 'Siêu thị Kiwi', 'Tìm hàng, thanh toán, túi, hóa đơn'],
  doctor: ['🩺', 'Bác sĩ gia đình', 'Kể triệu chứng, đặt lịch'],
  interview: ['💼', 'Phỏng vấn xin việc', 'Giới thiệu kinh nghiệm, kinh tế biển'],
  neighbor: ['🏠', 'Hàng xóm', 'Chuyện thời tiết, dugnad, cuối tuần'],
  free: ['💬', 'Trò chuyện tự do', 'Nói về bất cứ điều gì'],
};

export async function render(main, params, query) {
  if (!app.config.ai) {
    main.innerHTML = `<div class="page"><div class="page-head"><div><h1>${t('Gia sư AI')}</h1></div></div>
      <div class="card"><p>${t('Tính năng này dùng Claude để <b>hội thoại nhập vai</b> (quán cà phê, bác sĩ, phỏng vấn…), <b>sửa câu</b> anh tự viết và <b>giải thích</b> từng từ trong câu.')}</p>
      <p class="muted" style="margin-top:10px">${t('Chưa bật: quản trị viên cần đặt biến môi trường <code>ANTHROPIC_API_KEY</code> trên Hostinger rồi khởi động lại ứng dụng. Chi phí ước tính rất thấp với model Haiku (khoảng 0,001–0,003 USD mỗi lượt), có giới hạn lượt dùng mỗi ngày.')}</p></div></div>`;
    return;
  }
  let tab = query.tab || 'chat';
  main.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>${t('Gia sư AI')}</h1><p>${t('Luyện nói và viết với gia sư Claude. Thầy sẽ sửa lỗi nhẹ nhàng bằng tiếng Việt.')}</p></div></div>
    <div class="seg" id="ttabs" style="margin-bottom:16px"><button data-t="chat">${t('Hội thoại nhập vai')}</button><button data-t="check">${t('Sửa câu')}</button><button data-t="explain">${t('Giải thích câu')}</button></div>
    <div id="tb"></div></div>`;
  const tb = $('#tb', main);
  const paint = () => $$('#ttabs button', main).forEach(b => b.setAttribute('aria-pressed', b.dataset.t === tab));
  $('#ttabs', main).onclick = e => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.t; paint(); draw(); };
  const draw = () => ({ chat: drawChat, check: drawCheck, explain: drawExplain })[tab]();

  function drawChat(scenario) {
    if (!scenario) {
      tb.innerHTML = `<p class="muted" style="margin-bottom:12px">${t('Chọn một tình huống:')}</p><div class="grid two">${Object.entries(SCEN).map(([k, [ic, ti, d]]) => `<button class="topic-tile" data-s="${k}" style="text-align:left;cursor:pointer"><span class="emo">${ic}</span><div class="grow"><b>${t(ti)}</b><br><small>${t(d)}</small></div></button>`).join('')}</div>`;
      $$('[data-s]', tb).forEach(b => b.onclick = () => drawChat(b.dataset.s));
      return;
    }
    const history = [];
    tb.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><b>${SCEN[scenario][0]} ${t(SCEN[scenario][1])}</b><div style="display:flex;gap:8px"><label class="toggle"><input type="checkbox" id="cvi" checked> ${t('Nghĩa')}</label><button class="btn small" id="cback">${t('Đổi tình huống')}</button></div></div>
      <div class="chat" id="chat"></div>
      <div class="chips" id="csug" style="margin:10px 0"></div>
      <div class="composer"><button class="icon-btn" id="cmic" aria-label="${t('Nói')}">${ICON.mic}</button><input type="text" id="cin" lang="nb" placeholder="Skriv på norsk…" autocomplete="off"><button class="btn primary" id="csend">${t('Gửi')}</button></div>`;
    const chat = $('#chat', tb); const inp = $('#cin', tb);
    $('#cback', tb).onclick = () => drawChat();
    $('#cvi', tb).onchange = e => chat.classList.toggle('hide-vi', !e.target.checked);
    const bubble = (role, html) => { const d = document.createElement('div'); d.className = `msg ${role}`; d.innerHTML = html; chat.appendChild(d); d.scrollIntoView({ behavior: 'smooth', block: 'end' }); return d; };
    async function send(text) {
      if (text) { history.push({ role: 'user', content: text }); bubble('me', `<div class="txt" lang="nb">${esc(text)}</div>`); }
      const wait = bubble('bot', '<span class="typing"><i></i><i></i><i></i></span>');
      $('#csend', tb).disabled = true;
      try {
        const r = await api('/ai/chat', { body: { scenario, messages: history } });
        history.push({ role: 'assistant', content: r.reply_no });
        wait.innerHTML = `<div class="txt" lang="nb">${tapWords(r.reply_no)} <button class="icon-btn" data-say="${esc(r.reply_no)}" style="width:30px;height:30px;vertical-align:middle" aria-label="${t('Nghe')}">${ICON.sound}</button></div><div class="vi">${esc(r.reply_tr || r.reply_vi || '')}</div>`;
        if (r.correction && text) { const prev = chat.querySelectorAll('.msg.me'); const last = prev[prev.length - 1]; if (last) last.insertAdjacentHTML('beforeend', `<div class="fix">✏️ ${esc(r.correction)}</div>`); }
        $('#csug', tb).innerHTML = (r.suggestions || []).map(s => `<button class="chip" lang="nb" data-sg="${esc(s)}">${esc(s)}</button>`).join('');
        if (store.s.settings.autoplay) tts.speak(r.reply_no);
        if (text) store.addXp(2);
      } catch (e) { wait.innerHTML = `<span class="low">${esc(e.message)}</span>`; }
      $('#csend', tb).disabled = false;
    }
    $('#csend', tb).onclick = () => { const x = inp.value.trim(); if (!x) return; inp.value = ''; send(x); };
    inp.onkeydown = e => { if (e.key === 'Enter') $('#csend', tb).click(); };
    $('#csug', tb).onclick = e => { const c = e.target.closest('[data-sg]'); if (c) { inp.value = c.dataset.sg; inp.focus(); } };
    $('#cmic', tb).onclick = async () => {
      const b = $('#cmic', tb); b.classList.add('speaking');
      try { const r = await stt.listen(''); inp.value = r.text; inp.focus(); } catch (err) { const m = stt.errorText(err); if (m) toast(m); }
      b.classList.remove('speaking');
    };
    send('');
  }

  function drawCheck() {
    tb.innerHTML = `<div class="card"><label class="field">${t('Câu tiếng Na Uy anh viết')}<textarea id="ck" lang="nb" rows="3" placeholder="${t('vd: Jeg har bodd i Oslo siden to år.')}"></textarea></label>
      <label class="field">${t('Ý muốn nói (tiếng Việt, không bắt buộc)')}<input type="text" id="ckh" placeholder="${t('vd: Tôi đã sống ở Oslo được hai năm.')}"></label>
      <button class="btn primary" id="ckgo">${t('Sửa giúp tôi')}</button></div><div id="ckout" style="margin-top:14px"></div>`;
    $('#ckgo', tb).onclick = async () => {
      const text = $('#ck', tb).value.trim(); if (!text) return;
      const out = $('#ckout', tb); out.innerHTML = '<div class="card"><span class="typing"><i></i><i></i><i></i></span></div>';
      try {
        const r = await api('/ai/check', { body: { text, hint: $('#ckh', tb).value.trim() } });
        out.innerHTML = `<div class="card">${r.correct ? `<p class="good"><b>${t('Câu đúng rồi!')} 🎉</b></p>` : `<p class="low"><b>${t('Có lỗi cần sửa')}</b></p>`}
          <p style="margin-top:10px" class="muted small">${t('Câu chuẩn:')}</p><p lang="nb" style="font-family:var(--serif);font-size:1.25rem">${esc(r.corrected)} <button class="icon-btn" data-say="${esc(r.corrected)}" style="vertical-align:middle" aria-label="${t('Nghe')}">${ICON.sound}</button></p><p class="muted">${esc(r.translation || '')}</p>
          ${(r.mistakes || []).length ? `<ul style="margin:12px 0 0;padding-left:20px">${r.mistakes.map(m => `<li style="margin:6px 0"><s class="low" lang="nb">${esc(m.wrong)}</s> → <b class="good" lang="nb">${esc(m.right)}</b>: ${esc(m.why)}</li>`).join('')}</ul>` : ''}
          ${r.tip ? `<p class="tip" style="margin-top:10px">💡 ${esc(r.tip)}</p>` : ''}
          <button class="btn small" id="cksave" style="margin-top:12px">${ICON.bookmark} ${t('Lưu câu đúng vào thẻ')}</button></div>`;
        $('#cksave', out).onclick = () => { store.addCard(isEn() ? { no: r.corrected, en: r.translation || '' } : { no: r.corrected, vi: r.translation || '' }, 'ai'); store.save(); toast(t('Đã lưu')); };
        store.addXp(2);
      } catch (e) { out.innerHTML = `<p class="notice">${esc(e.message)}</p>`; }
    };
  }

  function drawExplain() {
    tb.innerHTML = `<div class="card"><label class="field">${t('Câu hoặc từ tiếng Na Uy cần giải thích')}<textarea id="ex" lang="nb" rows="3" placeholder="${t('vd: Det hadde vært fint om vi kunne møtes i morgen.')}"></textarea></label><button class="btn primary" id="exgo">${t('Giải thích')}</button></div><div id="exout" style="margin-top:14px"></div>`;
    $('#exgo', tb).onclick = async () => {
      const text = $('#ex', tb).value.trim(); if (!text) return;
      const out = $('#exout', tb); out.innerHTML = '<div class="card"><span class="typing"><i></i><i></i><i></i></span></div>';
      try {
        const r = await api('/ai/explain', { body: { text } });
        out.innerHTML = `<div class="card"><p class="muted small">${t('Nghĩa:')}</p><p style="font-size:1.15rem;font-weight:600">${esc(r.translation)}</p>
          <table class="infl" style="margin-top:12px"><tbody>${(r.words || []).map(w => `<tr><td lang="nb" style="width:35%"><button data-say="${esc(w.no)}" style="border:0;background:none;color:var(--deep);padding:0;vertical-align:-3px" aria-label="${t('Nghe')}">${ICON.sound}</button> ${esc(w.no)}</td><td style="font-family:var(--sans)"><b>${esc(w.meaning || w.vi || '')}</b>${w.note ? `<br><span class="muted small">${esc(w.note)}</span>` : ''}</td></tr>`).join('')}</tbody></table>
          ${(r.grammar || []).length ? `<h3 style="margin-top:14px">${t('Ngữ pháp')}</h3><ul style="padding-left:20px;margin:6px 0">${r.grammar.map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : ''}
          ${r.pronunciation ? `<p class="tip">🗣️ ${esc(r.pronunciation)}</p>` : ''}</div>`;
      } catch (e) { out.innerHTML = `<p class="notice">${esc(e.message)}</p>`; }
    };
  }

  paint(); draw();
  return () => { tts.stop(); stt.abort(); };
}

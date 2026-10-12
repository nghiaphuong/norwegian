// Ôn tập: thẻ ngắt quãng (SRS), sổ từ, lỗi sai.
import { $, $$, esc, ICON, toast, modal } from '../ui.js';
import { store } from '../store.js';
import { tts } from '../speech.js';
import { article } from '../lexicon.js';

const fmtDue = ts => {
  const d = ts - Date.now();
  if (d <= 0) return 'đến hạn';
  if (d < 3600e3) return `${Math.ceil(d / 60e3)} phút`;
  if (d < 864e5) return `${Math.round(d / 3600e3)} giờ`;
  return `${Math.round(d / 864e5)} ngày`;
};
const strength = c => `<span class="strength" title="Độ nhớ">${[1, 2, 3, 4].map(i => `<i class="${store.strength(c) >= i ? 'on' : ''}"></i>`).join('')}</span>`;

export async function render(main, params, query) {
  let tab = query.tab || 'due';
  const draw = () => {
    const due = store.dueCards();
    const nCards = Object.keys(store.s.cards).length;
    const nMis = Object.keys(store.s.mistakes).length;
    main.innerHTML = `<div class="page">
      <div class="page-head"><div><h1>Ôn tập</h1><p>Lặp lại ngắt quãng: thẻ nào nhớ tốt sẽ được hẹn lâu hơn, thẻ hay quên sẽ xuất hiện thường xuyên hơn.</p></div></div>
      <div class="seg" role="tablist" style="margin-bottom:18px">
        <button data-tab="due" aria-pressed="${tab === 'due'}">Đến hạn (${due.length})</button>
        <button data-tab="words" aria-pressed="${tab === 'words'}">Sổ từ (${nCards})</button>
        <button data-tab="mistakes" aria-pressed="${tab === 'mistakes'}">Lỗi sai (${nMis})</button>
      </div>
      <div id="rv"></div></div>`;
    $$('[data-tab]', main).forEach(b => b.onclick = () => { tab = b.dataset.tab; history.replaceState(null, '', `#/review?tab=${tab}`); draw(); });
    ({ due: drawDue, words: drawWords, mistakes: drawMistakes })[tab]($('#rv', main), due);
  };

  function drawDue(el, due) {
    if (!due.length) {
      const all = Object.values(store.s.cards);
      const nextDue = all.length ? Math.min(...all.map(c => c.due)) : 0;
      el.innerHTML = `<div class="card empty-state"><div class="big-emoji">✅</div><h2>Đã ôn xong!</h2><p class="muted">${all.length ? `Thẻ tiếp theo đến hạn sau ${fmtDue(nextDue)}.` : 'Chưa có thẻ nào. Học một bài trong Lộ trình hoặc lưu từ trong Từ điển để tạo thẻ.'}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><a class="btn primary" href="#/path">Học bài mới</a>${all.length >= 4 ? '<button class="btn" id="cram">Ôn thêm 10 thẻ yếu nhất</button>' : ''}</div></div>`;
      const cram = $('#cram', el);
      if (cram) cram.onclick = () => session(el, Object.entries(store.s.cards).map(([id, c]) => ({ id, ...c })).sort((a, b) => store.strength(a) - store.strength(b) || a.due - b.due).slice(0, 10), true);
      return;
    }
    el.innerHTML = `<div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
      <div><h3>${due.length} thẻ cần ôn</h3><p class="muted small">Khoảng ${Math.max(1, Math.round(due.length * 8 / 60))} phút. Mỗi thẻ: nhìn từ, nhớ nghĩa, lật thẻ rồi tự chấm.</p></div>
      <div style="display:flex;gap:8px"><button class="btn" id="dir">Việt → Na Uy</button><button class="btn primary" id="go">Bắt đầu ôn</button></div></div>`;
    $('#go', el).onclick = () => session(el, due.slice(0, 30), false, false);
    $('#dir', el).onclick = () => session(el, due.slice(0, 30), false, true);
  }

  function session(el, cards, cram = false, reverse = false) {
    let i = 0; let good = 0; const t0 = Date.now();
    const show = () => {
      if (keyFlip) document.removeEventListener('keydown', keyFlip);
      if (i >= cards.length) {
        const xp = Math.max(5, Math.round(cards.length * 1.5));
        store.addXp(xp); store.s.stats.seconds += Math.round((Date.now() - t0) / 1000); store.save();
        el.innerHTML = `<div class="card empty-state"><div class="big-emoji">🎉</div><h2>Xong ${cards.length} thẻ</h2><p class="muted">Nhớ tốt ${good}/${cards.length} · +${xp} XP</p><button class="btn primary" id="again">Tiếp tục</button></div>`;
        $('#again', el).onclick = draw; return;
      }
      const c = cards[i];
      el.innerHTML = `<p class="muted small" style="text-align:center">Thẻ ${i + 1}/${cards.length}</p>
        <div class="flash" id="fl"><div class="flash-in">
          <div class="face front">${reverse ? `<div class="m">${esc(c.vi)}</div><p class="muted small">Nghĩ ra từ tiếng Na Uy rồi chạm để lật</p>` : `<div class="w" lang="nb">${esc(c.no)}</div><button class="icon-btn" data-say="${esc(c.no)}" aria-label="Nghe">${ICON.sound}</button><p class="muted small">Chạm để lật thẻ</p>`}</div>
          <div class="face back"><div class="w" lang="nb">${esc(c.no)}</div><div class="m">${esc(c.vi)}</div><button class="icon-btn" data-say="${esc(c.no)}" aria-label="Nghe">${ICON.sound}</button></div>
        </div></div>
        <div class="grades" id="gr" style="visibility:hidden">
          <button class="btn bad" data-g="0">Quên<small>10 phút</small></button>
          <button class="btn" data-g="1">Khó<small>${c.reps ? `${Math.max(1, Math.round(c.ivl * 1.2))} ngày` : '1 ngày'}</small></button>
          <button class="btn primary" data-g="2">Nhớ<small>${c.reps === 0 ? '1 ngày' : c.reps === 1 ? '4 ngày' : `${Math.round(c.ivl * c.ease)} ngày`}</small></button>
          <button class="btn ok" data-g="3">Dễ<small>${c.reps === 0 ? '3 ngày' : c.reps === 1 ? '7 ngày' : `${Math.round(c.ivl * c.ease * 1.3)} ngày`}</small></button>
        </div>
        <p class="muted small" style="text-align:center;margin-top:12px">Phím tắt: Space lật thẻ · 1–4 chấm điểm</p>`;
      const fl = $('#fl', el);
      const flip = () => { if (!fl.classList.contains('flipped')) { fl.classList.add('flipped'); $('#gr', el).style.visibility = 'visible'; if (reverse || store.s.settings.autoplay) tts.speak(c.no); } };
      fl.addEventListener('click', e => { if (!e.target.closest('[data-say]')) flip(); });
      if (!reverse && store.s.settings.autoplay) tts.speak(c.no);
      $$('[data-g]', el).forEach(b => b.onclick = () => {
        const g = Number(b.dataset.g);
        if (!cram || g === 0) store.gradeCard(c.id, g);
        if (g >= 2) good++;
        store.answer(g >= 1);
        store.save(true);
        i++; show();
      });
      keyFlip = e => {
        if (!document.body.contains(fl)) { document.removeEventListener('keydown', keyFlip); return; }
        if (e.key === ' ') { e.preventDefault(); flip(); } else if (/^[1-4]$/.test(e.key) && fl.classList.contains('flipped')) $(`[data-g="${Number(e.key) - 1}"]`, el).click();
      };
      document.addEventListener('keydown', keyFlip);
    };
    let keyFlip = null;
    show();
  }

  function drawWords(el) {
    const cards = Object.entries(store.s.cards).map(([id, c]) => ({ id, ...c })).sort((a, b) => b.added - a.added);
    el.innerHTML = `<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
      <input type="search" id="q" placeholder="Tìm trong sổ từ…" style="flex:1;min-width:200px">
      <button class="btn" id="add">${ICON.plus} Thêm từ</button></div>
      <div class="list" id="wl"></div>`;
    const list = $('#wl', el);
    const paint = q => {
      const f = q ? cards.filter(c => (c.no + ' ' + c.vi).toLowerCase().includes(q.toLowerCase())) : cards;
      list.innerHTML = f.length ? f.slice(0, 400).map(c => `<div class="row">
        <button class="icon-btn" data-say="${esc(c.no)}" aria-label="Nghe">${ICON.sound}</button>
        <div class="grow"><div class="no" lang="nb">${esc(c.no)}</div><div class="vi">${esc(c.vi)}</div></div>
        <div style="text-align:right">${strength(c)}<div class="muted small">${fmtDue(c.due)}</div></div>
        <button class="icon-btn" data-del="${esc(c.id)}" aria-label="Xóa">${ICON.trash}</button></div>`).join('')
        : `<div class="empty-state"><p class="muted">${q ? 'Không tìm thấy.' : 'Sổ từ trống. Từ trong bài học, từ điển và câu giao tiếp sẽ được lưu ở đây.'}</p></div>`;
    };
    paint('');
    $('#q', el).oninput = e => paint(e.target.value.trim());
    list.addEventListener('click', e => {
      const d = e.target.closest('[data-del]');
      if (d && confirm('Xóa thẻ này khỏi sổ từ?')) { store.removeCard(d.dataset.del); const k = cards.findIndex(c => c.id === d.dataset.del); cards.splice(k, 1); paint($('#q', el).value.trim()); }
    });
    $('#add', el).onclick = () => modal(`<h2>Thêm từ</h2><p class="muted small" style="margin:4px 0 14px">Tự thêm từ hoặc câu muốn ghi nhớ.</p>
      <label class="field">Tiếng Na Uy<input type="text" id="aNo" lang="nb" placeholder="vd: et eple"></label>
      <label class="field">Nghĩa tiếng Việt<input type="text" id="aVi" placeholder="vd: quả táo"></label>
      <button class="btn primary block" id="aOk">Lưu</button>`, {
      onMount(card, close) {
        $('#aNo', card).focus();
        $('#aOk', card).onclick = () => {
          const no = $('#aNo', card).value.trim(); const vi = $('#aVi', card).value.trim();
          if (!no || !vi) return toast('Nhập đủ cả hai ô', 'bad');
          if (!store.addCard({ no, vi }, 'manual')) return toast('Từ này đã có trong sổ');
          store.save(); close(); draw();
        };
      },
    });
  }

  function drawMistakes(el) {
    const ms = Object.values(store.s.mistakes).sort((a, b) => b.n - a.n);
    el.innerHTML = ms.length ? `<div class="card" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:10px;flex-wrap:wrap"><p>Làm lại các câu từng sai. Trả lời đúng thì câu sẽ rời khỏi danh sách.</p><a class="btn primary" href="#/learn/mistakes">Luyện ngay</a></div>
      <div class="list">${ms.map(m => `<div class="row"><button class="icon-btn" data-say="${esc(m.no)}" aria-label="Nghe">${ICON.sound}</button><div class="grow"><div class="no" lang="nb">${esc(m.no)}</div><div class="vi">${esc(m.vi)}</div></div><span class="tag" style="background:var(--bad-soft);color:var(--bad)">sai ${m.n}×</span></div>`).join('')}</div>`
      : '<div class="card empty-state"><div class="big-emoji">🎯</div><p class="muted">Chưa có lỗi sai nào.</p></div>';
  }

  draw();
  return () => tts.stop();
}

export { article };

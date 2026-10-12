// Ngữ pháp: giải thích ngắn gọn bằng tiếng Việt + ví dụ có âm thanh + bài kiểm tra nhỏ.
import { $, $$, esc, ICON, loadData, miniMd, sfx, tapWords } from '../ui.js';
import { store } from '../store.js';
import { go, showNewBadges } from '../app.js';

export async function render(main, params) {
  const data = await loadData('grammar');
  if (!params[0]) {
    main.innerHTML = `<div class="page">
      <div class="page-head"><div><h1>Ngữ pháp</h1><p>${data.lessons.length} bài ngắn, so sánh với tiếng Việt cho dễ hiểu. Mỗi bài có phần kiểm tra.</p></div></div>
      <div class="list">${data.lessons.map((l, i) => {
        const d = store.s.grammar[l.id];
        return `<a class="row" href="#/grammar/${l.id}" style="text-decoration:none"><span class="emo" style="font-size:1.6rem;width:44px;text-align:center">${l.icon || '🧩'}</span><div class="grow"><b>${i + 1}. ${esc(l.title)}</b><div class="vi"><span lang="nb">${esc(l.title_no || '')}</span> · ${esc(l.level)}</div></div>${d ? `<span class="tag" style="background:var(--ok-soft);color:var(--ok)">✓ ${d.score}</span>` : ''}${ICON.next}</a>`;
      }).join('')}</div></div>`;
    return;
  }
  const idx = data.lessons.findIndex(l => l.id === params[0]);
  const l = data.lessons[idx];
  if (!l) { go('grammar'); return; }
  const nxt = data.lessons[idx + 1];

  main.innerHTML = `<div class="page gram">
    <a class="back-link" href="#/grammar">${ICON.back} Ngữ pháp</a>
    <p class="muted small">${esc(l.level)} · Bài ${idx + 1}/${data.lessons.length}</p>
    <h1>${l.icon || ''} ${esc(l.title)}</h1>
    <p class="muted" lang="nb" style="margin-top:4px">${esc(l.title_no || '')}</p>
    <div class="notice info" style="margin:16px 0">${esc(l.summary || '')}</div>
    ${l.sections.map(s => `<section class="card" style="margin-top:14px"><h2 style="font-size:1.2rem;margin-bottom:6px">${esc(s.h)}</h2>${miniMd(s.body)}
      ${s.examples?.length ? `<div class="ex-list">${s.examples.map(e => `<div class="ex-item"><button class="icon-btn" data-say="${esc(e.no)}" aria-label="Nghe">${ICON.sound}</button><div><div class="no" lang="nb">${tapWords(e.no)}</div><div class="vi">${esc(e.vi)}</div></div></div>`).join('')}</div>` : ''}</section>`).join('')}
    <div class="section-title"><h2>Kiểm tra nhanh</h2><span class="muted small">${l.quiz.length} câu</span></div>
    <div id="gq"></div>
  </div>`;

  const box = $('#gq', main);
  let pos = 0; let score = 0;
  const show = () => {
    if (pos >= l.quiz.length) {
      const xp = 5 + score * 2;
      store.s.grammar[l.id] = { score: `${score}/${l.quiz.length}`, at: Date.now() };
      store.addXp(xp);
      box.innerHTML = `<div class="card empty-state"><div class="big-emoji">${score === l.quiz.length ? '🏆' : '🧩'}</div><h2>${score}/${l.quiz.length} câu đúng</h2><p class="muted">+${xp} XP</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="btn" id="redo">Làm lại</button>${nxt ? `<a class="btn primary" href="#/grammar/${nxt.id}">Bài tiếp: ${esc(nxt.title)}</a>` : ''}</div></div>`;
      $('#redo', box).onclick = () => { pos = 0; score = 0; show(); };
      showNewBadges();
      return;
    }
    const q = l.quiz[pos];
    box.innerHTML = `<div class="card"><p class="muted small">Câu ${pos + 1}/${l.quiz.length}</p><p style="font-weight:600;font-size:1.1rem;margin:6px 0 12px">${esc(q.q)}</p>
      <div class="opts">${q.options.map((o, k) => `<button class="opt" data-k="${k}"><span class="k">${k + 1}</span><span lang="nb">${esc(o)}</span></button>`).join('')}</div><div id="gx" style="margin-top:12px"></div></div>`;
    $$('.opt', box).forEach(b => b.onclick = () => {
      const ok = Number(b.dataset.k) === q.answer; if (ok) score++;
      store.answer(ok); sfx(ok ? 'ok' : 'bad', store.s.settings.sfx);
      $$('.opt', box).forEach(x => { x.disabled = true; if (Number(x.dataset.k) === q.answer) x.classList.add('right'); });
      if (!ok) b.classList.add('wrong');
      $('#gx', box).innerHTML = `<p>${ok ? '<b class="good">Đúng!</b>' : '<b class="low">Chưa đúng.</b>'} ${esc(q.explain || '')}</p><button class="btn primary" id="gn" style="margin-top:10px">Tiếp</button>`;
      $('#gn', box).onclick = () => { pos++; show(); };
    });
  };
  show();
}

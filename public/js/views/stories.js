// Truyện hội thoại kiểu Duolingo Stories: từng dòng xuất hiện, có câu hỏi hiểu bài xen giữa.
import { $, $$, esc, ICON, loadData, sfx, tapWords } from '../ui.js';
import { store } from '../store.js';
import { tts } from '../speech.js';
import { go, showNewBadges } from '../app.js';
import { t, L, mean, isEn } from '../i18n.js';

const subtitle = s => (isEn() ? s.title_en || s.title_vi : s.title_vi);

export async function render(main, params) {
  const data = await loadData('stories');
  if (!params[0]) {
    main.innerHTML = `<div class="page">
      <div class="page-head"><div><h1>${t('Truyện')}</h1><p>${t('Đọc và nghe những tình huống đời thường ở Na Uy. Chạm vào từ bất kỳ để xem nghĩa.')}</p></div></div>
      <div class="grid two">${data.stories.map(s => {
        const done = store.s.stories[s.id];
        return `<a class="topic-tile" href="#/stories/${s.id}"><span class="emo">${s.icon || '📖'}</span><div class="grow"><b lang="nb">${esc(s.title)}</b><br><small>${esc(subtitle(s))} · ${esc(s.level)}</small></div>${done ? `<span class="tag" style="background:var(--ok-soft);color:var(--ok)">✓ ${done.score}</span>` : ''}</a>`;
      }).join('')}</div></div>`;
    return;
  }

  const s = data.stories.find(x => x.id === params[0]);
  if (!s) { go('stories'); return; }
  let i = -1; let correct = 0; let asked = 0; const autoplay = store.s.settings.autoplay;
  const qs = [...(s.questions || [])].map(q => ({ ...q })).sort((a, b) => a.after - b.after);

  main.innerHTML = `<div class="player">
    <div class="p-top"><a class="icon-btn" href="#/stories" style="border:0;background:none;color:var(--muted)" aria-label="${t('Thoát')}">${ICON.x}</a>
      <div class="progress"><div id="sb" style="width:0"></div></div>
      <label class="toggle"><input type="checkbox" id="svi" checked> ${t('Nghĩa')}</label></div>
    <div class="p-body"><div style="text-align:center;margin-bottom:18px"><div style="font-size:3rem">${s.icon || '📖'}</div><h2 lang="nb">${esc(s.title)}</h2><p class="muted">${esc(subtitle(s))}</p></div>
      <div class="story-body" id="sl"></div></div>
    <div class="p-foot"><div class="p-foot-in"><span class="muted small" id="sinfo"></span><button class="btn primary" id="snext">${t('Bắt đầu')}</button></div></div></div>`;
  const list = $('#sl', main); const nextBtn = $('#snext', main);
  $('#svi', main).onchange = e => list.classList.toggle('hide-vi', !e.target.checked);

  const avatar = who => (who === 'narrator' ? '' : s.characters?.[who] || '🙂');
  function addLine(l) {
    const div = document.createElement('div');
    div.className = `line ${l.who === 'narrator' ? 'narrator' : ''}`;
    div.innerHTML = `${l.who === 'narrator' ? '' : `<span class="av">${avatar(l.who)}</span>`}<div class="bub">${l.who === 'narrator' ? '' : `<div class="who">${esc(l.who)}</div>`}<div class="txt" lang="nb">${tapWords(l.no)} <button class="icon-btn" data-say="${esc(l.no)}" style="width:30px;height:30px;border-radius:9px;vertical-align:middle" aria-label="${t('Nghe')}">${ICON.sound}</button></div><div class="vi">${esc(mean(l))}</div></div>`;
    list.appendChild(div);
    div.scrollIntoView({ behavior: 'smooth', block: 'end' });
    if (autoplay) tts.speak(l.no);
  }
  function ask(q) {
    asked++;
    nextBtn.disabled = true;
    const options = isEn() && q.options_en ? q.options_en : q.options;
    const div = document.createElement('div');
    div.className = 'q-card';
    div.innerHTML = `<p class="p-kind">${t('Câu hỏi')}</p><p style="font-weight:600;margin-bottom:10px">${esc(L(q, 'q'))}</p><div class="opts">${options.map((o, k) => `<button class="opt" data-k="${k}">${esc(o)}</button>`).join('')}</div><p class="small" style="margin-top:8px" data-ex></p>`;
    list.appendChild(div);
    div.scrollIntoView({ behavior: 'smooth', block: 'end' });
    $$('.opt', div).forEach(b => b.onclick = () => {
      const ok = Number(b.dataset.k) === q.answer; if (ok) correct++;
      sfx(ok ? 'ok' : 'bad', store.s.settings.sfx);
      $$('.opt', div).forEach(x => { x.disabled = true; if (Number(x.dataset.k) === q.answer) x.classList.add('right'); });
      if (!ok) b.classList.add('wrong');
      $('[data-ex]', div).innerHTML = `${ok ? `<b class="good">${t('Đúng!')}</b>` : `<b class="low">${t('Chưa đúng.')}</b>`} ${esc(L(q, 'explain') || '')}`;
      nextBtn.disabled = false; nextBtn.focus();
    });
  }
  function step() {
    // Câu hỏi chưa hỏi gắn sau dòng hiện tại?
    const pending = qs.find(q => q.after === i && !q._done);
    if (pending) { pending._done = true; ask(pending); return; }
    i++;
    if (i >= s.lines.length) return finish();
    addLine(s.lines[i]);
    nextBtn.textContent = t('Tiếp');
    $('#sb', main).style.width = `${Math.round((i + 1) / s.lines.length * 100)}%`;
    $('#sinfo', main).textContent = `${i + 1}/${s.lines.length}`;
  }
  function finish() {
    const xp = 8 + correct * 2;
    store.s.stories[s.id] = { score: `${correct}/${asked}`, at: Date.now() };
    store.addXp(xp);
    const div = document.createElement('div');
    div.className = 'done-screen';
    div.innerHTML = `<div class="big">📖</div><h2>${t('Hết truyện!')}</h2><div class="result-boxes"><div class="rbox"><small>XP</small><b>⚡ ${xp}</b></div><div class="rbox ok"><small>${t('Trả lời đúng')}</small><b>${correct}/${asked}</b></div></div>`;
    list.appendChild(div); div.scrollIntoView({ behavior: 'smooth' });
    nextBtn.textContent = t('Xong'); nextBtn.dataset.done = '1';
    nextBtn.onclick = () => { go('stories'); setTimeout(showNewBadges, 300); };
  }
  nextBtn.onclick = step;
  const onKey = e => { if (e.key === 'Enter' && !nextBtn.disabled && document.body.contains(nextBtn)) { e.preventDefault(); nextBtn.click(); } };
  document.addEventListener('keydown', onKey);
  return () => { document.removeEventListener('keydown', onKey); tts.stop(); };
}

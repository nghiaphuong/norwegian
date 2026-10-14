// Câu giao tiếp theo tình huống: Học câu · Nhại theo (shadowing) · Nghe hiểu.
import { $, $$, esc, ICON, loadData, shuffle, sfx, tapWords, groupByLevel, levelTitle } from '../ui.js';
import { store } from '../store.js';
import { tts, stt } from '../speech.js';
import { t, L, mean } from '../i18n.js';

export async function render(main, params) {
  const pb = await loadData('phrasebook');
  const learned = new Set(store.s.phrases);
  const key = (tp, i) => `${tp.id}:${i}`;

  if (!params[0]) {
    const total = pb.topics.reduce((n, tp) => n + tp.items.length, 0);
    main.innerHTML = `<div class="page">
      <div class="page-head"><div><h1>${t('Câu giao tiếp')}</h1><p>${t('{n} tình huống thường gặp ở Oslo · đã thuộc {d}/{total} câu', { n: pb.topics.length, d: learned.size, total })}</p></div></div>
      ${groupByLevel(pb.topics).map(([lv, tps]) => `${levelTitle(lv, tps.length)}<div class="grid two">${tps.map(tp => {
        const d = tp.items.filter((_, i) => learned.has(key(tp, i))).length;
        return `<a class="topic-tile" href="#/phrases/${tp.id}"><span class="emo">${tp.icon || '💬'}</span><div class="grow"><b>${esc(L(tp, 'title'))}</b><br><small>${esc(L(tp, 'note') || '')}</small><div class="progress" style="margin-top:8px;height:6px"><div style="width:${Math.round(d / tp.items.length * 100)}%"></div></div></div><small>${d}/${tp.items.length}</small></a>`;
      }).join('')}</div>`).join('')}</div>`;
    return;
  }

  const topic = pb.topics.find(x => x.id === params[0]);
  if (!topic) { main.innerHTML = `<div class="page"><p>${t('Không tìm thấy chủ đề.')}</p></div>`; return; }
  let mode = 'learn';
  let shadowToken = 0;

  main.innerHTML = `<div class="page">
    <a class="back-link" href="#/phrases">${ICON.back} ${t('Câu giao tiếp')}</a>
    <div class="page-head"><div><h1>${topic.icon || ''} ${esc(L(topic, 'title'))}</h1><p>${esc(L(topic, 'note') || '')}</p></div>
    <a class="btn primary" href="#/learn/phrases/${topic.id}">${ICON.play} ${t('Làm bài tập')}</a></div>
    <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:14px">
      <div class="seg" id="modes"><button data-m="learn">${t('Học câu')}</button><button data-m="shadow">${t('Nhại theo')}</button><button data-m="quiz">${t('Nghe hiểu')}</button></div>
      <div class="seg" id="speed"><button data-r="0.9">${t('Thường')}</button><button data-r="0.65">${t('Chậm')}</button></div>
    </div>
    <div id="pv"></div></div>`;
  const pv = $('#pv', main);

  const paintSeg = () => {
    $$('#modes button', main).forEach(b => b.setAttribute('aria-pressed', b.dataset.m === mode));
    $$('#speed button', main).forEach(b => b.setAttribute('aria-pressed', Number(b.dataset.r) === store.s.settings.rate));
  };
  $('#modes', main).onclick = e => { const b = e.target.closest('button'); if (!b) return; mode = b.dataset.m; stop(); paintSeg(); draw(); };
  $('#speed', main).onclick = e => { const b = e.target.closest('button'); if (!b) return; store.s.settings.rate = Number(b.dataset.r); store.save(true); paintSeg(); };
  const stop = () => { shadowToken++; tts.stop(); stt.abort(); };

  function draw() { ({ learn: drawLearn, shadow: drawShadow, quiz: drawQuiz })[mode](); }

  function drawLearn() {
    pv.innerHTML = `<div class="list">${topic.items.map((it, i) => {
      const on = learned.has(key(topic, i));
      const tip = L(it, 'tip');
      return `<div class="row ${on ? 'done' : ''}" data-i="${i}" style="flex-wrap:wrap;align-items:flex-start">
        <div class="grow" style="min-width:220px"><div class="no" lang="nb">${tapWords(it.no)}</div><div class="vi">${esc(mean(it))}</div>${tip ? `<div class="tip">💡 ${esc(tip)}</div>` : ''}<div class="result" aria-live="polite"></div></div>
        <div class="acts">
          <button class="btn small accent" data-say="${esc(it.no)}">${ICON.play} ${t('Nghe')}</button>
          <button class="btn small" data-say="${esc(it.no)}" data-slow aria-label="${t('Nghe chậm')}">${ICON.turtle}</button>
          <button class="btn small" data-act="mic">${ICON.mic}<span>${t('Nói thử')}</span></button>
          <button class="btn small" data-act="learn" aria-pressed="${on}" title="${t('Đánh dấu đã thuộc')}" style="${on ? 'background:var(--ok-soft);color:var(--ok);border-color:var(--ok)' : ''}">${ICON.check}</button>
        </div></div>`;
    }).join('')}</div>`;
  }
  pv.addEventListener('click', async e => {
    if (mode !== 'learn') return;
    const b = e.target.closest('[data-act]'); if (!b) return;
    const row = b.closest('.row'); const i = Number(row.dataset.i); const it = topic.items[i];
    if (b.dataset.act === 'learn') {
      const k = key(topic, i);
      if (learned.has(k)) learned.delete(k); else { learned.add(k); store.addCard(it, `phrase:${topic.id}`); sfx('ok', store.s.settings.sfx); }
      store.s.phrases = [...learned]; store.save(); drawLearn();
    } else if (b.dataset.act === 'mic') {
      const out = row.querySelector('.result');
      out.innerHTML = `<span class="muted">${t('Đang nghe… đọc to câu trên.')}</span>`; b.classList.add('speaking');
      try {
        const r = await stt.listen(it.no); const pct = Math.round(r.score * 100);
        out.innerHTML = `${pct >= 90 ? `<b class="good">${t('Rất chuẩn!')}</b>` : pct >= 60 ? `<b class="mid">${t('Gần đúng, nghe chậm rồi thử lại.')}</b>` : `<b class="low">${t('Máy chưa nhận ra, nghe lại và nói chậm hơn.')}</b>`} <span class="muted">${t('Máy nghe được: “{text}” ({pct}%)', { text: esc(r.text), pct })}</span>`;
        if (pct >= 60) store.addXp(1);
      } catch (err) { out.innerHTML = `<span class="mid">${esc(stt.errorText(err))}</span>`; }
      b.classList.remove('speaking');
    }
  });

  function drawShadow() {
    const items = topic.items;
    pv.innerHTML = `<section class="stage" id="stage">
      <p class="muted small">${t('Câu')} <span id="sIdx">1</span>/${items.length}</p>
      <p class="no say" id="sNo" lang="nb">${esc(items[0].no)}</p><p class="muted" id="sVi">${esc(mean(items[0]))}</p>
      <div class="meter"><span id="sBar"></span></div>
      <p style="margin-top:.8rem;font-weight:500;min-height:1.5em" id="sPhase" aria-live="polite">${t('Nghe câu mẫu, rồi nhại lại thật to khi thanh đỏ chạy.')}</p>
      <div class="ctrl"><button class="btn accent" id="sStart">${t('Bắt đầu')}</button>
        <label class="toggle"><input type="checkbox" id="sHide"> ${t('Ẩn chữ Na Uy')}</label>
        <label class="toggle"><input type="checkbox" id="sTwice" checked> ${t('Mỗi câu 2 lần')}</label></div></section>`;
    $('#sHide', pv).onchange = e => $('#stage', pv).classList.toggle('hide-text', e.target.checked);
    $('#sStart', pv).onclick = () => { if ($('#sStart', pv).dataset.running === '1') { stop(); idle(t('Đã dừng. Bấm Bắt đầu để luyện tiếp.')); } else runShadow(); };
  }
  function idle(msg) { const b = $('#sStart', pv); if (!b) return; b.dataset.running = '0'; b.textContent = t('Bắt đầu'); $('#sPhase', pv).textContent = msg; $('#sBar', pv).style.width = '0'; }
  function countdown(ms, tk) {
    return new Promise(res => {
      const bar = $('#sBar', pv); const t0 = performance.now();
      const step = now => { if (tk !== shadowToken || !bar.isConnected) return res(false); const p = Math.min(1, (now - t0) / ms); bar.style.width = `${p * 100}%`; if (p < 1) requestAnimationFrame(step); else res(true); };
      requestAnimationFrame(step);
    });
  }
  async function runShadow() {
    stop(); const tk = ++shadowToken;
    const items = topic.items; const reps = $('#sTwice', pv).checked ? 2 : 1;
    const b = $('#sStart', pv); b.dataset.running = '1'; b.textContent = t('Dừng');
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      $('#sIdx', pv).textContent = i + 1; $('#sNo', pv).textContent = it.no; $('#sVi', pv).textContent = mean(it);
      for (let r = 0; r < reps; r++) {
        if (tk !== shadowToken) return;
        $('#sBar', pv).style.width = '0'; $('#sPhase', pv).textContent = t('Nghe…');
        await tts.speak(it.no);
        if (tk !== shadowToken) return;
        $('#sPhase', pv).textContent = t('Đến lượt anh, nói to!');
        if (!(await countdown(Math.max(2200, it.no.split(/\s+/).length * 750 / store.s.settings.rate), tk))) return;
      }
    }
    if (tk === shadowToken) { idle(t('Xong một lượt! Bật “Ẩn chữ” để thử sức.')); store.addXp(5); }
  }

  function drawQuiz() {
    const items = topic.items; const order = shuffle(items.map((_, i) => i)); let pos = 0; let score = 0;
    const show = () => {
      if (pos >= order.length) {
        const pct = Math.round(score / order.length * 100);
        store.addXp(Math.round(score / 2) + 2);
        pv.innerHTML = `<section class="stage"><p class="muted small">${t('Kết quả')}</p><p class="no say">${score}/${order.length}</p><p>${pct >= 80 ? t('Rất tốt! Tai anh đã quen với chủ đề này.') : pct >= 50 ? t('Khá rồi. Luyện thêm phần Nhại theo rồi làm lại nhé.') : t('Quay lại phần Học câu, nghe chậm từng câu rồi thử lại.')}</p><div class="ctrl"><button class="btn accent" id="qAgain">${t('Làm lại')}</button></div></section>`;
        $('#qAgain', pv).onclick = drawQuiz; return;
      }
      const idx = order[pos]; const it = items[idx];
      const opts = shuffle([idx, ...shuffle(items.map((_, i) => i).filter(i => i !== idx)).slice(0, 3)]);
      pv.innerHTML = `<section class="stage"><p class="muted small">${t('Câu {i}/{n} · Đúng {s}', { i: pos + 1, n: order.length, s: score })}</p>
        <div class="big-listen" style="margin:16px 0"><button class="icon-btn" data-say="${esc(it.no)}" aria-label="${t('Nghe lại')}">${ICON.sound}</button><button class="icon-btn slow" data-say="${esc(it.no)}" data-slow aria-label="${t('Nghe chậm')}">${ICON.turtle}</button></div>
        <div class="opts" style="text-align:left">${opts.map(o => `<button class="opt" data-o="${o}">${esc(mean(items[o]))}</button>`).join('')}</div>
        <div id="qRev" style="margin-top:14px;min-height:1.6em" aria-live="polite"></div></section>`;
      $$('.opt', pv).forEach(btn => btn.onclick = () => {
        const ok = Number(btn.dataset.o) === idx; if (ok) score++;
        sfx(ok ? 'ok' : 'bad', store.s.settings.sfx);
        $$('.opt', pv).forEach(x => { x.disabled = true; if (Number(x.dataset.o) === idx) x.classList.add('right'); });
        if (!ok) { btn.classList.add('wrong'); store.addMistake(it); }
        $('#qRev', pv).innerHTML = `<p class="no" lang="nb" style="font-size:1.3rem">${esc(it.no)}</p><div class="ctrl"><button class="btn primary" id="qNext">${t('Câu tiếp')}</button></div>`;
        $('#qNext', pv).onclick = () => { pos++; show(); }; $('#qNext', pv).focus();
      });
      setTimeout(() => tts.speak(it.no), 200);
    };
    pv.innerHTML = `<section class="stage"><p class="muted">${t('Nghe câu tiếng Na Uy và chọn nghĩa đúng')}</p><div class="big-listen" style="margin:16px 0"><button class="icon-btn" id="qStart" aria-label="${t('Bắt đầu')}">${ICON.play}</button></div><p class="muted small">${t('Bấm để bắt đầu.')}</p></section>`;
    $('#qStart', pv).onclick = show;
  }

  paintSeg(); draw();
  return stop;
}

// Trình làm bài kiểu Duolingo: tạo bài tập từ từ vựng/câu và chạy toàn màn hình.
import { $, $$, esc, shuffle, sample, ICON, sfx, bare, normNo, asciiNo, tapWords } from './ui.js';
import { store } from './store.js';
import { tts, stt } from './speech.js';
import { t, mean, L } from './i18n.js';

const KIND = {
  pick_vi: 'Chọn nghĩa đúng', pick_no: 'Chọn từ tiếng Na Uy', listen_pick: 'Nghe và chọn', match: 'Ghép cặp',
  build: 'Dịch câu này', dictation: 'Nghe và viết lại', speak: 'Nói câu này', type_no: 'Viết bằng tiếng Na Uy', cloze: 'Điền vào chỗ trống',
};

// Cho phép tắt bài nói trong 15 phút ("Không nói được lúc này").
let speakOffUntil = 0;
const canSpeak = () => stt.supported && Date.now() > speakOffUntil;
const canListen = () => tts.supported;

const tokens = s => s.replace(/[.!?]+$/, '').split(/\s+/).filter(Boolean);
const cleanTok = s => s.replace(/[,;:«»"“”]/g, '');

/**
 * Sinh bài tập.
 * vocab: [{no, vi, en, pos, g}], sentences: [{no, vi, en, tip}], pool: từ vựng phụ để làm phương án nhiễu.
 * isNew: true nếu lần đầu học (nhiều bài nhận biết hơn).
 */
export function buildExercises({ vocab = [], sentences = [], pool = [], count = 14, isNew = false }) {
  const v = vocab.filter(x => x.no && mean(x));
  const s = sentences.filter(x => x.no && mean(x));
  const distract = [...v, ...pool.filter(p => mean(p) && !v.some(x => x.no === p.no))];
  const ex = [];
  const key = { m: mean, no: x => x.no };
  const optsFor = (item, field, n = 4) => {
    const others = distract.filter(d => key[field](d) !== key[field](item) && bare(d.no) !== bare(item.no));
    const uniq = []; const seen = new Set([key[field](item)]);
    for (const d of shuffle(others)) { const k = key[field](d); if (!seen.has(k)) { seen.add(k); uniq.push(d); } if (uniq.length >= n - 1) break; }
    return shuffle([item, ...uniq]);
  };

  // 1) Nhận biết từ mới
  for (const w of (isNew ? v : sample(v, Math.ceil(v.length / 2)))) ex.push({ type: 'pick_vi', item: w, opts: optsFor(w, 'm'), isNew });
  // 2) Ghép cặp
  if (v.length >= 4) ex.push({ type: 'match', items: sample(v, Math.min(5, v.length)) });
  // 3) Chọn từ Na Uy / nghe chọn / gõ từ
  for (const w of sample(v, Math.min(4, v.length))) {
    const r = Math.random();
    if (r < 0.4 || !canListen()) ex.push({ type: 'pick_no', item: w, opts: optsFor(w, 'no') });
    else if (r < 0.7) ex.push({ type: 'listen_pick', item: w, opts: optsFor(w, 'no') });
    else ex.push({ type: 'type_no', item: w });
  }
  // 4) Câu: xếp từ, điền chỗ trống, nghe chép, nói
  const sents = shuffle(s);
  sents.forEach((st, i) => {
    const r = i % 4;
    if (r === 0 || r === 2) ex.push({ type: 'build', item: st, bank: bankFor(st, s) });
    else if (r === 1) {
      const c = clozeFor(st, v, distract);
      if (c) ex.push(c); else ex.push({ type: 'build', item: st, bank: bankFor(st, s) });
    } else if (canListen() && Math.random() < 0.5) ex.push({ type: 'dictation', item: st });
    else if (canSpeak()) ex.push({ type: 'speak', item: st });
    else ex.push({ type: 'build', item: st, bank: bankFor(st, s) });
  });

  // Giữ bài nhận biết từ mới ở đầu, còn lại trộn nhẹ.
  const head = ex.filter(e => e.type === 'pick_vi');
  const rest = shuffle(ex.filter(e => e.type !== 'pick_vi'));
  const all = [...head, ...rest];
  return all.slice(0, Math.max(count, head.length + 4));
}

function bankFor(st, all) {
  const words = tokens(st.no).map(cleanTok);
  const others = all.filter(x => x.no !== st.no).flatMap(x => tokens(x.no).map(cleanTok)).filter(w => !words.map(x => x.toLowerCase()).includes(w.toLowerCase()));
  const extra = sample([...new Set(others)], Math.min(4, Math.max(2, Math.round(words.length / 2))));
  return shuffle([...words, ...extra]);
}

function clozeFor(st, vocab, distract) {
  const toks = tokens(st.no);
  const lw = toks.map(x => cleanTok(x).toLowerCase());
  const hit = vocab.map(v => bare(v.no).toLowerCase()).find(b => !b.includes(' ') && lw.includes(b));
  if (!hit) return null;
  const idx = lw.indexOf(hit);
  const answer = cleanTok(toks[idx]);
  const opts = shuffle([answer, ...sample([...new Set(distract.map(d => bare(d.no)).filter(w => !w.includes(' ') && w.toLowerCase() !== hit))], 3)]);
  return { type: 'cloze', item: st, idx, answer, opts };
}

/**
 * Chạy bài tập toàn màn hình trong `root`.
 * onFinish({ correct, total, xp, seconds, perfect, mistakes }) được gọi khi xong.
 */
export function runPlayer(root, exercises, { title = '', onFinish, onQuit, xpBase = 10 } = {}) {
  const queue = exercises.map(e => ({ ...e }));
  const total = queue.length;
  let done = 0; let firstTryCorrect = 0; let combo = 0; let bestCombo = 0;
  const wrongOnce = new Set();
  const mistakes = [];
  const t0 = Date.now();
  let cur = null; let state = 'answer'; // answer | feedback
  let checkFn = null;
  let keyHandler = null;

  root.innerHTML = `<div class="player">
    <div class="p-top">
      <button class="icon-btn ghost" id="pQuit" aria-label="${t('Thoát')}" style="border:0;background:none;color:var(--muted)">${ICON.x}</button>
      <div class="progress" role="progressbar" aria-label="${t('Tiến độ bài')}"><div id="pBar" style="width:0"></div></div>
      <span class="combo" id="pCombo"></span>
    </div>
    <div class="p-body" id="pBody"></div>
    <div class="p-foot" id="pFoot"><div class="p-foot-in" id="pFootIn"></div></div>
  </div>`;
  const body = $('#pBody', root); const foot = $('#pFoot', root); const footIn = $('#pFootIn', root);

  $('#pQuit', root).onclick = () => {
    if (done === 0 || confirm(t('Thoát bài học? Tiến độ của bài này sẽ không được lưu.'))) { cleanup(); onQuit && onQuit(); }
  };

  function cleanup() { tts.stop(); stt.abort(); if (keyHandler) document.removeEventListener('keydown', keyHandler); }
  keyHandler = e => {
    if (e.target.matches('textarea, input') && e.key !== 'Enter') return;
    if (e.key === 'Enter' && !e.shiftKey) {
      const b = $('#pMain', root); if (b && !b.disabled) { e.preventDefault(); b.click(); }
    } else if (state === 'answer' && /^[1-9]$/.test(e.key) && !e.target.matches('textarea, input')) {
      const o = $$('.opts .opt, .bank .wtile:not(.used)', root)[Number(e.key) - 1]; if (o) o.click();
    }
  };
  document.addEventListener('keydown', keyHandler);

  function setFoot(html, cls = '') { foot.className = `p-foot ${cls}`; footIn.innerHTML = html; }
  function mainBtn(label, enabled, kind = 'primary') { return `<button class="btn ${kind}" id="pMain" ${enabled ? '' : 'disabled'}>${label}</button>`; }
  function enableCheck(on) { const b = $('#pMain', root); if (b && state === 'answer') b.disabled = !on; }
  function bar() { $('#pBar', root).style.width = `${Math.round(done / total * 100)}%`; $('#pCombo', root).textContent = combo >= 3 ? `🔥 ${combo}` : ''; }

  function next() {
    bar();
    if (!queue.length) return finish();
    cur = queue.shift(); state = 'answer'; checkFn = null;
    root._cur = cur; // dùng cho kiểm thử tự động
    body.innerHTML = '';
    const skipSpeak = cur.type === 'speak' ? `<button class="btn ghost" id="pSkipSpeak">${t('Không nói được lúc này')}</button>` : '';
    const skipListen = (cur.type === 'listen_pick' || cur.type === 'dictation') ? `<button class="btn ghost" id="pSkipListen">${t('Không nghe được lúc này')}</button>` : '';
    setFoot(`<span>${skipSpeak}${skipListen}</span>${mainBtn(t('Kiểm tra'), false)}`);
    RENDER[cur.type](cur);
    $('#pMain', root).onclick = () => { if (state === 'answer' && checkFn) checkFn(); };
    const sk = $('#pSkipSpeak', root);
    if (sk) sk.onclick = () => { speakOffUntil = Date.now() + 15 * 60e3; stt.abort(); done++; if (!wrongOnce.has(cur)) firstTryCorrect++; next(); };
    const sl = $('#pSkipListen', root);
    if (sl) sl.onclick = () => { tts.stop(); queue.push({ type: 'build', item: cur.item, bank: bankFor(cur.item, [cur.item]) }); next(); };
  }

  function grade(ok, correctHtml, item, note = '') {
    state = 'feedback';
    store.answer(ok);
    if (ok) {
      combo++; bestCombo = Math.max(bestCombo, combo); done++;
      if (!wrongOnce.has(cur)) firstTryCorrect++;
      if (item) store.clearMistake(item.no);
      sfx('ok', store.s.settings.sfx);
    } else {
      combo = 0; wrongOnce.add(cur);
      if (item) { store.addMistake(item); mistakes.push(item); }
      queue.push(cur); // làm lại ở cuối
      sfx('bad', store.s.settings.sfx);
    }
    const praise = t(['Tuyệt vời!', 'Chính xác!', 'Giỏi lắm!', 'Rất tốt!', 'Đúng rồi!'][Math.floor(Math.random() * 5)]);
    const tip = item ? L(item, 'tip') : '';
    setFoot(`<div class="fb"><span class="ic">${ok ? ICON.check : ICON.x}</span><div><h3>${ok ? praise : t('Chưa đúng')}</h3>${correctHtml ? `<p>${ok ? '' : t('Đáp án đúng: ')}<span class="ans" lang="nb">${correctHtml}</span></p>` : ''}${note ? `<p class="small">${note}</p>` : ''}${tip ? `<p class="small muted">💡 ${esc(tip)}</p>` : ''}</div></div>${mainBtn(t('Tiếp tục'), true, ok ? 'ok' : 'bad')}`, ok ? 'ok' : 'bad');
    $('#pMain', root).onclick = () => next();
    $('#pMain', root).focus({ preventScroll: true });
    bar();
    if (item && store.s.settings.autoplay && /build|dictation|cloze|speak/.test(cur.type)) tts.speak(item.no);
  }

  function finish() {
    cleanup();
    const seconds = Math.round((Date.now() - t0) / 1000);
    const acc = Math.round(firstTryCorrect / total * 100);
    const perfect = acc === 100;
    const xp = xpBase + (perfect ? 5 : acc >= 80 ? 2 : 0) + Math.min(5, Math.floor(bestCombo / 5));
    store.s.stats.seconds += seconds;
    sfx('done', store.s.settings.sfx);
    const m = Math.floor(seconds / 60); const s = seconds % 60;
    root.innerHTML = `<div class="player"><div class="done-screen">
      <div class="big">${perfect ? '🏆' : acc >= 80 ? '🎉' : '💪'}</div>
      <h1>${perfect ? t('Hoàn hảo!') : t('Hoàn thành bài học!')}</h1>
      <p class="muted">${esc(title)}</p>
      <div class="result-boxes">
        <div class="rbox"><small>${t('Tổng XP')}</small><b>⚡ ${xp}</b></div>
        <div class="rbox ok"><small>${t('Chính xác')}</small><b>🎯 ${acc}%</b></div>
        <div class="rbox deep"><small>${t('Thời gian')}</small><b>⏱ ${m}:${String(s).padStart(2, '0')}</b></div>
      </div>
      ${mistakes.length ? `<p class="muted small">${t('Các câu sai đã được đưa vào mục <b>Ôn tập → Lỗi sai</b>.')}</p>` : ''}
      <button class="btn primary" id="pDone" style="min-width:220px;min-height:52px">${t('Tiếp tục')}</button>
    </div></div>`;
    const res = { correct: firstTryCorrect, total, xp, seconds, perfect, acc, mistakes };
    const btn = $('#pDone', root); btn.focus();
    const onKey = e => { if (e.key === 'Enter') { document.removeEventListener('keydown', onKey); btn.click(); } };
    setTimeout(() => document.addEventListener('keydown', onKey), 300);
    btn.onclick = () => { document.removeEventListener('keydown', onKey); onFinish && onFinish(res); };
  }

  // ---------- Các dạng bài ----------
  function header(kind, extra = '') { return `<div class="p-kind">${extra}${t(KIND[kind])}</div>`; }
  function choose(container, onPick) {
    $$('.opt', container).forEach(o => o.addEventListener('click', () => {
      if (state !== 'answer') return;
      $$('.opt', container).forEach(x => x.classList.remove('sel'));
      o.classList.add('sel'); onPick(o); enableCheck(true);
      if (o.dataset.say) tts.speak(o.dataset.say);
      else sfx('tap', store.s.settings.sfx);
    }));
  }
  function markOpts(rightVal, attr = 'v') {
    $$('.opts .opt', body).forEach(o => { o.disabled = true; if (o.dataset[attr] === rightVal) o.classList.add('right'); else if (o.classList.contains('sel')) o.classList.add('wrong'); });
  }
  const sayBtns = no => `<button class="icon-btn" data-say="${esc(no)}" aria-label="${t('Nghe')}">${ICON.sound}</button><button class="icon-btn slow" data-say="${esc(no)}" data-slow aria-label="${t('Nghe chậm')}">${ICON.turtle}</button>`;
  const letters = () => `<div class="letters">${['æ', 'ø', 'å'].map(k => `<button class="key" data-k="${k}">${k}</button>`).join('')}</div>`;

  const RENDER = {
    pick_vi(e) {
      const right = mean(e.item);
      body.innerHTML = `${header('pick_vi', e.isNew ? `<span class="new">${t('TỪ MỚI')}</span>` : '')}
        <div class="p-prompt">${canListen() ? sayBtns(e.item.no) : ''}<span class="say no" lang="nb">${tapWords(e.item.no)}</span></div>
        <div class="opts">${e.opts.map((o, i) => `<button class="opt" data-v="${esc(mean(o))}"><span class="k">${i + 1}</span>${esc(mean(o))}</button>`).join('')}</div>`;
      let sel = null; choose(body, o => { sel = o.dataset.v; });
      if (store.s.settings.autoplay) tts.speak(e.item.no);
      checkFn = () => { markOpts(right); grade(sel === right, esc(right), e.item); };
    },
    pick_no(e) {
      body.innerHTML = `${header('pick_no')}<p class="p-q">“${esc(mean(e.item))}”</p>
        <div class="opts grid2">${e.opts.map((o, i) => `<button class="opt" lang="nb" data-v="${esc(o.no)}" data-say="${esc(o.no)}"><span class="k">${i + 1}</span>${esc(o.no)}</button>`).join('')}</div>`;
      let sel = null; choose(body, o => { sel = o.dataset.v; });
      checkFn = () => { markOpts(e.item.no); grade(sel === e.item.no, esc(e.item.no), e.item); };
    },
    listen_pick(e) {
      body.innerHTML = `${header('listen_pick')}<div class="big-listen">${sayBtns(e.item.no)}</div>
        <div class="opts grid2">${e.opts.map((o, i) => `<button class="opt" lang="nb" data-v="${esc(o.no)}"><span class="k">${i + 1}</span>${esc(o.no)}</button>`).join('')}</div>`;
      let sel = null; choose(body, o => { sel = o.dataset.v; });
      setTimeout(() => tts.speak(e.item.no), 250);
      checkFn = () => { markOpts(e.item.no); grade(sel === e.item.no, `${esc(e.item.no)} · ${esc(mean(e.item))}`, e.item); };
    },
    match(e) {
      const left = shuffle(e.items); const right = shuffle(e.items);
      body.innerHTML = `${header('match')}<p class="muted" style="margin-bottom:14px">${t('Chạm vào từng cặp từ có nghĩa giống nhau.')}</p>
        <div class="match"><div class="opts">${left.map(x => `<button class="opt" lang="nb" data-k="${esc(x.no)}" data-side="l">${esc(bare(x.no))}</button>`).join('')}</div>
        <div class="opts">${right.map(x => `<button class="opt" data-k="${esc(x.no)}" data-side="r">${esc(mean(x))}</button>`).join('')}</div></div>`;
      let selL = null; let selR = null; let leftN = e.items.length; let errors = 0;
      $$('.match .opt', body).forEach(o => o.addEventListener('click', () => {
        if (o.dataset.side === 'l') { $$('[data-side=l]', body).forEach(x => x.classList.remove('sel')); selL = o; tts.speak(o.dataset.k); }
        else { $$('[data-side=r]', body).forEach(x => x.classList.remove('sel')); selR = o; sfx('tap', store.s.settings.sfx); }
        o.classList.add('sel');
        if (selL && selR) {
          if (selL.dataset.k === selR.dataset.k) {
            [selL, selR].forEach(x => { x.classList.remove('sel'); x.classList.add('done'); });
            leftN--;
            if (!leftN) { checkFn = () => grade(errors < 2, '', null, errors ? t('Sai {n} lần.', { n: errors }) : ''); enableCheck(true); $('#pMain', root).click(); }
          } else {
            errors++; const a = selL; const b = selR;
            [a, b].forEach(x => x.classList.add('flash')); sfx('bad', store.s.settings.sfx);
            const it = e.items.find(i => i.no === a.dataset.k); if (it) store.addMistake(it);
            setTimeout(() => [a, b].forEach(x => x.classList.remove('flash', 'sel')), 450);
          }
          selL = null; selR = null;
        }
      }));
    },
    build(e) {
      body.innerHTML = `${header('build')}<div class="p-prompt"><span class="say">${esc(mean(e.item))}</span></div>
        <div class="answer-line" id="ans" aria-label="${t('Câu trả lời')}"></div>
        <div class="bank" id="bank">${e.bank.map((w, i) => `<button class="wtile" lang="nb" data-i="${i}">${esc(w)}</button>`).join('')}</div>`;
      const ans = $('#ans', body); const picked = [];
      $$('#bank .wtile', body).forEach(tile => tile.addEventListener('click', () => {
        if (state !== 'answer' || tile.classList.contains('used')) return;
        tile.classList.add('used'); picked.push(tile.dataset.i); sfx('tap', store.s.settings.sfx);
        const c = document.createElement('button'); c.className = 'wtile'; c.lang = 'nb'; c.textContent = tile.textContent; c.dataset.i = tile.dataset.i;
        c.onclick = () => { if (state !== 'answer') return; picked.splice(picked.indexOf(c.dataset.i), 1); tile.classList.remove('used'); c.remove(); enableCheck(picked.length > 0); };
        ans.appendChild(c); enableCheck(true);
      }));
      checkFn = () => {
        const said = $$('.wtile', ans).map(x => x.textContent).join(' ');
        grade(normNo(said) === normNo(e.item.no), esc(e.item.no), e.item);
      };
    },
    cloze(e) {
      const toks = tokens(e.item.no);
      const shown = toks.map((x, i) => (i === e.idx ? '<span class="gap" id="gap">&nbsp;</span>' : esc(x))).join(' ') + (/[.!?]$/.test(e.item.no) ? e.item.no.slice(-1) : '');
      body.innerHTML = `${header('cloze')}<p class="muted" style="margin-bottom:6px">${esc(mean(e.item))}</p><p class="cloze" lang="nb">${shown}</p>
        <div class="opts grid2">${e.opts.map((o, i) => `<button class="opt" lang="nb" data-v="${esc(o)}"><span class="k">${i + 1}</span>${esc(o)}</button>`).join('')}</div>`;
      let sel = null; choose(body, o => { sel = o.dataset.v; $('#gap', body).textContent = sel; });
      checkFn = () => { markOpts(e.answer); grade(sel && sel.toLowerCase() === e.answer.toLowerCase(), esc(e.item.no), e.item); };
    },
    dictation(e) {
      body.innerHTML = `${header('dictation')}<div class="big-listen">${sayBtns(e.item.no)}</div>
        <textarea class="answer" id="dic" lang="nb" placeholder="${t('Gõ câu bằng tiếng Na Uy…')}" spellcheck="false" autocapitalize="off"></textarea>${letters()}`;
      wireLetters(); const ta = $('#dic', body);
      ta.addEventListener('input', () => enableCheck(ta.value.trim().length > 0));
      setTimeout(() => tts.speak(e.item.no), 250);
      checkFn = () => {
        const v = ta.value; ta.disabled = true;
        const exact = normNo(v) === normNo(e.item.no);
        const loose = asciiNo(v) === asciiNo(e.item.no);
        grade(exact || loose, `${esc(e.item.no)}<br><span class="muted small" style="font-family:var(--sans)">${esc(mean(e.item))}</span>`, e.item, !exact && loose ? t('Gần đúng: chú ý các chữ æ, ø, å.') : '');
      };
    },
    type_no(e) {
      const art = ({ m: 'en', f: 'ei', n: 'et' })[e.item.g];
      const hint = e.item.g ? t(' (danh từ, nhớ mạo từ {a})', { a: art }) : e.item.pos === 'v' ? t(' (động từ, có thể gõ cả "å")') : '';
      body.innerHTML = `${header('type_no')}<p class="p-q">“${esc(mean(e.item))}”<span class="muted small" style="font-weight:400">${hint}</span></p>
        <input type="text" class="answer" id="typ" lang="nb" placeholder="${t('Gõ bằng tiếng Na Uy…')}" autocomplete="off" autocapitalize="off" spellcheck="false" style="font-size:1.2rem;font-family:var(--serif);padding:14px;border-width:2px">${letters()}`;
      wireLetters(); const inp = $('#typ', body); inp.focus();
      inp.addEventListener('input', () => enableCheck(inp.value.trim().length > 0));
      checkFn = () => {
        const v = inp.value; inp.disabled = true;
        const okFull = normNo(v) === normNo(e.item.no);
        const okBare = normNo(bare(v)) === normNo(bare(e.item.no));
        const loose = asciiNo(bare(v)) === asciiNo(bare(e.item.no));
        const note = okFull ? '' : okBare && e.item.g ? `${t('Nhớ mạo từ: ')}${esc(e.item.no)}` : loose ? t('Gần đúng: chú ý các chữ æ, ø, å.') : '';
        grade(okFull || okBare || loose, esc(e.item.no), e.item, note);
      };
    },
    speak(e) {
      body.innerHTML = `${header('speak')}<div class="p-prompt">${sayBtns(e.item.no)}<span class="say no" lang="nb">${tapWords(e.item.no)}</span></div>
        <p class="muted">${esc(mean(e.item))}</p>
        <div class="speak-zone"><button class="mic-btn" id="mic" aria-label="${t('Bấm để nói')}">${ICON.mic}</button><p class="muted small" id="micMsg">${t('Bấm micro rồi đọc to câu trên.')}</p></div>`;
      const mic = $('#mic', body); const msg = $('#micMsg', body); let best = null;
      if (store.s.settings.autoplay) tts.speak(e.item.no);
      mic.onclick = async () => {
        if (state !== 'answer') return;
        mic.classList.add('listening'); msg.textContent = t('Đang nghe…');
        try {
          const r = await stt.listen(e.item.no); best = r;
          const pct = Math.round(r.score * 100);
          msg.innerHTML = t('Máy nghe được: “{text}” ({pct}%)', { text: esc(r.text), pct });
          if (pct >= 60) { checkFn = () => grade(true, '', e.item, pct >= 90 ? t('Phát âm rất chuẩn!') : t('Khá tốt, nghe lại mẫu để chuẩn hơn.')); enableCheck(true); $('#pMain', root).click(); }
          else { msg.innerHTML += `<br><span class="mid">${t('Chưa khớp lắm. Nghe chậm rồi thử lại, hoặc bấm Kiểm tra để bỏ qua.')}</span>`; enableCheck(true); }
        } catch (err) { msg.textContent = stt.errorText(err) || t('Bấm micro để thử lại.'); enableCheck(true); }
        mic.classList.remove('listening');
      };
      checkFn = () => grade(false, esc(e.item.no), null, best ? t('Lần sau thử nói chậm và rõ từng từ.') : '');
    },
  };

  function wireLetters() {
    $$('.key[data-k]', body).forEach(k => k.addEventListener('click', () => {
      const ta = $('textarea.answer, input.answer', body); if (!ta || ta.disabled) return;
      const s = ta.selectionStart ?? ta.value.length; const en = ta.selectionEnd ?? ta.value.length;
      ta.value = ta.value.slice(0, s) + k.dataset.k + ta.value.slice(en); ta.focus(); ta.setSelectionRange(s + 1, s + 1);
      ta.dispatchEvent(new Event('input'));
    }));
  }

  next();
  return cleanup;
}

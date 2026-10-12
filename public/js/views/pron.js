// Phát âm: nghe bất kỳ câu · bảng phát âm · luyện cặp âm tối thiểu.
import { $, $$, esc, ICON, shuffle, sfx } from '../ui.js';
import { store } from '../store.js';
import { tts } from '../speech.js';
import { ALPHA, SECTIONS, SPECIAL, RULES, NAMES } from '../pron-data.js';

// Cặp từ chỉ khác nhau một âm: luyện tai phân biệt.
const PAIRS = [
  ['tak', 'mái nhà', 'takk', 'cảm ơn', 'Nguyên âm dài / ngắn'],
  ['hat', 'sự thù ghét', 'hatt', 'mũ', 'Nguyên âm dài / ngắn'],
  ['søt', 'ngọt', 'søtt', 'ngọt (trung)', 'Nguyên âm dài / ngắn'],
  ['tre', 'số ba', 'trær', 'những cái cây', 'e / æ'],
  ['bønder', 'nông dân', 'bønner', 'hạt đậu', 'Thanh 1 / thanh 2'],
  ['ful', 'xấu xí', 'full', 'đầy', 'u dài / ngắn'],
  ['by', 'thành phố', 'bu', 'chuồng', 'y / u'],
  ['lys', 'ánh sáng', 'lus', 'con chấy', 'y / u'],
  ['sur', 'chua', 'syr', 'khâu', 'u / y'],
  ['kjøre', 'lái xe', 'skjøre', 'mong manh', 'kj / skj'],
  ['kino', 'rạp phim', 'sjø', 'biển', 'kj / sj'],
  ['tog', 'tàu hỏa', 'tak', 'mái nhà', 'o / a'],
  ['mat', 'thức ăn', 'mett', 'no bụng', 'a / e'],
  ['hus', 'ngôi nhà', 'hos', 'ở chỗ (ai)', 'u / o'],
  ['dør', 'cánh cửa', 'dyr', 'con vật; đắt', 'ø / y'],
  ['rød', 'đỏ', 'rå', 'sống (chưa nấu)', 'ø / å'],
  ['vann', 'nước', 'venn', 'bạn', 'a / e'],
  ['fem', 'năm', 'fine', 'đẹp (số nhiều)', 'e / i'],
];

const tokens = t => t.split(/\s+/).map(w => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(Boolean);

function analyze(text) {
  const out = []; const seen = new Set();
  for (const raw of tokens(text)) {
    const w = raw.toLowerCase();
    if (SPECIAL[w] && !seen.has('w:' + w)) { seen.add('w:' + w); out.push([raw, SPECIAL[w]]); continue; }
    for (const [re, label, tip] of RULES) {
      if (re.test(w) && !seen.has('r:' + label)) { seen.add('r:' + label); out.push([label, `${tip} Ví dụ trong đoạn: ${raw}.`]); }
    }
  }
  return out.slice(0, 12);
}

export async function render(main, params, query) {
  let tab = query.tab || 'listen';
  main.innerHTML = `<div class="page">
    <div class="page-head"><div><h1 lang="nb">Si det høyt.</h1><p>Gõ bất kỳ từ, câu tiếng Na Uy để nghe; tra bảng phát âm; luyện tai với các cặp âm dễ nhầm.</p></div></div>
    <div class="seg" id="ptabs" style="margin-bottom:16px">
      <button data-t="listen">Nghe bất kỳ</button><button data-t="guide">Bảng phát âm</button><button data-t="pairs">Cặp âm dễ nhầm</button>
    </div>
    <p class="notice" id="pnotice" hidden style="margin-bottom:14px"></p>
    <div id="pbody"></div></div>`;
  const body = $('#pbody', main);
  const paintTabs = () => $$('#ptabs button', main).forEach(b => b.setAttribute('aria-pressed', b.dataset.t === tab));
  $('#ptabs', main).onclick = e => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.t; tts.stop(); history.replaceState(null, '', `#/pron?tab=${tab}`); paintTabs(); draw(); };
  setTimeout(() => {
    const n = $('#pnotice', main); if (!n) return;
    if (!tts.supported) { n.textContent = 'Trình duyệt này không đọc được văn bản thành tiếng. Hãy dùng Chrome, Edge hoặc Safari.'; n.hidden = false; }
    else if (!tts.hasNorwegian()) { n.innerHTML = 'Chưa tìm thấy giọng đọc tiếng Na Uy trên thiết bị nên phát âm có thể sai. <b>Windows:</b> Cài đặt → Thời gian và ngôn ngữ → Giọng nói → thêm “Norsk bokmål”. <b>iPhone:</b> Cài đặt → Trợ năng → Nội dung được đọc → Giọng nói → Norsk. <b>Android:</b> Cài đặt → Chuyển văn bản thành giọng nói → tải tiếng Na Uy. Chrome trên máy tính thường có sẵn giọng Google norsk.'; n.hidden = false; }
  }, 1500);

  function draw() { ({ listen: drawListen, guide: drawGuide, pairs: drawPairs })[tab](); }

  function drawListen() {
    const st = store.s;
    st.pron = st.pron || { text: '', history: [] };
    const voices = tts.voices();
    body.innerHTML = `<div class="card pron-box">
        <label for="ptxt" class="sr">Văn bản tiếng Na Uy</label>
        <textarea id="ptxt" lang="nb" spellcheck="false" placeholder="Skriv her… ví dụ: Hyggelig å møte deg">${esc(st.pron.text || '')}</textarea>
        <div class="letters" style="border-top:1px solid var(--line);padding-top:10px">${['æ', 'ø', 'å', 'Æ', 'Ø', 'Å'].map(k => `<button class="key" data-k="${k}">${k}</button>`).join('')}<button class="key" id="pclear" style="margin-left:auto;font-family:var(--sans);font-size:.85rem;padding:0 12px">Xóa</button></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        <button class="btn accent" id="pplay">${ICON.play} Nghe</button><button class="btn" id="pslow">${ICON.turtle} Nghe chậm</button>
        <button class="btn" id="pthree">Nghe 3 lần</button><button class="btn" id="pspell">Đánh vần</button><button class="btn" id="pstop">Dừng</button>
      </div>
      <div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:12px;align-items:center" class="muted small">
        <label style="display:flex;gap:8px;align-items:center">Tốc độ <input type="range" id="prate" min="0.4" max="1.2" step="0.05" value="${st.settings.rate}" style="accent-color:var(--deep)"> <span id="prv">${st.settings.rate}×</span></label>
        <label style="display:flex;gap:8px;align-items:center">Giọng <select id="pvoice" style="width:auto;padding:5px 8px">${voices.length ? voices.map(v => `<option ${tts.current() === v ? 'selected' : ''}>${esc(v.name)}</option>`).join('') : '<option>Giọng mặc định</option>'}</select></label>
      </div>
      <div class="section-title"><h2>Từng từ</h2></div><p class="muted small" style="margin:-4px 0 10px">Chạm vào một từ để nghe riêng từ đó.</p><div class="words" id="pwords"></div>
      <div class="section-title"><h2>Mẹo đọc</h2></div><ul class="hints" id="phints"></ul>
      <div class="section-title"><h2>Đã nghe gần đây</h2></div><div class="chips" id="phist"></div>`;
    const ta = $('#ptxt', body);
    const refresh = () => {
      st.pron.text = ta.value; store.save(true);
      const ws = tokens(ta.value);
      $('#pwords', body).innerHTML = ws.length ? ws.map(w => `<button class="word" lang="nb" data-say="${esc(w)}">${esc(w)}</button>`).join('') : '<p class="muted small">Các từ anh gõ sẽ hiện ở đây.</p>';
      const h = analyze(ta.value);
      $('#phints', body).innerHTML = h.length ? h.map(([a, b]) => `<li><b lang="nb" style="font-family:var(--serif)">${esc(a)}</b>: ${esc(b)}</li>`).join('') : `<li style="border:0;background:none;padding:0" class="muted small">${ta.value.trim() ? 'Đoạn này không có quy tắc đặc biệt, đọc gần như chữ viết.' : 'Gõ một từ để xem mẹo.'}</li>`;
    };
    const hist = () => { $('#phist', body).innerHTML = st.pron.history.length ? st.pron.history.map(h => `<button class="chip" lang="nb" data-h="${esc(h)}">${esc(h)}</button>`).join('') : '<span class="muted small">Chưa có.</span>'; };
    const remember = t => { t = t.trim(); if (!t || t.length > 120) return; st.pron.history = [t, ...st.pron.history.filter(x => x !== t)].slice(0, 12); store.save(true); hist(); };
    let tm; ta.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(refresh, 250); });
    $$('.key[data-k]', body).forEach(k => k.onclick = () => { const s = ta.selectionStart ?? ta.value.length; ta.value = ta.value.slice(0, s) + k.dataset.k + ta.value.slice(ta.selectionEnd ?? s); ta.focus(); ta.setSelectionRange(s + 1, s + 1); refresh(); });
    $('#pclear', body).onclick = () => { ta.value = ''; refresh(); ta.focus(); };
    $('#pplay', body).onclick = () => { tts.speak(ta.value); remember(ta.value); };
    $('#pslow', body).onclick = () => { tts.speak(ta.value, 0.5); remember(ta.value); };
    $('#pthree', body).onclick = () => { remember(ta.value); tts.sequence([1, 2, 3].map(() => ({ text: ta.value })), 700); };
    $('#pspell', body).onclick = () => tts.sequence(tokens(ta.value).flatMap(w => [{ text: [...w.toLowerCase()].map(c => NAMES[c] || c).join(', '), rate: Math.min(st.settings.rate, 0.8) }, { text: w }]), 400);
    $('#pstop', body).onclick = () => tts.stop();
    $('#prate', body).oninput = e => { st.settings.rate = Number(e.target.value); $('#prv', body).textContent = `${st.settings.rate}×`; store.save(true); };
    $('#pvoice', body).onchange = e => tts.setVoice(e.target.value);
    $('#phist', body).onclick = e => { const b = e.target.closest('[data-h]'); if (b) { ta.value = b.dataset.h; refresh(); tts.speak(ta.value); } };
    refresh(); hist();
  }

  function exBtns(list) { return `<div class="ex">${list.map(([w, m]) => `<button data-say="${esc(w)}" lang="nb">${esc(w)}<small>${esc(m)}</small></button>`).join('')}</div>`; }
  function drawGuide() {
    body.innerHTML = `<nav class="chips scroll" style="margin-bottom:6px">${SECTIONS.map(s => `<a class="chip" href="#" data-jump="${s.id}">${esc(s.title.replace(/ \(.*\)/, ''))}</a>`).join('')}</nav>` + SECTIONS.map(s => {
      const rows = s.alpha
        ? ALPHA.map(([L, name, ipa, d, ex]) => `<div class="g"><button class="sym" data-say="${esc(name)}" aria-label="Nghe tên chữ ${L}">${L} ${L.toLowerCase()}<small>tên: ${esc(name)}</small></button><div><p>${esc(d)} <span class="tag">${esc(ipa)}</span></p>${exBtns(ex)}</div></div>`).join('')
        : s.rows.map(([sym, ipa, d, ex]) => `<div class="g"><div class="sym" lang="nb">${esc(sym)}<small>${esc(ipa)}</small></div><div><p>${esc(d)}</p>${exBtns(ex)}</div></div>`).join('');
      return `<section id="sec-${s.id}"><div class="section-title"><h2>${esc(s.title)}</h2></div><p class="muted" style="margin-bottom:10px">${esc(s.lead)}</p><div class="g-rows">${rows}</div></section>`;
    }).join('') + '<p class="muted small" style="margin-top:20px">Phát âm theo chuẩn Bokmål vùng Oslo (Østlandet). Cách đọc ghi bằng tiếng Việt chỉ là gần đúng, luôn nghe giọng mẫu để chỉnh tai.</p>';
    body.querySelector('nav').onclick = e => { const a = e.target.closest('[data-jump]'); if (!a) return; e.preventDefault(); $(`#sec-${a.dataset.jump}`, body).scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  }

  function drawPairs() {
    const order = shuffle(PAIRS).slice(0, 10); let pos = 0; let score = 0;
    const show = () => {
      if (pos >= order.length) {
        store.addXp(score + 2);
        body.innerHTML = `<section class="stage"><p class="muted small">Kết quả</p><p class="no say">${score}/${order.length}</p><p>${score >= 8 ? 'Tai rất thính!' : 'Mỗi ngày nghe một lượt, tai sẽ quen dần.'}</p><div class="ctrl"><button class="btn accent" id="again">Làm lại</button></div></section>`;
        $('#again', body).onclick = drawPairs; return;
      }
      const p = order[pos]; const which = Math.random() < 0.5 ? 0 : 2; const word = p[which];
      body.innerHTML = `<section class="stage"><p class="muted small">Câu ${pos + 1}/${order.length} · ${esc(p[4])}</p>
        <div class="big-listen" style="margin:16px 0"><button class="icon-btn" data-say="${esc(word)}" aria-label="Nghe">${ICON.sound}</button><button class="icon-btn slow" data-say="${esc(word)}" data-slow aria-label="Nghe chậm">${ICON.turtle}</button></div>
        <p class="muted" style="margin-bottom:10px">Anh nghe thấy từ nào?</p>
        <div class="opts grid2">${[0, 2].map(i => `<button class="opt" lang="nb" data-i="${i}" style="justify-content:center;flex-direction:column;gap:2px"><span style="font-size:1.4rem">${esc(p[i])}</span><small class="muted" style="font-family:var(--sans)">${esc(p[i + 1])}</small></button>`).join('')}</div>
        <div id="prv2" style="margin-top:12px"></div></section>`;
      setTimeout(() => tts.speak(word), 200);
      $$('.opt', body).forEach(b => b.onclick = () => {
        const ok = Number(b.dataset.i) === which; if (ok) score++;
        sfx(ok ? 'ok' : 'bad', store.s.settings.sfx);
        $$('.opt', body).forEach(x => { x.disabled = true; if (Number(x.dataset.i) === which) x.classList.add('right'); });
        if (!ok) b.classList.add('wrong');
        $('#prv2', body).innerHTML = `<div class="ctrl"><button class="btn small" data-say="${esc(p[0])}">${ICON.sound} ${esc(p[0])}</button><button class="btn small" data-say="${esc(p[2])}">${ICON.sound} ${esc(p[2])}</button><button class="btn primary" id="nx">Tiếp</button></div>`;
        $('#nx', body).onclick = () => { pos++; show(); };
      });
    };
    body.innerHTML = `<section class="stage"><h2>Luyện tai</h2><p class="muted" style="margin:8px 0 16px">Nghe một từ, chọn đúng từ trong cặp gần giống nhau: dài/ngắn, u/y, ø/å, kj/skj, thanh 1/thanh 2…</p><button class="btn accent" id="st">Bắt đầu</button></section>`;
    $('#st', body).onclick = show;
  }

  paintTabs(); draw();
  return () => tts.stop();
}

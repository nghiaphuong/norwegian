// Phát âm: nghe bất kỳ câu · bảng phát âm · luyện cặp âm tối thiểu.
import { $, $$, esc, ICON, shuffle, sfx } from '../ui.js';
import { store } from '../store.js';
import { tts } from '../speech.js';
import * as VI from '../pron-data.js';
import * as EN from '../pron-data-en.js';
import { t, isEn } from '../i18n.js';

// Cặp từ chỉ khác nhau một âm: [từ 1, nghĩa VI, nghĩa EN, từ 2, nghĩa VI, nghĩa EN, nhóm VI, nhóm EN]
const PAIRS = [
  ['tak', 'mái nhà', 'roof', 'takk', 'cảm ơn', 'thanks', 'Nguyên âm dài / ngắn', 'Long / short vowel'],
  ['hat', 'sự thù ghét', 'hatred', 'hatt', 'mũ', 'hat', 'Nguyên âm dài / ngắn', 'Long / short vowel'],
  ['søt', 'ngọt', 'sweet', 'søtt', 'ngọt (trung)', 'sweet (neuter)', 'Nguyên âm dài / ngắn', 'Long / short vowel'],
  ['tre', 'số ba', 'three', 'trær', 'những cái cây', 'trees', 'e / æ', 'e / æ'],
  ['bønder', 'nông dân', 'farmers', 'bønner', 'hạt đậu', 'beans', 'Thanh 1 / thanh 2', 'Tone 1 / tone 2'],
  ['ful', 'xấu xí', 'ugly', 'full', 'đầy', 'full', 'u dài / ngắn', 'long / short u'],
  ['by', 'thành phố', 'city', 'bu', 'chuồng', 'shed', 'y / u', 'y / u'],
  ['lys', 'ánh sáng', 'light', 'lus', 'con chấy', 'louse', 'y / u', 'y / u'],
  ['sur', 'chua', 'sour', 'syr', 'khâu', 'sews', 'u / y', 'u / y'],
  ['kjøre', 'lái xe', 'to drive', 'skjøre', 'mong manh', 'fragile', 'kj / skj', 'kj / skj'],
  ['kino', 'rạp phim', 'cinema', 'sjø', 'biển', 'sea', 'kj / sj', 'kj / sj'],
  ['tog', 'tàu hỏa', 'train', 'tak', 'mái nhà', 'roof', 'o / a', 'o / a'],
  ['mat', 'thức ăn', 'food', 'mett', 'no bụng', 'full (after eating)', 'a / e', 'a / e'],
  ['hus', 'ngôi nhà', 'house', 'hos', 'ở chỗ (ai)', 'at (someone’s place)', 'u / o', 'u / o'],
  ['dør', 'cánh cửa', 'door', 'dyr', 'con vật; đắt', 'animal; expensive', 'ø / y', 'ø / y'],
  ['rød', 'đỏ', 'red', 'rå', 'sống (chưa nấu)', 'raw', 'ø / å', 'ø / å'],
  ['vann', 'nước', 'water', 'venn', 'bạn', 'friend', 'a / e', 'a / e'],
  ['fem', 'năm', 'five', 'fine', 'đẹp (số nhiều)', 'nice (plural)', 'e / i', 'e / i'],
];

const tokens = s => s.split(/\s+/).map(w => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(Boolean);

export async function render(main, params, query) {
  const D = isEn() ? EN : VI;
  const { ALPHA, SECTIONS, SPECIAL, RULES, NAMES } = D;
  const analyze = text => {
    const out = []; const seen = new Set();
    for (const raw of tokens(text)) {
      const w = raw.toLowerCase();
      if (SPECIAL[w] && !seen.has('w:' + w)) { seen.add('w:' + w); out.push([raw, SPECIAL[w]]); continue; }
      for (const [re, label, tip] of RULES) {
        if (re.test(w) && !seen.has('r:' + label)) { seen.add('r:' + label); out.push([label, `${tip} ${t('Ví dụ trong đoạn: {w}.', { w: raw })}`]); }
      }
    }
    return out.slice(0, 12);
  };

  let tab = query.tab || 'listen';
  main.innerHTML = `<div class="page">
    <div class="page-head"><div><h1 lang="nb">Si det høyt.</h1><p>${t('Gõ bất kỳ từ, câu tiếng Na Uy để nghe; tra bảng phát âm; luyện tai với các cặp âm dễ nhầm.')}</p></div></div>
    <div class="seg" id="ptabs" style="margin-bottom:16px">
      <button data-t="listen">${t('Nghe bất kỳ')}</button><button data-t="guide">${t('Bảng phát âm')}</button><button data-t="pairs">${t('Cặp âm dễ nhầm')}</button>
    </div>
    <p class="notice" id="pnotice" hidden style="margin-bottom:14px"></p>
    <div id="pbody"></div></div>`;
  const body = $('#pbody', main);
  const paintTabs = () => $$('#ptabs button', main).forEach(b => b.setAttribute('aria-pressed', b.dataset.t === tab));
  $('#ptabs', main).onclick = e => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.t; tts.stop(); history.replaceState(null, '', `#/pron?tab=${tab}`); paintTabs(); draw(); };
  setTimeout(() => {
    const n = $('#pnotice', main); if (!n) return;
    if (!tts.supported) { n.textContent = t('Trình duyệt này không đọc được văn bản thành tiếng. Hãy dùng Chrome, Edge hoặc Safari.'); n.hidden = false; }
    else if (!tts.hasNorwegian() && tts.mode() === 'online') { n.className = 'notice info'; n.innerHTML = t('Thiết bị chưa có giọng đọc tiếng Na Uy nên app dùng giọng trực tuyến (cần mạng). Muốn đọc ngoại tuyến, hãy cài giọng Na Uy cho thiết bị:') + ' ' + t('<b>Windows:</b> Cài đặt → Thời gian và ngôn ngữ → Giọng nói → thêm “Norsk bokmål”. <b>iPhone:</b> Cài đặt → Trợ năng → Nội dung được đọc → Giọng nói → Norsk. <b>Android:</b> Cài đặt → Chuyển văn bản thành giọng nói → tải tiếng Na Uy.'); n.hidden = false; }
    else if (!tts.hasNorwegian()) { n.innerHTML = t('Chưa tìm thấy giọng đọc tiếng Na Uy trên thiết bị nên phát âm có thể sai. <b>Windows:</b> Cài đặt → Thời gian và ngôn ngữ → Giọng nói → thêm “Norsk bokmål”. <b>iPhone:</b> Cài đặt → Trợ năng → Nội dung được đọc → Giọng nói → Norsk. <b>Android:</b> Cài đặt → Chuyển văn bản thành giọng nói → tải tiếng Na Uy. Chrome trên máy tính thường có sẵn giọng Google norsk.'); n.hidden = false; }
  }, 1500);

  function draw() { ({ listen: drawListen, guide: drawGuide, pairs: drawPairs })[tab](); }

  function drawListen() {
    const st = store.s;
    st.pron = st.pron || { text: '', history: [] };
    const voices = tts.voices();
    body.innerHTML = `<div class="card pron-box">
        <label for="ptxt" class="sr">${t('Văn bản tiếng Na Uy')}</label>
        <textarea id="ptxt" lang="nb" spellcheck="false" placeholder="${t('Skriv her… ví dụ: Hyggelig å møte deg')}">${esc(st.pron.text || '')}</textarea>
        <div class="letters" style="border-top:1px solid var(--line);padding-top:10px">${['æ', 'ø', 'å', 'Æ', 'Ø', 'Å'].map(k => `<button class="key" data-k="${k}">${k}</button>`).join('')}<button class="key" id="pclear" style="margin-left:auto;font-family:var(--sans);font-size:.85rem;padding:0 12px">${t('Xóa')}</button></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        <button class="btn accent" id="pplay">${ICON.play} ${t('Nghe')}</button><button class="btn" id="pslow">${ICON.turtle} ${t('Nghe chậm')}</button>
        <button class="btn" id="pthree">${t('Nghe 3 lần')}</button><button class="btn" id="pspell">${t('Đánh vần')}</button><button class="btn" id="pstop">${t('Dừng')}</button>
      </div>
      <div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:12px;align-items:center" class="muted small">
        <label style="display:flex;gap:8px;align-items:center">${t('Tốc độ')} <input type="range" id="prate" min="0.4" max="1.2" step="0.05" value="${st.settings.rate}" style="accent-color:var(--deep)"> <span id="prv">${st.settings.rate}×</span></label>
        <label style="display:flex;gap:8px;align-items:center">${t('Giọng')} <select id="pvoice" style="width:auto;padding:5px 8px">${tts.mode() === 'online' ? `<option>${t('Giọng trực tuyến')}</option>` : voices.length ? voices.map(v => `<option ${tts.current() === v ? 'selected' : ''}>${esc(v.name)}</option>`).join('') : `<option>${t('Giọng mặc định')}</option>`}</select></label>
      </div>
      <div class="section-title"><h2>${t('Từng từ')}</h2></div><p class="muted small" style="margin:-4px 0 10px">${t('Chạm vào một từ để nghe riêng từ đó.')}</p><div class="words" id="pwords"></div>
      <div class="section-title"><h2>${t('Mẹo đọc')}</h2></div><ul class="hints" id="phints"></ul>
      <div class="section-title"><h2>${t('Đã nghe gần đây')}</h2></div><div class="chips" id="phist"></div>`;
    const ta = $('#ptxt', body);
    const refresh = () => {
      st.pron.text = ta.value; store.save(true);
      const ws = tokens(ta.value);
      $('#pwords', body).innerHTML = ws.length ? ws.map(w => `<button class="word" lang="nb" data-say="${esc(w)}">${esc(w)}</button>`).join('') : `<p class="muted small">${t('Các từ anh gõ sẽ hiện ở đây.')}</p>`;
      const h = analyze(ta.value);
      $('#phints', body).innerHTML = h.length ? h.map(([a, b]) => `<li><b lang="nb" style="font-family:var(--serif)">${esc(a)}</b>: ${esc(b)}</li>`).join('') : `<li style="border:0;background:none;padding:0" class="muted small">${ta.value.trim() ? t('Đoạn này không có quy tắc đặc biệt, đọc gần như chữ viết.') : t('Gõ một từ để xem mẹo.')}</li>`;
    };
    const hist = () => { $('#phist', body).innerHTML = st.pron.history.length ? st.pron.history.map(h => `<button class="chip" lang="nb" data-h="${esc(h)}">${esc(h)}</button>`).join('') : `<span class="muted small">${t('Chưa có.')}</span>`; };
    const remember = x => { x = x.trim(); if (!x || x.length > 120) return; st.pron.history = [x, ...st.pron.history.filter(y => y !== x)].slice(0, 12); store.save(true); hist(); };
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
        ? ALPHA.map(([Lt, name, ipa, d, ex]) => `<div class="g"><button class="sym" data-say="${esc(name)}" aria-label="${esc(Lt)}">${Lt} ${Lt.toLowerCase()}<small>${t('tên')}: ${esc(name)}</small></button><div><p>${esc(d)} <span class="tag">${esc(ipa)}</span></p>${exBtns(ex)}</div></div>`).join('')
        : s.rows.map(([sym, ipa, d, ex]) => `<div class="g"><div class="sym" lang="nb">${esc(sym)}<small>${esc(ipa)}</small></div><div><p>${esc(d)}</p>${exBtns(ex)}</div></div>`).join('');
      return `<section id="sec-${s.id}"><div class="section-title"><h2>${esc(s.title)}</h2></div><p class="muted" style="margin-bottom:10px">${esc(s.lead)}</p><div class="g-rows">${rows}</div></section>`;
    }).join('') + `<p class="muted small" style="margin-top:20px">${t('Phát âm theo chuẩn Bokmål vùng Oslo (Østlandet). Cách đọc ghi bằng tiếng Việt chỉ là gần đúng, luôn nghe giọng mẫu để chỉnh tai.')}</p>`;
    body.querySelector('nav').onclick = e => { const a = e.target.closest('[data-jump]'); if (!a) return; e.preventDefault(); $(`#sec-${a.dataset.jump}`, body).scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  }

  function drawPairs() {
    const order = shuffle(PAIRS).slice(0, 10); let pos = 0; let score = 0;
    const en = isEn();
    const show = () => {
      if (pos >= order.length) {
        store.addXp(score + 2);
        body.innerHTML = `<section class="stage"><p class="muted small">${t('Kết quả')}</p><p class="no say">${score}/${order.length}</p><p>${score >= 8 ? t('Tai rất thính!') : t('Mỗi ngày nghe một lượt, tai sẽ quen dần.')}</p><div class="ctrl"><button class="btn accent" id="again">${t('Làm lại')}</button></div></section>`;
        $('#again', body).onclick = drawPairs; return;
      }
      const p = order[pos]; const which = Math.random() < 0.5 ? 0 : 3; const word = p[which];
      body.innerHTML = `<section class="stage"><p class="muted small">${t('Câu {i}/{n}', { i: pos + 1, n: order.length })} · ${esc(en ? p[7] : p[6])}</p>
        <div class="big-listen" style="margin:16px 0"><button class="icon-btn" data-say="${esc(word)}" aria-label="${t('Nghe')}">${ICON.sound}</button><button class="icon-btn slow" data-say="${esc(word)}" data-slow aria-label="${t('Nghe chậm')}">${ICON.turtle}</button></div>
        <p class="muted" style="margin-bottom:10px">${t('Anh nghe thấy từ nào?')}</p>
        <div class="opts grid2">${[0, 3].map(i => `<button class="opt" lang="nb" data-i="${i}" style="justify-content:center;flex-direction:column;gap:2px"><span style="font-size:1.4rem">${esc(p[i])}</span><small class="muted" style="font-family:var(--sans)">${esc(en ? p[i + 2] : p[i + 1])}</small></button>`).join('')}</div>
        <div id="prv2" style="margin-top:12px"></div></section>`;
      setTimeout(() => tts.speak(word), 200);
      $$('.opt', body).forEach(b => b.onclick = () => {
        const ok = Number(b.dataset.i) === which; if (ok) score++;
        sfx(ok ? 'ok' : 'bad', store.s.settings.sfx);
        $$('.opt', body).forEach(x => { x.disabled = true; if (Number(x.dataset.i) === which) x.classList.add('right'); });
        if (!ok) b.classList.add('wrong');
        $('#prv2', body).innerHTML = `<div class="ctrl"><button class="btn small" data-say="${esc(p[0])}">${ICON.sound} ${esc(p[0])}</button><button class="btn small" data-say="${esc(p[3])}">${ICON.sound} ${esc(p[3])}</button><button class="btn primary" id="nx">${t('Tiếp')}</button></div>`;
        $('#nx', body).onclick = () => { pos++; show(); };
      });
    };
    body.innerHTML = `<section class="stage"><h2>${t('Luyện tai')}</h2><p class="muted" style="margin:8px 0 16px">${t('Nghe một từ, chọn đúng từ trong cặp gần giống nhau: dài/ngắn, u/y, ø/å, kj/skj, thanh 1/thanh 2…')}</p><button class="btn accent" id="st">${t('Bắt đầu')}</button></section>`;
    $('#st', body).onclick = show;
  }

  paintTabs(); draw();
  return () => tts.stop();
}

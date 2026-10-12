// Từ điển Na Uy ⇄ Việt: Bokmålsordboka (biến cách, nghĩa, ví dụ) + Wiktionary + từ vựng tích hợp + dịch máy.
import { $, $$, esc, ICON, api, toast, stripDia } from '../ui.js';
import { store } from '../store.js';
import { go } from '../app.js';
import { tts } from '../speech.js';
import { loadLexicon, find, searchNo, searchVi, posVi, article } from '../lexicon.js';

const G_LABEL = { m: 'en · giống đực', f: 'ei · giống cái', n: 'et · giống trung' };
const looksVi = q => /[ăâđêôơưàáảãạèéẻẽẹìíỉĩịòóỏõọùúủũụỳýỷỹỵ]/i.test(q) || q.startsWith('vi:');

export async function render(main, params, query) {
  await loadLexicon();
  const initial = params[0] || '';
  main.innerHTML = `<div class="page wide">
    <div class="page-head"><div><h1>Từ điển</h1><p>Gõ từ tiếng Na Uy (kể cả dạng chia như <i>huset, gikk</i>) hoặc tiếng Việt để tra ngược.</p></div></div>
    <div class="dict-layout">
      <div>
        <div class="search-box">
          ${ICON.search}
          <input type="search" id="dq" placeholder="vd: hus, gikk, hyggelig, cảm ơn…" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(initial)}" aria-label="Từ cần tra">
          <button class="clear" id="dclear" aria-label="Xóa">${ICON.x}</button>
          <div class="suggest" id="dsug" hidden></div>
        </div>
        <div class="letters" style="margin-top:8px">${['æ', 'ø', 'å'].map(k => `<button class="key" data-k="${k}">${k}</button>`).join('')}<span class="muted small" style="align-self:center;margin-left:6px">Mẹo: thêm “vi:” để ép tra tiếng Việt</span></div>
        <div id="dres"></div>
      </div>
      <aside style="display:flex;flex-direction:column;gap:14px">
        <section class="card tr-box">
          <h3 style="margin-bottom:8px">Dịch câu</h3>
          <div class="seg" id="trDir" style="margin-bottom:8px">
            <button data-d="nb-vi" aria-pressed="true">Na Uy → Việt</button><button data-d="vi-nb" aria-pressed="false">Việt → Na Uy</button><button data-d="en-nb" aria-pressed="false">Anh → Na Uy</button>
          </div>
          <textarea id="trIn" placeholder="Nhập câu cần dịch…"></textarea>
          <div style="display:flex;gap:8px;margin-top:8px"><button class="btn primary small" id="trGo">Dịch</button><button class="btn small" id="trSay">${ICON.sound} Nghe</button></div>
          <div class="tr-out" id="trOut" aria-live="polite"><span class="muted small">Bản dịch máy chỉ để tham khảo.</span></div>
        </section>
        <section class="card"><h3 style="margin-bottom:8px">Tra gần đây</h3><div class="chips" id="dhist"></div></section>
      </aside>
    </div></div>`;

  const inp = $('#dq', main); const sug = $('#dsug', main); const res = $('#dres', main);
  let sugTimer = null; let hl = -1; let sugItems = [];

  const paintHistory = () => {
    const h = store.s.dictHistory;
    $('#dhist', main).innerHTML = h.length ? h.map(w => `<a class="chip" href="#/dict/${encodeURIComponent(w)}" lang="nb">${esc(w)}</a>`).join('') : '<span class="muted small">Chưa có.</span>';
  };
  paintHistory();

  function hideSug() { sug.hidden = true; hl = -1; }
  async function suggest() {
    const q = inp.value.trim();
    if (!q || looksVi(q)) return hideSug();
    const local = searchNo(q, 6).map(e => ({ w: e.no, vi: e.vi, src: '' }));
    sugItems = local;
    paintSug();
    try {
      const d = await api(`/dict/suggest?q=${encodeURIComponent(q)}`);
      if (inp.value.trim() !== q) return;
      const extra = d.items.filter(w => !sugItems.some(s => s.w.toLowerCase() === w.toLowerCase())).map(w => ({ w, vi: find(w)?.vi || '', src: 'ordbok' }));
      sugItems = [...sugItems, ...extra].slice(0, 9);
      paintSug();
    } catch (e) { /* ngoại tuyến */ }
  }
  function paintSug() {
    if (!sugItems.length || document.activeElement !== inp) return hideSug();
    sug.innerHTML = sugItems.map((s, i) => `<button data-w="${esc(s.w)}" class="${i === hl ? 'hl' : ''}"><b lang="nb">${esc(s.w)}</b><span class="muted small">${esc(s.vi)}</span>${s.src ? `<span class="src">${s.src}</span>` : ''}</button>`).join('');
    sug.hidden = false;
  }
  inp.addEventListener('input', () => { clearTimeout(sugTimer); sugTimer = setTimeout(suggest, 160); });
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (sug.hidden) return; e.preventDefault();
      hl = (hl + (e.key === 'ArrowDown' ? 1 : -1) + sugItems.length) % sugItems.length; paintSug();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const w = hl >= 0 && !sug.hidden ? sugItems[hl].w : inp.value.trim();
      hideSug(); if (w) go(`dict/${encodeURIComponent(w)}`);
    } else if (e.key === 'Escape') hideSug();
  });
  inp.addEventListener('blur', () => setTimeout(hideSug, 150));
  sug.addEventListener('mousedown', e => { const b = e.target.closest('[data-w]'); if (b) { e.preventDefault(); hideSug(); go(`dict/${encodeURIComponent(b.dataset.w)}`); } });
  $('#dclear', main).onclick = () => { inp.value = ''; inp.focus(); res.innerHTML = ''; hideSug(); };
  $$('.key[data-k]', main).forEach(k => k.onclick = () => { const s = inp.selectionStart ?? inp.value.length; inp.value = inp.value.slice(0, s) + k.dataset.k + inp.value.slice(inp.selectionEnd ?? s); inp.focus(); inp.setSelectionRange(s + 1, s + 1); inp.dispatchEvent(new Event('input')); });

  // ---------- Dịch câu ----------
  let dir = 'nb-vi';
  $$('#trDir button', main).forEach(b => b.onclick = () => { dir = b.dataset.d; $$('#trDir button', main).forEach(x => x.setAttribute('aria-pressed', x === b)); });
  $('#trGo', main).onclick = async () => {
    const t = $('#trIn', main).value.trim(); if (!t) return;
    const out = $('#trOut', main); out.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    const [from, to] = dir.split('-');
    try {
      const d = await api('/translate', { body: { texts: [t], from, to } });
      out.innerHTML = `<div ${to === 'nb' ? 'lang="nb" style="font-family:var(--serif);font-size:1.1rem"' : ''}>${esc(d.texts[0] || '(không dịch được)')}</div>${to === 'nb' && d.texts[0] ? `<div style="margin-top:8px;display:flex;gap:6px"><button class="btn small" data-say="${esc(d.texts[0])}">${ICON.sound} Nghe</button></div>` : ''}<p class="muted small" style="margin-top:6px">Dịch bởi ${esc(d.provider)}</p>`;
    } catch (e) { out.innerHTML = `<span class="low">${esc(e.message)}</span>`; }
  };
  $('#trSay', main).onclick = () => { const t = $('#trIn', main).value.trim(); if (t && dir === 'nb-vi') tts.speak(t); else toast('Chỉ đọc được văn bản tiếng Na Uy'); };

  // ---------- Kết quả ----------
  if (initial) lookup(initial); else showStart();

  function showStart() {
    const recent = Object.values(store.s.cards).slice(-6).reverse();
    res.innerHTML = `<div class="card" style="margin-top:18px"><h3>Từ điển này có gì?</h3>
      <ul class="muted" style="margin:8px 0 0;padding-left:20px;line-height:1.7">
        <li><b>Bokmålsordboka</b> (Språkrådet & Đại học Bergen): đầy đủ biến cách, nghĩa và ví dụ chuẩn, kèm bản dịch máy sang tiếng Việt.</li>
        <li><b>Từ vựng tích hợp</b> hơn 2.400 từ thông dụng có nghĩa tiếng Việt soạn sẵn, tra được cả khi ngoại tuyến.</li>
        <li><b>Wiktionary</b> tiếng Anh để đối chiếu nghĩa.</li>
        <li>Lưu từ vào <b>thẻ ôn tập</b> chỉ với một chạm.</li></ul></div>
      ${recent.length ? `<div class="section-title"><h2>Thẻ mới lưu</h2></div><div class="list">${recent.map(c => `<a class="row" href="#/dict/${encodeURIComponent(c.no.replace(/^(en|ei|et|å) /, ''))}" style="text-decoration:none"><div class="grow"><div class="no" lang="nb">${esc(c.no)}</div><div class="vi">${esc(c.vi)}</div></div>${ICON.next}</a>`).join('')}</div>` : ''}`;
  }

  async function lookup(q) {
    inp.value = q;
    if (looksVi(q)) return reverse(q.replace(/^vi:\s*/, ''));
    const local = find(q);
    res.innerHTML = `<div class="entry">${local ? localHead(local) : ''}<div id="online"><p class="muted" style="margin-top:16px"><span class="typing"><i></i><i></i><i></i></span> Đang tra Bokmålsordboka…</p></div></div>`;
    wireSave();
    remember(q);
    let d;
    try { d = await api(`/dict/lookup?w=${encodeURIComponent(q)}`); } catch (e) { $('#online', res).innerHTML = `<p class="notice" style="margin-top:14px">Không tra được trực tuyến (${esc(e.message)}).${local ? '' : ' Thử tra nghĩa tiếng Việt: '}${local ? '' : `<a href="#/dict/vi:${encodeURIComponent(q)}">vi:${esc(q)}</a>`}</p>`; return; }
    const on = $('#online', res); if (!on) return;
    if (!d.articles.length && !d.en.length) {
      const vi = searchVi(q, 8);
      on.innerHTML = `<div class="card" style="margin-top:14px"><p>Không tìm thấy “<b lang="nb">${esc(q)}</b>” trong Bokmålsordboka.</p>${vi.length ? `<p class="muted small" style="margin-top:8px">Có thể anh đang tìm (theo nghĩa):</p>${viList(vi)}` : ''}</div>`;
      return;
    }
    // Ưu tiên mục trùng từ gõ, rồi mục trùng dạng gốc đoán được (huset → hus trước huse).
    const rank = a => (a.lemma.toLowerCase() === q.toLowerCase() ? 0 : local && a.lemma.toLowerCase() === local.no.toLowerCase() ? 1 : 2);
    d.articles.sort((a, b) => rank(a) - rank(b));
    on.innerHTML = d.articles.map((a, i) => articleHtml(a, i, !local && i === 0)).join('') + enHtml(d.en)
      + `<p class="src-note">Nguồn: Bokmålsordboka © Språkrådet og Universitetet i Bergen (ordbokene.no) · Wiktionary (CC BY-SA). Nghĩa tiếng Việt của định nghĩa là dịch máy, chỉ để tham khảo.</p>`;
    wireSave();
    translateDefs(on);
  }

  function localHead(e) {
    const full = e.g ? `${article(e.g)} ${e.no}` : e.pos === 'v' ? `å ${e.no}` : e.no;
    return `<div class="card"><div class="entry-head"><button class="icon-btn round" data-say="${esc(full)}" aria-label="Nghe">${ICON.sound}</button><h2 lang="nb">${esc(e.no)}</h2>
      ${e.g ? `<span class="tag g-${e.g}">${G_LABEL[e.g]}</span>` : ''}<span class="tag">${posVi(e.pos)}</span>
      <button class="btn small" style="margin-left:auto" data-save="${esc(full)}" data-vi="${esc(e.vi)}" data-pos="${e.pos}" data-g="${e.g}">${ICON.bookmark} Lưu thẻ</button></div>
      <p class="vi-main">${esc(e.vi)}</p>${e.en ? `<p class="muted small">EN: ${esc(e.en)}</p>` : ''}</div>`;
  }

  function articleHtml(a, i, showSave) {
    const g = a.genders[0] || '';
    const firstForm = a.tables[0]?.rows[0]?.[1] || a.lemma;
    const full = a.pos === 'NOUN' && g ? `${article(g)} ${a.lemma}` : a.pos === 'VERB' ? `å ${a.lemma}` : a.lemma;
    const loc = find(a.lemma);
    return `<section class="card" style="margin-top:14px">
      <div class="entry-head"><button class="icon-btn round" data-say="${esc(firstForm)}" aria-label="Nghe">${ICON.sound}</button>
        <h2 lang="nb" style="font-size:1.6rem">${esc(a.lemma)}</h2>
        ${a.genders.map(x => `<span class="tag g-${x}">${G_LABEL[x]}</span>`).join('')}${a.pos_vi ? `<span class="tag">${esc(a.pos_vi)}</span>` : ''}
        ${showSave || !loc ? `<button class="btn small" style="margin-left:auto" data-save="${esc(full)}" data-vi="${esc(loc?.vi || '')}" data-pos="${a.pos === 'NOUN' ? 'n' : a.pos === 'VERB' ? 'v' : ''}" data-g="${g}">${ICON.bookmark} Lưu thẻ</button>` : ''}
      </div>
      ${!showSave && loc && i > 0 ? '' : ''}
      ${a.tables.map(t => `<table class="infl"><tbody>${t.gender && a.tables.length > 1 ? `<tr><th colspan="2" style="color:var(--g-${t.gender})">${G_LABEL[t.gender]}</th></tr>` : ''}${t.rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td lang="nb"><button class="exs-say" data-say="${esc(v.replace(/^(å|har) /, ''))}" style="border:0;background:none;padding:0;color:var(--deep);vertical-align:-3px">${ICON.sound}</button> ${esc(v)}</td></tr>`).join('')}</tbody></table>`).join('')}
      ${a.defs.length ? `<h3 style="margin:14px 0 2px">Nghĩa</h3><ol class="defs">${a.defs.map(df => `<li>${df.text ? `<div lang="nb" class="def-no">${esc(df.text)}</div><div class="tr" data-tr="${esc(df.text)}"></div>` : ''}${df.examples.length ? `<ul class="exs">${df.examples.slice(0, 4).map(x => `<li><button data-say="${esc(x.replace(/\s*\(.*\)$/, ''))}" aria-label="Nghe">${ICON.sound}</button><span lang="nb">${esc(x)}</span></li>`).join('')}</ul>` : ''}</li>`).join('')}</ol>` : ''}
      ${a.expressions.length ? `<h3 style="margin:14px 0 6px">Thành ngữ, cụm từ</h3><div class="list">${a.expressions.map(x => `<div class="row" style="align-items:flex-start"><button class="icon-btn" data-say="${esc(x.lemma)}" aria-label="Nghe">${ICON.sound}</button><div class="grow"><div class="no" lang="nb" style="font-size:1rem">${esc(x.lemma)}</div><div class="vi" lang="nb">${esc(x.text)}</div><div class="tr small" data-tr="${esc(x.text)}" style="color:var(--deep)"></div></div></div>`).join('')}</div>` : ''}
      ${a.etymology ? `<p class="muted small" style="margin-top:10px">Từ nguyên: ${esc(a.etymology)}</p>` : ''}
      <p style="margin-top:10px"><a class="link" href="${esc(a.url)}" target="_blank" rel="noopener">Xem trên ordbokene.no ↗</a></p>
    </section>`;
  }

  function enHtml(en) {
    if (!en.length) return '';
    return `<section class="card" style="margin-top:14px"><h3 style="margin-bottom:6px">Tiếng Anh (Wiktionary)</h3>${en.map(e => `<p class="muted small" style="margin-top:6px"><b>${esc(e.pos)}</b></p><ol class="defs" style="margin-top:2px">${e.defs.map(x => `<li style="margin:4px 0">${esc(x)}</li>`).join('')}</ol>`).join('')}</section>`;
  }

  // Dịch nghĩa sang tiếng Việt theo lô (có bộ nhớ đệm trên máy chủ).
  async function translateDefs(root) {
    const els = $$('[data-tr]', root).filter(e => e.dataset.tr).slice(0, 12);
    if (!els.length) return;
    try {
      const d = await api('/translate', { body: { texts: els.map(e => e.dataset.tr), from: 'nb', to: 'vi' } });
      els.forEach((e, i) => { if (d.texts[i]) e.textContent = `→ ${d.texts[i]}`; });
    } catch (e) { /* hết hạn mức: bỏ qua */ }
  }

  function viList(list) {
    return `<div class="list vi-results" style="margin-top:8px">${list.map(e => {
      const full = e.g ? `${article(e.g)} ${e.no}` : e.pos === 'v' ? `å ${e.no}` : e.no;
      return `<div class="row" data-go="${esc(e.no)}"><button class="icon-btn" data-say="${esc(full)}" aria-label="Nghe">${ICON.sound}</button><div class="grow"><div class="no" lang="nb">${esc(full)}</div><div class="vi">${esc(e.vi)}</div></div><span class="tag">${posVi(e.pos)}</span>${ICON.next}</div>`;
    }).join('')}</div>`;
  }

  async function reverse(q) {
    remember(`vi:${q}`);
    const list = searchVi(q);
    res.innerHTML = `<div class="entry"><h2 style="margin-bottom:4px">“${esc(q)}” trong tiếng Na Uy</h2>
      ${list.length ? viList(list) : '<p class="muted">Không có trong từ vựng tích hợp.</p>'}
      <div class="card" style="margin-top:14px" id="mt"><p class="muted small">Dịch máy:</p><p id="mtOut" lang="nb" style="font-family:var(--serif);font-size:1.2rem"><span class="typing"><i></i><i></i><i></i></span></p></div></div>`;
    try {
      const d = await api('/translate', { body: { texts: [q], from: 'vi', to: 'nb' } });
      const t = d.texts[0];
      $('#mtOut', res).innerHTML = t ? `${esc(t)} <button class="icon-btn" data-say="${esc(t)}" style="vertical-align:middle" aria-label="Nghe">${ICON.sound}</button> <a class="link" href="#/dict/${encodeURIComponent(t.split(' ').length <= 2 ? t : '')}" style="font-family:var(--sans);font-size:.85rem">${t.split(' ').length <= 2 ? 'Tra từ này' : ''}</a>` : '<span class="muted small">Không có kết quả.</span>';
    } catch (e) { $('#mt', res).hidden = true; }
  }

  res.addEventListener('click', e => {
    const r = e.target.closest('[data-go]');
    if (r && !e.target.closest('[data-say]')) go(`dict/${encodeURIComponent(r.dataset.go)}`);
  });

  function wireSave() {
    $$('[data-save]', res).forEach(b => b.onclick = () => {
      let vi = b.dataset.vi;
      if (!vi) {
        const t = $('.tr', b.closest('section'))?.textContent?.replace(/^→ /, '');
        vi = prompt('Nghĩa tiếng Việt để ghi lên thẻ:', t || '') || '';
        if (!vi) return;
      }
      const ok = store.addCard({ no: b.dataset.save, vi, pos: b.dataset.pos, g: b.dataset.g }, 'dict'); store.save();
      toast(ok ? 'Đã thêm vào thẻ ôn tập' : 'Từ này đã có trong thẻ ôn tập', ok ? 'ok' : '');
    });
  }

  function remember(q) {
    const h = store.s.dictHistory.filter(x => x.toLowerCase() !== q.toLowerCase());
    h.unshift(q); store.s.dictHistory = h.slice(0, 20); store.save(true); paintHistory();
  }

  return () => { clearTimeout(sugTimer); };
}

export const _test = { looksVi, stripDia };

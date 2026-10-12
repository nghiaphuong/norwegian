import { $, $$, esc, api, ICON, toast, modal, today } from './ui.js';
import { store, BADGES } from './store.js';
import { tts } from './speech.js';
import { loadLexicon, find, posVi, article } from './lexicon.js';

export const app = { config: { db: false, ai: false }, };

const NAV = [
  { id: '', label: 'Hôm nay', icon: 'home' },
  { id: 'path', label: 'Lộ trình', icon: 'path' },
  { id: 'review', label: 'Ôn tập', icon: 'cards' },
  { id: 'dict', label: 'Từ điển', icon: 'search' },
  { id: 'phrases', label: 'Câu giao tiếp', icon: 'chat' },
  { id: 'pron', label: 'Phát âm', icon: 'lips' },
  { id: 'stories', label: 'Truyện', icon: 'story' },
  { id: 'grammar', label: 'Ngữ pháp', icon: 'grammar' },
  { id: 'tutor', label: 'Gia sư AI', icon: 'spark' },
  { id: 'me', label: 'Hồ sơ', icon: 'user' },
];
const TABS = ['', 'path', 'review', 'dict', 'more'];

const ROUTES = {
  '': () => import('./views/home.js'),
  path: () => import('./views/path.js'),
  learn: () => import('./views/learn.js'),
  review: () => import('./views/review.js'),
  dict: () => import('./views/dict.js'),
  phrases: () => import('./views/phrases.js'),
  pron: () => import('./views/pron.js'),
  stories: () => import('./views/stories.js'),
  grammar: () => import('./views/grammar.js'),
  tutor: () => import('./views/tutor.js'),
  me: () => import('./views/me.js'),
  more: () => import('./views/more.js'),
};

function parseHash() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [path, query = ''] = h.split('?');
  const parts = path.split('/').filter(Boolean);
  return { route: parts[0] || '', params: parts.slice(1), query: Object.fromEntries(new URLSearchParams(query)) };
}

export const go = path => { location.hash = `#/${path}`; };

let cleanup = null;
let renderSeq = 0;
async function router() {
  const { route, params, query } = parseHash();
  const loader = ROUTES[route] || ROUTES[''];
  const seq = ++renderSeq;
  if (typeof cleanup === 'function') { try { cleanup(); } catch (e) { /* */ } }
  cleanup = null;
  tts.stop();
  hidePop();
  const main = $('#main');
  const full = route === 'learn' || (route === 'stories' && params[0]) ;
  document.body.classList.toggle('in-player', full);
  try {
    const mod = await loader();
    if (seq !== renderSeq) return;
    main.innerHTML = '';
    main.className = `main view-${route || 'home'}`;
    cleanup = await mod.render(main, params, query);
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="page"><div class="empty-state"><p>Không tải được trang này.</p><p class="muted">${esc(e.message)}</p><button class="btn" onclick="location.reload()">Tải lại</button></div></div>`;
  }
  if (!full) window.scrollTo(0, 0);
  renderNav(route);
  renderRail(route);
}

function renderNav(route) {
  const items = NAV.filter(n => n.id !== 'tutor' || app.config.ai);
  const dueN = store.dueCards().length;
  const badge = id => (id === 'review' && dueN ? `<span class="nav-badge">${dueN > 99 ? '99+' : dueN}</span>` : '');
  $('#sideNav').innerHTML = items.map(n => `<a href="#/${n.id}" class="nav-item ${route === n.id ? 'active' : ''}" ${route === n.id ? 'aria-current="page"' : ''}>${ICON[n.icon]}<span>${n.label}</span>${badge(n.id)}</a>`).join('');
  const moreRoutes = ['phrases', 'pron', 'stories', 'grammar', 'tutor', 'me', 'more'];
  $('#tabbar').innerHTML = TABS.map(id => {
    const n = id === 'more' ? { id: 'more', label: 'Thêm', icon: 'more' } : NAV.find(x => x.id === id);
    const active = id === 'more' ? moreRoutes.includes(route) : route === id;
    return `<a href="#/${n.id}" class="tab ${active ? 'active' : ''}">${ICON[n.icon]}<span>${n.label}</span>${badge(n.id)}</a>`;
  }).join('');
  const st = store.streak();
  const xp = store.xpToday();
  const goal = store.s.settings.dailyGoal;
  const stats = `<span class="stat flame ${store.activeDay(today()) ? 'lit' : ''}" title="Chuỗi ngày học">${ICON.flame}<b>${st}</b></span><span class="stat bolt" title="XP hôm nay / mục tiêu">${ICON.bolt}<b>${xp}</b><small>/${goal}</small></span>`;
  $('#topStats').innerHTML = stats;
  $('#sideFoot').innerHTML = store.user
    ? `<a href="#/me" class="side-user">${ICON.user}<span><b>${esc(store.user.name)}</b><small>${store.lastSync ? 'Đã đồng bộ' : 'Đang đồng bộ…'}</small></span></a>`
    : app.config.db ? `<a href="#/me" class="side-user">${ICON.user}<span><b>Khách</b><small>Đăng nhập để lưu tiến độ</small></span></a>` : '';
}

async function renderRail(route) {
  const rail = $('#rail');
  if (['learn'].includes(route)) { rail.innerHTML = ''; return; }
  const st = store.streak(); const xp = store.xpToday(); const goal = store.s.settings.dailyGoal;
  const pct = Math.min(100, Math.round(xp / goal * 100));
  const due = store.dueCards().length;
  let html = `
  <section class="card rail-stats">
    <div class="rs"><span class="flame ${store.activeDay(today()) ? 'lit' : ''}">${ICON.flame}</span><div><b>${st} ngày</b><small>Chuỗi hiện tại${store.s.freezes ? ` · ❄️ ${store.s.freezes}` : ''}</small></div></div>
    <div class="rs"><span class="bolt">${ICON.bolt}</span><div><b>${store.totalXp().toLocaleString('vi-VN')} XP</b><small>Tổng cộng</small></div></div>
  </section>
  <section class="card">
    <div class="card-head"><h3>Mục tiêu hôm nay</h3><a href="#/me" class="link">Đổi</a></div>
    <div class="goal-bar"><div style="width:${pct}%"></div></div>
    <p class="muted small">${xp}/${goal} XP${pct >= 100 ? ' · Đã hoàn thành 🎉' : ''}</p>
  </section>
  ${due ? `<section class="card cta-card"><h3>${due} thẻ đến hạn ôn</h3><p class="muted small">Ôn đúng lúc giúp nhớ lâu gấp nhiều lần.</p><a class="btn primary block" href="#/review">Ôn ngay</a></section>` : ''}`;
  if (app.config.db) html += `<section class="card" id="railBoard"><div class="card-head"><h3>Bảng xếp hạng tuần</h3><a href="#/me?tab=board" class="link">Xem</a></div><p class="muted small">Đang tải…</p></section>`;
  if (!store.user && app.config.db) html += `<section class="card"><h3>Lưu tiến độ trên mọi thiết bị</h3><p class="muted small">Tạo tài khoản để đồng bộ giữa điện thoại và máy tính.</p><a class="btn block" href="#/me">Đăng nhập / Đăng ký</a></section>`;
  rail.innerHTML = html;
  if (app.config.db) {
    try {
      const d = await api('/leaderboard');
      const el = $('#railBoard'); if (!el) return;
      el.querySelector('p').outerHTML = d.rows.length
        ? `<ol class="board mini">${d.rows.slice(0, 5).map((r, i) => `<li class="${r.me ? 'me' : ''}"><span class="rank">${i + 1}</span><span class="nm">${esc(r.name)}</span><b>${r.xp} XP</b></li>`).join('')}</ol>`
        : '<p class="muted small">Chưa có ai ghi điểm tuần này. Hãy là người đầu tiên!</p>';
    } catch (e) { /* bỏ qua */ }
  }
}

// ---------- Chạm từ để xem nghĩa ----------
const pop = () => $('#pop');
function hidePop() { const p = pop(); if (p) { p.hidden = true; p.innerHTML = ''; } }
document.addEventListener('click', async e => {
  const w = e.target.closest('.tw');
  if (!w) { if (!e.target.closest('#pop')) hidePop(); return; }
  e.stopPropagation();
  await loadLexicon();
  const word = w.dataset.w;
  const hit = find(word);
  const p = pop();
  const r = w.getBoundingClientRect();
  p.innerHTML = `<div class="pop-head"><button class="icon-btn" data-say="${esc(word)}" aria-label="Nghe">${ICON.sound}</button><b lang="nb">${esc(word)}</b></div>
    ${hit ? `<p>${hit.g ? `<span class="tag g-${hit.g}">${article(hit.g)}</span> ` : ''}<span lang="nb">${esc(hit.no)}</span> <span class="muted small">${posVi(hit.pos)}</span></p><p class="pop-vi">${esc(hit.vi)}</p>` : '<p class="muted small">Chưa có trong từ vựng tích hợp.</p>'}
    <div class="pop-acts"><a class="btn small" href="#/dict/${encodeURIComponent(hit ? hit.no : word)}">Tra từ điển</a>${hit ? `<button class="btn small" id="popSave">${ICON.bookmark} Lưu thẻ</button>` : ''}</div>`;
  p.hidden = false;
  const pw = Math.min(300, window.innerWidth - 24);
  p.style.width = pw + 'px';
  p.style.left = Math.max(12, Math.min(window.innerWidth - pw - 12, r.left + r.width / 2 - pw / 2)) + 'px';
  const below = r.bottom + 8 + p.offsetHeight < window.innerHeight;
  p.style.top = (below ? r.bottom + 8 : Math.max(8, r.top - p.offsetHeight - 8)) + 'px';
  tts.speak(word);
  const sv = $('#popSave');
  if (sv) sv.onclick = () => { const ok = store.addCard({ no: hit.g ? `${article(hit.g)} ${hit.no}` : hit.pos === 'v' ? `å ${hit.no}` : hit.no, vi: hit.vi, pos: hit.pos, g: hit.g }, 'tap'); store.save(); toast(ok ? 'Đã thêm vào thẻ ôn tập' : 'Từ này đã có trong thẻ ôn tập'); hidePop(); };
});
window.addEventListener('scroll', hidePop, { passive: true });

// ---------- Huy hiệu mới ----------
export function showNewBadges() {
  const list = store.newBadges || [];
  store.newBadges = [];
  if (!list.length) return;
  modal(`<div class="badge-pop"><div class="badge-row">${list.map(id => `<div class="badge big"><span>${BADGES[id]?.[0] || '🏅'}</span><b>${esc(BADGES[id]?.[1] || id)}</b><small>${esc(BADGES[id]?.[2] || '')}</small></div>`).join('')}</div><h2>Huy hiệu mới!</h2><button class="btn primary block" data-close>Tuyệt vời</button></div>`);
}

function applyTheme() {
  const t = store.s.settings.theme;
  if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
}

store.on(() => { applyTheme(); const { route } = parseHash(); renderNav(route); });

(async function init() {
  applyTheme();
  try {
    app.config = await api('/config');
    store.user = app.config.user;
  } catch (e) { console.warn('config', e.message); }
  store.applyFreeze();
  window.addEventListener('hashchange', router);
  await router();
  if (store.user) store.pull().then(() => renderNav(parseHash().route));
  loadLexicon();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
  // Đồng bộ khi quay lại tab.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && store.user && Date.now() - store.lastSync > 60e3) store.pull(); });
})();

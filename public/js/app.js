import { $, $$, esc, api, ICON, toast, modal, today, bare } from './ui.js';
import { store, BADGES } from './store.js';
import { tts } from './speech.js';
import { loadLexicon, find, posVi, article } from './lexicon.js';
import { t, lang, setLang, mean, locale } from './i18n.js';

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
  { id: 'admin', label: 'Quản trị', icon: 'shield' },
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
  admin: () => import('./views/admin.js'),
};

function parseHash() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [path, query = ''] = h.split('?');
  const parts = path.split('/').filter(Boolean);
  return { route: parts[0] || '', params: parts.slice(1), query: Object.fromEntries(new URLSearchParams(query)) };
}

export const go = path => { location.hash = `#/${path}`; };

// Trang gần nhất ngoài chế độ làm bài, để thoát bài quay về đúng chỗ (không dùng history.back:
// bất đồng bộ trên Firefox và có thể đưa người dùng ra khỏi trang nếu họ mở thẳng link bài học).
let lastPage = '#/path';
export function leavePlayer() { location.replace(lastPage); }

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
  const full = route === 'learn' || (route === 'stories' && params[0]);
  if (!full) lastPage = location.hash || '#/';
  document.body.classList.toggle('in-player', full);
  document.body.classList.toggle('no-rail', route === 'admin');
  try {
    const mod = await loader();
    if (seq !== renderSeq) return;
    main.innerHTML = '';
    main.className = `main view-${route || 'home'}`;
    cleanup = await mod.render(main, params, query);
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="page"><div class="empty-state"><p>${t('Không tải được trang này.')}</p><p class="muted">${esc(e.message)}</p><button class="btn" onclick="location.reload()">${t('Tải lại')}</button></div></div>`;
  }
  if (!full) window.scrollTo(0, 0);
  renderNav(route);
  renderRail(route);
}

// Đổi ngôn ngữ giao diện và vẽ lại trang hiện tại.
export function switchLang(l) {
  if (l === lang()) return;
  store.s.settings.lang = l;
  setLang(l);
  store.save(true);
  router();
}
const langBtn = () => `<div class="seg lang-switch" role="group" aria-label="Language"><button data-lang="en" aria-pressed="${lang() === 'en'}">EN</button><button data-lang="vi" aria-pressed="${lang() === 'vi'}">VI</button></div>`;
document.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (b) switchLang(b.dataset.lang); });

function renderNav(route) {
  const items = NAV.filter(n => (n.id !== 'tutor' || app.config.ai) && (n.id !== 'admin' || store.user?.admin));
  const dueN = store.dueCards().length;
  const badge = id => (id === 'review' && dueN ? `<span class="nav-badge">${dueN > 99 ? '99+' : dueN}</span>` : '');
  const bt = document.querySelector('.sidebar .brand-text small'); if (bt) bt.textContent = t('học tiếng Na Uy');
  $('#sideNav').innerHTML = items.map(n => `<a href="#/${n.id}" class="nav-item ${route === n.id ? 'active' : ''}" ${route === n.id ? 'aria-current="page"' : ''}>${ICON[n.icon]}<span>${t(n.label)}</span>${badge(n.id)}</a>`).join('');
  const moreRoutes = ['phrases', 'pron', 'stories', 'grammar', 'tutor', 'me', 'more', 'admin'];
  $('#tabbar').innerHTML = TABS.map(id => {
    const n = id === 'more' ? { id: 'more', label: 'Thêm', icon: 'more' } : NAV.find(x => x.id === id);
    const active = id === 'more' ? moreRoutes.includes(route) : route === id;
    return `<a href="#/${n.id}" class="tab ${active ? 'active' : ''}">${ICON[n.icon]}<span>${t(n.label)}</span>${badge(n.id)}</a>`;
  }).join('');
  const st = store.streak();
  const xp = store.xpToday();
  const goal = store.s.settings.dailyGoal;
  $('#topStats').innerHTML = `${langBtn()}<span class="stat flame ${store.activeDay(today()) ? 'lit' : ''}" title="${t('Chuỗi ngày học')}">${ICON.flame}<b>${st}</b></span><span class="stat bolt" title="${t('XP hôm nay / mục tiêu')}">${ICON.bolt}<b>${xp}</b><small>/${goal}</small></span>`;
  $('#sideFoot').innerHTML = `<div class="side-lang">${langBtn()}</div>` + (store.user
    ? `<a href="#/me" class="side-user">${ICON.user}<span><b>${esc(store.user.name)}</b><small>${store.lastSync ? t('Đã đồng bộ') : t('Đang đồng bộ…')}</small></span></a>`
    : app.config.db ? `<a href="#/me" class="side-user">${ICON.user}<span><b>${t('Khách')}</b><small>${t('Đăng nhập để lưu tiến độ')}</small></span></a>` : '');
}

async function renderRail(route) {
  const rail = $('#rail');
  if (['learn', 'admin'].includes(route)) { rail.innerHTML = ''; return; }
  const st = store.streak(); const xp = store.xpToday(); const goal = store.s.settings.dailyGoal;
  const pct = Math.min(100, Math.round(xp / goal * 100));
  const due = store.dueCards().length;
  let html = `
  <section class="card rail-stats">
    <div class="rs"><span class="flame ${store.activeDay(today()) ? 'lit' : ''}">${ICON.flame}</span><div><b>${t('{n} ngày', { n: st })}</b><small>${t('Chuỗi hiện tại')}${store.s.freezes ? ` · ❄️ ${store.s.freezes}` : ''}</small></div></div>
    <div class="rs"><span class="bolt">${ICON.bolt}</span><div><b>${store.totalXp().toLocaleString(locale())} XP</b><small>${t('Tổng cộng')}</small></div></div>
  </section>
  <section class="card">
    <div class="card-head"><h3>${t('Mục tiêu hôm nay')}</h3><a href="#/me" class="link">${t('Đổi')}</a></div>
    <div class="goal-bar"><div style="width:${pct}%"></div></div>
    <p class="muted small">${xp}/${goal} XP${pct >= 100 ? ` · ${t('Đã hoàn thành')} 🎉` : ''}</p>
  </section>
  ${due ? `<section class="card cta-card"><h3>${t('{n} thẻ đến hạn ôn', { n: due })}</h3><p class="muted small">${t('Ôn đúng lúc giúp nhớ lâu gấp nhiều lần.')}</p><a class="btn primary block" href="#/review">${t('Ôn ngay')}</a></section>` : ''}`;
  if (app.config.db) html += `<section class="card" id="railBoard"><div class="card-head"><h3>${t('Bảng xếp hạng tuần')}</h3><a href="#/me?tab=board" class="link">${t('Xem')}</a></div><p class="muted small">${t('Đang tải…')}</p></section>`;
  if (!store.user && app.config.db) html += `<section class="card"><h3>${t('Lưu tiến độ trên mọi thiết bị')}</h3><p class="muted small">${t('Tạo tài khoản để đồng bộ giữa điện thoại và máy tính.')}</p><a class="btn block" href="#/me">${t('Đăng nhập / Đăng ký')}</a></section>`;
  rail.innerHTML = html;
  if (app.config.db) {
    try {
      const d = await api('/leaderboard');
      const el = $('#railBoard'); if (!el) return;
      el.querySelector('p').outerHTML = d.rows.length
        ? `<ol class="board mini">${d.rows.slice(0, 5).map((r, i) => `<li class="${r.me ? 'me' : ''}"><span class="rank">${i + 1}</span><span class="nm">${esc(r.name)}</span><b>${r.xp} XP</b></li>`).join('')}</ol>`
        : `<p class="muted small">${t('Chưa có ai ghi điểm tuần này. Hãy là người đầu tiên!')}</p>`;
    } catch (e) { /* bỏ qua */ }
  }
}

// ---------- Chạm từ để xem nghĩa ----------
const pop = () => $('#pop');
function hidePop() { const p = pop(); if (p && !p.hidden) { p.hidden = true; p.innerHTML = ''; } }
document.addEventListener('click', async e => {
  const w = e.target.closest('.tw');
  if (!w) { if (!e.target.closest('#pop')) hidePop(); return; }
  e.stopPropagation();
  await loadLexicon();
  const word = w.dataset.w;
  const hit = find(word);
  const p = pop();
  const r = w.getBoundingClientRect();
  p.innerHTML = `<div class="pop-head"><button class="icon-btn" data-say="${esc(word)}" aria-label="${t('Nghe')}">${ICON.sound}</button><b lang="nb">${esc(word)}</b></div>
    ${hit ? `<p>${hit.g ? `<span class="tag g-${hit.g}">${article(hit.g)}</span> ` : ''}<span lang="nb">${esc(hit.no)}</span> <span class="muted small">${posVi(hit.pos)}</span></p><p class="pop-vi">${esc(mean(hit))}</p>` : `<p class="muted small">${t('Chưa có trong từ vựng tích hợp.')}</p>`}
    <div class="pop-acts"><a class="btn small" href="#/dict/${encodeURIComponent(hit ? hit.no : word)}">${t('Tra từ điển')}</a>${hit ? `<button class="btn small" id="popSave">${ICON.bookmark} ${t('Lưu thẻ')}</button>` : ''}</div>`;
  p.hidden = false;
  const pw = Math.min(300, window.innerWidth - 24);
  p.style.width = pw + 'px';
  p.style.left = Math.max(12, Math.min(window.innerWidth - pw - 12, r.left + r.width / 2 - pw / 2)) + 'px';
  const below = r.bottom + 8 + p.offsetHeight < window.innerHeight;
  p.style.top = (below ? r.bottom + 8 : Math.max(8, r.top - p.offsetHeight - 8)) + 'px';
  tts.speak(word);
  const sv = $('#popSave');
  if (sv) sv.onclick = () => { const ok = store.addCard({ no: hit.g ? `${article(hit.g)} ${hit.no}` : hit.pos === 'v' ? `å ${hit.no}` : hit.no, vi: hit.vi, en: hit.en, pos: hit.pos, g: hit.g }, 'tap'); store.save(); toast(ok ? t('Đã thêm vào thẻ ôn tập') : t('Từ này đã có trong thẻ ôn tập')); hidePop(); };
});
window.addEventListener('scroll', hidePop, { passive: true });

// ---------- Huy hiệu mới ----------
export function showNewBadges() {
  const list = store.newBadges || [];
  store.newBadges = [];
  if (!list.length) return;
  modal(`<div class="badge-pop"><div class="badge-row">${list.map(id => `<div class="badge big"><span>${BADGES[id]?.[0] || '🏅'}</span><b>${esc(t(BADGES[id]?.[1] || id))}</b><small>${esc(t(BADGES[id]?.[2] || ''))}</small></div>`).join('')}</div><h2>${t('Huy hiệu mới!')}</h2><button class="btn primary block" data-close>${t('Tuyệt vời')}</button></div>`);
}

function applyTheme() {
  const th = store.s.settings.theme;
  if (th === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = th;
}

// Thẻ cũ chỉ có nghĩa tiếng Việt: bổ sung nghĩa tiếng Anh từ giáo trình / từ vựng tích hợp.
async function backfillCardMeanings() {
  await loadLexicon();
  let changed = false;
  for (const c of Object.values(store.s.cards)) {
    if (c.en) continue;
    const hit = find(bare(c.no));
    if (hit?.en) { c.en = hit.en; changed = true; }
  }
  try {
    const { getCourse } = await import('./course.js');
    const course = await getCourse();
    const byNo = new Map(course.flat.flatMap(l => [...l.vocab, ...l.sentences]).filter(x => x.en).map(x => [x.no, x.en]));
    for (const c of Object.values(store.s.cards)) if (!c.en && byNo.has(c.no)) { c.en = byNo.get(c.no); changed = true; }
  } catch (e) { /* */ }
  if (changed) store.save(true);
}

store.on(() => {
  applyTheme();
  if ((store.s.settings.lang || 'en') !== lang()) { setLang(store.s.settings.lang); router(); return; }
  renderNav(parseHash().route);
});

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
  backfillCardMeanings();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && store.user && Date.now() - store.lastSync > 60e3) store.pull(); });
})();

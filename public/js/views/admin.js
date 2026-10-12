// Trang quản trị: tổng quan, quản lý người dùng, thống kê từng người, cài đặt đăng ký.
import { $, $$, esc, ICON, api, toast, modal } from '../ui.js';
import { store, BADGES } from '../store.js';
import { go } from '../app.js';
import { getCourse } from '../course.js';
import { t, L, mean, locale } from '../i18n.js';

const num = n => (n === null || n === undefined ? '–' : Number(n).toLocaleString(locale()));
const day = s => (s ? new Date(String(s).replace(' ', 'T')).toLocaleDateString(locale(), { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–');
function ago(s) {
  if (!s) return t('chưa bao giờ');
  const d = (Date.now() - new Date(String(s).replace(' ', 'T')).getTime()) / 1000;
  if (d < 120) return t('vừa xong');
  if (d < 3600) return t('{n} phút trước', { n: Math.round(d / 60) });
  if (d < 86400) return t('{n} giờ trước', { n: Math.round(d / 3600) });
  return t('{n} ngày trước', { n: Math.round(d / 86400) });
}
// Hoạt động gần nhất: lấy mốc muộn nhất giữa lần mở app và ngày có XP.
const lastActive = u => [u.last_seen, u.synced_at, u.stats.lastDay].filter(Boolean).sort().slice(-1)[0] || null;

// Biểu đồ cột SVG đơn giản (tự co theo chiều rộng).
function bars(series, key, { color = 'var(--deep)', height = 120, label = x => x.day.slice(5), alt = null } = {}) {
  const max = Math.max(1, ...series.map(x => x[key]));
  const w = 100 / series.length;
  return `<svg class="achart" viewBox="0 0 100 ${height}" preserveAspectRatio="none" role="img">
    ${series.map((x, i) => { const h = (x[key] / max) * (height - 4); return `<rect x="${i * w + w * 0.15}" y="${height - h}" width="${w * 0.7}" height="${Math.max(h, x[key] ? 1 : 0)}" fill="${alt && alt(x) ? 'var(--line)' : color}" rx="0.6"><title>${esc(label(x))}: ${num(x[key])}</title></rect>`; }).join('')}
  </svg><div class="achart-axis"><span>${esc(label(series[0]))}</span><span>${esc(label(series[Math.floor(series.length / 2)]))}</span><span>${esc(label(series[series.length - 1]))}</span></div>`;
}

const tabsHtml = cur => `<div class="seg" style="margin-bottom:18px">${[['', 'Tổng quan'], ['users', 'Người dùng'], ['settings', 'Cài đặt đăng ký']].map(([k, v]) => `<a href="#/admin${k ? `/${k}` : ''}" class="${cur === k ? 'active' : ''}">${t(v)}</a>`).join('')}</div>`;

export async function render(main, params) {
  if (!store.user?.admin) {
    main.innerHTML = `<div class="page"><div class="card empty-state"><div class="big-emoji">🔒</div><h2>${t('Chỉ quản trị viên được truy cập')}</h2><a class="btn primary" href="#/">${t('Về trang chủ')}</a></div></div>`;
    return;
  }
  const sub = params[0] || '';
  main.innerHTML = `<div class="page wide"><div class="page-head"><div><h1>${t('Quản trị')}</h1><p>${t('Quản lý người dùng và theo dõi tiến độ học của từng người.')}</p></div></div>
    ${tabsHtml(sub === 'user' ? 'users' : sub)}<div id="adm"><p class="muted">${t('Đang tải…')}</p></div></div>`;
  const el = $('#adm', main);
  try {
    if (sub === 'users') await renderUsers(el);
    else if (sub === 'user') await renderUser(el, Number(params[1]));
    else if (sub === 'settings') await renderSettings(el);
    else await renderOverview(el);
  } catch (e) {
    el.innerHTML = `<div class="notice">${esc(e.message)}</div>`;
  }
}

// ---------- Tổng quan ----------
async function renderOverview(el) {
  const d = await api('/admin/overview');
  const T = d.totals;
  const box = (v, label, sub = '') => `<div class="sbox"><b>${v}</b><small>${label}${sub ? ` · ${sub}` : ''}</small></div>`;
  const regLabel = { open: t('Mở cho mọi người'), invite: t('Cần mã mời'), closed: t('Đang đóng') }[d.registration.mode];
  el.innerHTML = `
    <div class="stat-boxes">
      ${box(num(T.users), t('người dùng'), t('{n} mới trong 7 ngày', { n: T.new7 }))}
      ${box(num(T.active1), t('học hôm nay'))}
      ${box(num(T.active7), t('hoạt động 7 ngày'))}
      ${box(num(T.active30), t('hoạt động 30 ngày'))}
      ${box(num(T.xp7), t('XP 7 ngày qua'), `${t('tổng')} ${num(T.totalXp)}`)}
      ${box(num(T.lessons), t('lượt hoàn thành bài'))}
      ${box(num(T.cards), t('thẻ từ của mọi người'))}
      ${box(num(Math.round(T.minutes / 60)), t('giờ luyện tập'))}
    </div>
    <div class="admin-grid" style="margin-top:14px">
      <section class="card"><div class="card-head"><h3>${t('Người học mỗi ngày (30 ngày)')}</h3></div>${bars(d.series, 'active')}</section>
      <section class="card"><div class="card-head"><h3>${t('XP mỗi ngày (30 ngày)')}</h3></div>${bars(d.series, 'xp', { color: 'var(--bolt)' })}</section>
    </div>
    <div class="admin-grid" style="margin-top:14px">
      <section class="card"><div class="card-head"><h3>${t('Chăm nhất tuần này')}</h3><a class="link" href="#/admin/users">${t('Tất cả')}</a></div>
        ${d.top.length ? `<ol class="board">${d.top.map((u, i) => `<li><span class="rank">${i + 1}</span><a class="nm" href="#/admin/user/${u.id}">${esc(u.name)}</a><span class="muted small">🔥 ${u.streak}</span><b>${num(u.xp7)} XP</b></li>`).join('')}</ol>` : `<p class="muted small">${t('Tuần này chưa có ai học.')}</p>`}
      </section>
      <section class="card"><div class="card-head"><h3>${t('Hệ thống')}</h3></div>
        <div class="kv"><span>${t('Đăng ký')}</span><b>${regLabel}</b></div>
        <div class="kv"><span>${t('Quản trị viên')}</span><b>${T.admins}</b></div>
        <div class="kv"><span>${t('Tài khoản bị khóa')}</span><b>${T.disabled}</b></div>
        <div class="kv"><span>${t('Ngôn ngữ giao diện')}</span><b>${Object.entries(d.langs).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' · ') || '–'}</b></div>
        <div class="kv"><span>${t('Gia sư AI')}</span><b>${d.ai.enabled ? t('Bật · {n} lượt hôm nay (giới hạn {l}/người)', { n: T.aiToday, l: d.ai.dailyLimit }) : t('Chưa bật')}</b></div>
        <a class="btn small" href="#/admin/settings" style="margin-top:10px">${t('Cài đặt đăng ký')}</a>
      </section>
    </div>`;
}

// ---------- Danh sách người dùng ----------
const COLS = [
  ['name', 'Tên người dùng'], ['created_at', 'Tham gia'], ['last', 'Hoạt động'], ['streak', 'Chuỗi'], ['totalXp', 'Tổng XP'], ['xp7', 'XP 7 ngày'],
  ['lessonsDone', 'Bài học'], ['cards', 'Thẻ'], ['accuracy', 'Đúng'], ['minutes', 'Phút'],
];
const val = (u, k) => (k === 'name' ? u.name.toLowerCase() : k === 'created_at' ? u.created_at : k === 'last' ? lastActive(u) || '' : u.stats[k] ?? -1);

async function renderUsers(el) {
  const { users } = await api('/admin/users');
  let q = ''; let filter = 'all'; let sort = 'last'; let dir = -1;
  const since = n => { const d = new Date(); d.setDate(d.getDate() - (n - 1)); return d.toLocaleDateString('sv-SE'); };
  el.innerHTML = `<div class="admin-toolbar">
      <input type="search" id="uq" placeholder="${t('Tìm theo tên hoặc tên đăng nhập…')}">
      <div class="chips" id="uf">${[['all', 'Tất cả'], ['active', 'Hoạt động 7 ngày'], ['idle', 'Không hoạt động'], ['admin', 'Quản trị viên'], ['disabled', 'Bị khóa']].map(([k, v]) => `<button class="chip" data-f="${k}" aria-pressed="${k === 'all'}">${t(v)}</button>`).join('')}</div>
      <button class="btn small primary" id="uadd">${ICON.plus} ${t('Thêm người dùng')}</button>
      <a class="btn small" href="/api/admin/users.csv" download>${t('Xuất CSV')}</a>
    </div>
    <div class="card" style="padding:0;overflow:hidden"><div class="atable-wrap"><table class="atable"><thead><tr>${COLS.map(([k, v]) => `<th data-s="${k}" class="${['name', 'created_at', 'last'].includes(k) ? '' : 'num'}">${t(v)} <span class="sort"></span></th>`).join('')}<th></th></tr></thead><tbody id="ub"></tbody></table></div></div>
    <p class="muted small" id="ucount" style="margin-top:8px"></p>`;
  const paint = () => {
    const w = since(7);
    let list = users.filter(u => !q || `${u.name} ${u.username}`.toLowerCase().includes(q));
    if (filter === 'active') list = list.filter(u => u.stats.lastDay && u.stats.lastDay >= w);
    if (filter === 'idle') list = list.filter(u => !u.stats.lastDay || u.stats.lastDay < w);
    if (filter === 'admin') list = list.filter(u => u.is_admin);
    if (filter === 'disabled') list = list.filter(u => u.is_disabled);
    list.sort((a, b) => { const x = val(a, sort); const y = val(b, sort); return (x > y ? 1 : x < y ? -1 : 0) * dir; });
    $('#ub', el).innerHTML = list.map(u => `<tr data-id="${u.id}" class="${u.is_disabled ? 'off' : ''}">
      <td><div class="uname"><b>${esc(u.name)}</b>${u.is_admin ? `<span class="tag">${t('admin')}</span>` : ''}${u.is_disabled ? `<span class="tag" style="background:var(--bad-soft);color:var(--bad)">${t('bị khóa')}</span>` : ''}</div><div class="muted small">@${esc(u.username)}</div></td>
      <td data-l="${t('Tham gia')}">${day(u.created_at)}</td>
      <td data-l="${t('Hoạt động')}">${ago(lastActive(u))}</td>
      <td class="num" data-l="${t('Chuỗi')}">🔥 ${u.stats.streak}</td>
      <td class="num" data-l="${t('Tổng XP')}">${num(u.stats.totalXp)}</td>
      <td class="num" data-l="${t('XP 7 ngày')}">${num(u.stats.xp7)}</td>
      <td class="num" data-l="${t('Bài học')}">${u.stats.lessonsDone}</td>
      <td class="num" data-l="${t('Thẻ')}">${num(u.stats.cards)}</td>
      <td class="num" data-l="${t('Đúng')}">${u.stats.accuracy === null ? '–' : `${u.stats.accuracy}%`}</td>
      <td class="num" data-l="${t('Phút')}">${num(u.stats.minutes)}</td>
      <td class="row-acts"><button class="icon-btn" data-edit="${u.id}" title="${t('Sửa')}" aria-label="${t('Sửa')}">${ICON.edit}</button>${u.id === store.user.id ? '' : `<button class="icon-btn danger" data-del="${u.id}" title="${t('Xóa')}" aria-label="${t('Xóa')}">${ICON.trash}</button>`}</td></tr>`).join('') || `<tr><td colspan="11" class="muted" style="text-align:center;padding:24px">${t('Không tìm thấy.')}</td></tr>`;
    $$('th[data-s]', el).forEach(th => { th.querySelector('.sort').textContent = th.dataset.s === sort ? (dir > 0 ? '▲' : '▼') : ''; });
    $('#ucount', el).textContent = t('{n} / {total} người dùng', { n: list.length, total: users.length });
  };
  $('#uq', el).oninput = e => { q = e.target.value.trim().toLowerCase(); paint(); };
  $('#uf', el).onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; filter = b.dataset.f; $$('#uf .chip', el).forEach(x => x.setAttribute('aria-pressed', x === b)); paint(); };
  $$('th[data-s]', el).forEach(th => th.onclick = () => { if (sort === th.dataset.s) dir = -dir; else { sort = th.dataset.s; dir = th.dataset.s === 'name' ? 1 : -1; } paint(); });
  const reload = () => renderUsers(el);
  $('#uadd', el).onclick = () => userForm(null, reload);
  $('#ub', el).onclick = e => {
    const ed = e.target.closest('[data-edit]');
    if (ed) return userForm(users.find(u => u.id === Number(ed.dataset.edit)), reload);
    const del = e.target.closest('[data-del]');
    if (del) return deleteUser(users.find(u => u.id === Number(del.dataset.del)), reload);
    const tr = e.target.closest('tr[data-id]'); if (tr) go(`admin/user/${tr.dataset.id}`);
  };
  paint();
}

// ---------- Form thêm / sửa người dùng ----------
const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().trim().replace(/\s+/g, '.').replace(/[^a-z0-9_.-]/g, '').slice(0, 40);

function userForm(u, onDone) {
  const isNew = !u;
  const self = !!u && u.id === store.user.id;
  modal(`<h2>${isNew ? t('Thêm người dùng') : t('Sửa người dùng')}</h2>
    <form id="uform" style="margin-top:14px" autocomplete="off" novalidate>
      <label class="field">${t('Tên hiển thị')}<input type="text" name="name" value="${esc(u?.name || '')}" maxlength="60"></label>
      <label class="field">${t('Tên đăng nhập')}<input type="text" name="username" value="${esc(u?.username || '')}" autocapitalize="off" spellcheck="false" maxlength="40">
        <small class="muted" style="font-weight:400">${t('3–40 ký tự: chữ thường, số, dấu . _ -')}</small></label>
      <label class="field">${isNew ? t('Mật khẩu') : t('Mật khẩu mới')}<input type="text" name="password" autocomplete="new-password" spellcheck="false" placeholder="${isNew ? t('Để trống để tạo ngẫu nhiên') : t('Để trống nếu không đổi')}">
        <small class="muted" style="font-weight:400">${t('Tối thiểu 6 ký tự.')}</small></label>
      <div style="display:flex;flex-direction:column;gap:8px;margin:4px 0 16px">
        <label class="toggle"><input type="checkbox" name="is_admin" ${u?.is_admin ? 'checked' : ''} ${self ? 'disabled' : ''}> ${t('Quản trị viên')}</label>
        <label class="toggle"><input type="checkbox" name="is_disabled" ${u?.is_disabled ? 'checked' : ''} ${self ? 'disabled' : ''}> ${t('Khóa tài khoản')}</label>
      </div>
      ${self ? `<p class="muted small" style="margin-bottom:12px">${t('Đây là tài khoản của anh: không thể tự bỏ quyền quản trị hay tự khóa.')}</p>` : ''}
      <div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" class="btn" data-close>${t('Hủy')}</button><button type="submit" class="btn primary">${isNew ? t('Tạo tài khoản') : t('Lưu')}</button></div>
    </form>`, {
    onMount(card, close) {
      const form = $('#uform', card);
      const f = n => form.elements.namedItem(n);
      f('name').focus();
      // Khi tạo mới: gợi ý tên đăng nhập từ tên hiển thị (bỏ dấu tiếng Việt).
      if (isNew) f('name').addEventListener('input', () => { if (!f('username').dataset.touched) f('username').value = slug(f('name').value); });
      f('username').addEventListener('input', () => { f('username').dataset.touched = '1'; });
      form.onsubmit = async e => {
        e.preventDefault();
        const body = { name: f('name').value.trim(), username: f('username').value.trim().toLowerCase(), password: f('password').value };
        if (!body.name) return toast(t('Tên hiển thị không được trống'), 'bad');
        if (!/^[a-z0-9_.-]{3,40}$/.test(body.username)) return toast(t('3–40 ký tự: chữ thường, số, dấu . _ -'), 'bad');
        if (body.password && body.password.length < 6) return toast(t('Tối thiểu 6 ký tự.'), 'bad');
        if (!self) { body.is_admin = f('is_admin').checked; body.is_disabled = f('is_disabled').checked; }
        try {
          if (isNew) {
            const r = await api('/admin/users', { body });
            close();
            if (r.password) showPassword(body.name, r.password);
            else toast(t('Đã tạo tài khoản'), 'ok');
          } else {
            await api(`/admin/users/${u.id}`, { method: 'PUT', body });
            close(); toast(t('Đã lưu'), 'ok');
            if (self) { store.user.name = body.name; store.user.username = body.username; store.emit(); }
          }
          if (onDone) onDone();
        } catch (err) { toast(err.message, 'bad'); }
      };
    },
  });
}

function showPassword(name, pw) {
  modal(`<h2>${t('Mật khẩu mới')}</h2><p class="muted" style="margin:6px 0 12px">${t('Gửi mật khẩu này cho {n}. Nó chỉ hiển thị một lần; người dùng có thể tự đổi trong Hồ sơ.', { n: esc(name) })}</p>
    <div class="pw-box"><code id="npw">${esc(pw)}</code><button class="btn small" id="cpw">${t('Sao chép')}</button></div>`, { onMount(card) { $('#cpw', card).onclick = () => { navigator.clipboard?.writeText(pw); toast(t('Đã sao chép')); }; } });
}

async function deleteUser(u, onDone) {
  if (!u) return;
  const typed = prompt(t('Xóa vĩnh viễn tài khoản và toàn bộ dữ liệu. Gõ tên đăng nhập “{u}” để xác nhận:', { u: u.username }));
  if (typed === null) return;
  if (typed.trim() !== u.username) { toast(t('Tên đăng nhập không khớp'), 'bad'); return; }
  try { await api(`/admin/users/${u.id}`, { method: 'DELETE' }); toast(t('Đã xóa tài khoản'), 'ok'); if (onDone) onDone(); } catch (e) { toast(e.message, 'bad'); }
}

// ---------- Chi tiết một người dùng ----------
async function renderUser(el, id) {
  const [d, course] = await Promise.all([api(`/admin/users/${id}`), getCourse()]);
  const u = d.user; const S = u.stats;
  const self = u.id === store.user.id;
  const sb = (v, l) => `<div class="sbox"><b>${v}</b><small>${l}</small></div>`;
  const unitRows = course.units.map((un, ui) => {
    const ls = course.flat.filter(l => l.ui === ui && !l.checkpoint);
    const done = ls.filter(l => (d.lessons[l.id]?.n || 0) > 0).length;
    const best = ls.map(l => d.lessons[l.id]?.best).filter(x => x !== undefined);
    return `<div class="unit-row"><span class="ut">${ui + 1}. ${esc(L(un, 'title'))}</span><div class="progress"><div style="width:${Math.round(done / ls.length * 100)}%;background:${esc(un.color)}"></div></div><span class="muted small">${done}/${ls.length}${best.length ? ` · ${Math.round(best.reduce((a, b) => a + b, 0) / best.length)}%` : ''}</span></div>`;
  }).join('');
  const dist = S.strengthDist; const distTotal = Math.max(1, dist.reduce((a, b) => a + b, 0));
  const distLabels = [t('Mới'), t('Đang học'), t('Ngắn hạn'), t('Khá vững'), t('Thuộc lâu')];
  const distColors = ['var(--line)', '#E8A33D', '#C9B03A', '#6FB27A', 'var(--ok)'];

  el.innerHTML = `
    <a class="back-link" href="#/admin/users">${ICON.back} ${t('Người dùng')}</a>
    <section class="card admin-user-head">
      <div><h2 style="font-size:1.6rem">${esc(u.name)} ${u.is_admin ? `<span class="tag">${t('admin')}</span>` : ''} ${u.is_disabled ? `<span class="tag" style="background:var(--bad-soft);color:var(--bad)">${t('bị khóa')}</span>` : ''}</h2>
        <p class="muted">@${esc(u.username)} · ${t('Tham gia {d}', { d: day(u.created_at) })} · ${t('Hoạt động {a}', { a: ago(lastActive(u)) })} · ${t('Đăng nhập lần cuối {a}', { a: ago(u.last_login) })}</p>
        <p class="muted small">${t('Ngôn ngữ')}: ${S.lang.toUpperCase()} · ${t('Mục tiêu')}: ${S.dailyGoal} XP/${t('ngày')} · ${t('Đồng bộ lần cuối')}: ${ago(u.synced_at)}</p></div>
      <div class="admin-actions">
        <button class="btn small primary" data-act="edit">${ICON.edit} ${t('Sửa thông tin')}</button>
        <button class="btn small" data-act="password">${t('Đặt lại mật khẩu')}</button>
        ${self ? '' : `<button class="btn small" data-act="admin">${u.is_admin ? t('Bỏ quyền quản trị') : t('Cấp quyền quản trị')}</button>`}
        ${self ? '' : `<button class="btn small" data-act="disable">${u.is_disabled ? t('Mở khóa') : t('Khóa tài khoản')}</button>`}
        <button class="btn small" data-act="reset-progress" style="color:var(--bad)">${t('Xóa tiến độ')}</button>
        ${self ? '' : `<button class="btn small bad" data-act="delete">${t('Xóa tài khoản')}</button>`}
      </div>
    </section>

    <div class="stat-boxes" style="margin-top:14px">
      ${sb(`🔥 ${S.streak}`, t('chuỗi hiện tại · kỷ lục {n}', { n: S.bestStreak }))}
      ${sb(`⚡ ${num(S.totalXp)}`, t('tổng XP · {n} trong 7 ngày', { n: num(S.xp7) }))}
      ${sb(num(S.activeDays), t('ngày có học · từ {d}', { d: S.firstDay ? day(S.firstDay) : '–' }))}
      ${sb(num(S.minutes), t('phút luyện tập'))}
      ${sb(`${S.lessonsDone}/42`, t('bài học · {n} lượt', { n: S.lessonRuns }))}
      ${sb(num(S.cards), t('thẻ từ · {n} đến hạn', { n: S.cardsDue }))}
      ${sb(S.accuracy === null ? '–' : `${S.accuracy}%`, t('trả lời đúng ({n})', { n: num(S.answers) }))}
      ${sb(`${S.stories}/10 · ${S.grammar}/14`, t('truyện · ngữ pháp'))}
    </div>

    <section class="card" style="margin-top:14px"><div class="card-head"><h3>${t('XP mỗi ngày (60 ngày)')}</h3><span class="muted small">${t('{n} XP trong 30 ngày', { n: num(S.xp30) })}</span></div>${bars(d.series, 'xp', { color: 'var(--bolt)' })}</section>

    <div class="admin-grid" style="margin-top:14px">
      <section class="card"><div class="card-head"><h3>${t('Tiến độ theo chương')}</h3></div>${unitRows}</section>
      <section class="card"><div class="card-head"><h3>${t('Độ nhớ của thẻ từ')}</h3><span class="muted small">${t('{n} thẻ thuộc lâu', { n: S.cardsMature })}</span></div>
        <div class="dist">${dist.map((n, i) => (n ? `<span style="width:${n / distTotal * 100}%;background:${distColors[i]}" title="${distLabels[i]}: ${n}"></span>` : '')).join('')}</div>
        <div class="dist-legend">${dist.map((n, i) => `<span><i style="background:${distColors[i]}"></i>${distLabels[i]} <b>${n}</b></span>`).join('')}</div>
        <h3 style="margin:16px 0 8px">${t('Thẻ mới thêm')}</h3>
        <div class="mini-list">${d.recentCards.length ? d.recentCards.slice(0, 10).map(c => `<div><span lang="nb">${esc(c.no)}</span><span class="muted">${esc(mean(c))}</span></div>`).join('') : `<p class="muted small">${t('Chưa có.')}</p>`}</div>
      </section>
    </div>

    <div class="admin-grid" style="margin-top:14px">
      <section class="card"><div class="card-head"><h3>${t('Hay sai nhất')}</h3><span class="muted small">${S.mistakes}</span></div>
        <div class="mini-list">${d.mistakes.length ? d.mistakes.slice(0, 12).map(m => `<div><span lang="nb">${esc(m.no)}</span><span class="muted">${esc(mean(m))}</span><b class="low">×${m.n}</b></div>`).join('') : `<p class="muted small">${t('Chưa có lỗi sai nào.')}</p>`}</div>
      </section>
      <section class="card"><div class="card-head"><h3>${t('Huy hiệu')}</h3><span class="muted small">${S.badges}/${Object.keys(BADGES).length}</span></div>
        <div class="chips">${Object.entries(BADGES).filter(([k]) => d.badges[k]).map(([k, [ic, ti]]) => `<span class="chip" title="${esc(d.badges[k])}">${ic} ${esc(t(ti))}</span>`).join('') || `<p class="muted small">${t('Chưa có.')}</p>`}</div>
        <h3 style="margin:16px 0 8px">${t('Gia sư AI')}</h3>
        <p class="muted small">${t('Tổng {n} lượt · hôm nay {d}', { n: u.ai.total, d: u.ai.today })}</p>
      </section>
    </div>`;

  const act = async (action, value) => { await api(`/admin/users/${id}`, { body: { action, value } }); };
  $$('[data-act]', el).forEach(b => b.onclick = async () => {
    const a = b.dataset.act;
    try {
      if (a === 'edit') {
        userForm(u, () => renderUser(el, id)); return;
      } else if (a === 'password') {
        if (!confirm(t('Tạo mật khẩu mới cho {n}? Mật khẩu cũ sẽ không dùng được nữa.', { n: u.name }))) return;
        const r = await api(`/admin/users/${id}`, { body: { action: 'password' } });
        showPassword(u.name, r.password);
        return;
      } else if (a === 'admin') {
        await act('admin', !u.is_admin);
      } else if (a === 'disable') {
        if (!u.is_disabled && !confirm(t('Khóa tài khoản {n}? Người này sẽ bị đăng xuất và không đăng nhập được.', { n: u.name }))) return;
        await act('disable', !u.is_disabled);
      } else if (a === 'reset-progress') {
        if (!confirm(t('Xóa toàn bộ tiến độ đã đồng bộ của {n}? Không thể hoàn tác.', { n: u.name }))) return;
        await act('reset-progress'); toast(t('Đã xóa tiến độ'), 'ok');
      } else if (a === 'delete') {
        deleteUser(u, () => go('admin/users')); return;
      }
      renderUser(el, id);
    } catch (e) { toast(e.message, 'bad'); }
  });
}

// ---------- Cài đặt đăng ký ----------
async function renderSettings(el) {
  const s = await api('/admin/settings');
  const gen = () => `norsk-${Math.random().toString(36).slice(2, 8)}`;
  el.innerHTML = `<section class="card" style="max-width:640px">
    <h3>${t('Ai được tạo tài khoản?')}</h3>
    <div class="seg" id="rm" style="margin:10px 0 6px">${[['open', 'Mở cho mọi người'], ['invite', 'Cần mã mời'], ['closed', 'Đang đóng']].map(([k, v]) => `<button data-m="${k}" aria-pressed="${s.mode === k}">${t(v)}</button>`).join('')}</div>
    <p class="muted small" id="rmHint"></p>
    <label class="field" style="margin-top:16px">${t('Mã mời')}<div style="display:flex;gap:8px"><input type="text" id="ic" value="${esc(s.code)}" autocomplete="off" spellcheck="false"><button class="btn small" id="icGen">${t('Tạo mã mới')}</button></div></label>
    <p class="muted small">${s.codeSource === 'env' ? t('Mã hiện lấy từ biến môi trường INVITE_CODE. Lưu ở đây sẽ ghi đè mã đó.') : s.codeSource === 'admin' ? t('Mã do quản trị viên đặt trên trang này.') : t('Chưa có mã mời.')}</p>
    <button class="btn primary" id="rsSave" style="margin-top:12px">${t('Lưu cài đặt')}</button>
    <p class="muted small" style="margin-top:14px">${t('Người đăng ký đầu tiên của hệ thống luôn trở thành quản trị viên. Quản trị viên có thể cấp quyền cho người khác trong trang chi tiết người dùng.')}</p>
  </section>`;
  let mode = s.mode;
  const hint = () => { $('#rmHint', el).textContent = { open: t('Ai có đường dẫn cũng tự tạo được tài khoản.'), invite: t('Phải nhập đúng mã mời khi đăng ký.'), closed: t('Không ai tạo được tài khoản mới; người đã có vẫn đăng nhập bình thường.') }[mode]; };
  $('#rm', el).onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; mode = b.dataset.m; $$('#rm button', el).forEach(x => x.setAttribute('aria-pressed', x === b)); hint(); };
  $('#icGen', el).onclick = () => { $('#ic', el).value = gen(); };
  $('#rsSave', el).onclick = async () => {
    const code = $('#ic', el).value.trim();
    if (mode === 'invite' && !code) return toast(t('Cần nhập mã mời'), 'bad');
    try { await api('/admin/settings', { body: { mode, code: code === s.code && s.codeSource === 'env' ? undefined : code } }); toast(t('Đã lưu'), 'ok'); renderSettings(el); } catch (e) { toast(e.message, 'bad'); }
  };
  hint();
}


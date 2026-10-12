// API trang quản trị: tổng quan, danh sách người dùng, chi tiết, thao tác tài khoản, cài đặt đăng ký.
const express = require('express');
const crypto = require('crypto');
const config = require('../config');
const db = require('../db');
const { requireAdmin, hashPassword } = require('../auth');
const { summarize, xpSeries, today, addDays } = require('../stats');
const { tr } = require('../i18n');

const router = express.Router();
const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error('admin', req.path, e.message); res.status(500).json({ error: e.message }); });

router.use((req, res, next) => (db.enabled() ? next() : res.status(503).json({ error: tr(req, 'Máy chủ chưa kết nối cơ sở dữ liệu') })));
router.use(requireAdmin);

// ---------- Cài đặt đăng ký ----------
// registration: open | invite | closed. Mã mời: giá trị trong CSDL, nếu không có thì INVITE_CODE.
async function registration() {
  const code = (await db.getSetting('invite_code')) || config.inviteCode || '';
  const mode = (await db.getSetting('registration')) || (code ? 'invite' : 'open');
  return { mode, code, codeSource: (await db.getSetting('invite_code')) ? 'admin' : config.inviteCode ? 'env' : 'none' };
}

async function loadUsers() {
  const rows = await db.q(`SELECT u.id, u.username, u.display_name name, u.created_at, u.last_seen, u.last_login, u.is_admin, u.is_disabled,
      s.state, s.updated_at synced_at
    FROM users u LEFT JOIN user_state s ON s.user_id = u.id ORDER BY u.id`);
  const ai = await db.q("SELECT user_key, SUM(n) total, SUM(CASE WHEN day = CURDATE() THEN n ELSE 0 END) today FROM ai_usage WHERE user_key LIKE 'u%' GROUP BY user_key");
  const aiBy = Object.fromEntries(ai.map(r => [r.user_key, { total: Number(r.total), today: Number(r.today) }]));
  return rows.map(r => {
    let state = null;
    try { state = r.state ? JSON.parse(r.state) : null; } catch (e) { /* hỏng thì bỏ qua */ }
    return {
      id: r.id, username: r.username, name: r.name, created_at: r.created_at, last_seen: r.last_seen, last_login: r.last_login, synced_at: r.synced_at,
      is_admin: !!r.is_admin, is_disabled: !!r.is_disabled, ai: aiBy[`u${r.id}`] || { total: 0, today: 0 },
      stats: summarize(state), _state: state,
    };
  });
}
const pub = u => { const { _state, ...rest } = u; return rest; };

// ---------- Tổng quan ----------
router.get('/overview', wrap(async (req, res) => {
  const users = await loadUsers();
  const t = today();
  const days = []; for (let i = 29; i >= 0; i--) days.push(addDays(t, -i));
  const series = days.map(day => ({
    day,
    active: users.filter(u => (u._state?.xpByDay?.[day] || 0) > 0).length,
    xp: users.reduce((a, u) => a + (Number(u._state?.xpByDay?.[day]) || 0), 0),
    signups: users.filter(u => String(u.created_at).slice(0, 10) === day).length,
  }));
  const activeWithin = n => { const from = addDays(t, -(n - 1)); return users.filter(u => u.stats.lastDay && u.stats.lastDay >= from).length; };
  const aiToday = await db.q('SELECT COALESCE(SUM(n),0) n FROM ai_usage WHERE day = CURDATE()');
  const langs = users.reduce((a, u) => { a[u.stats.lang] = (a[u.stats.lang] || 0) + 1; return a; }, {});
  res.json({
    totals: {
      users: users.length,
      admins: users.filter(u => u.is_admin).length,
      disabled: users.filter(u => u.is_disabled).length,
      new7: users.filter(u => String(u.created_at).slice(0, 10) >= addDays(t, -6)).length,
      active1: activeWithin(1), active7: activeWithin(7), active30: activeWithin(30),
      totalXp: users.reduce((a, u) => a + u.stats.totalXp, 0),
      xp7: users.reduce((a, u) => a + u.stats.xp7, 0),
      lessons: users.reduce((a, u) => a + u.stats.lessonRuns, 0),
      cards: users.reduce((a, u) => a + u.stats.cards, 0),
      minutes: users.reduce((a, u) => a + u.stats.minutes, 0),
      aiToday: Number(aiToday[0].n),
    },
    langs,
    series,
    top: users.filter(u => u.stats.xp7 > 0).sort((a, b) => b.stats.xp7 - a.stats.xp7).slice(0, 5).map(u => ({ id: u.id, name: u.name, xp7: u.stats.xp7, streak: u.stats.streak })),
    registration: await registration(),
    ai: { enabled: !!config.anthropic.key, dailyLimit: config.anthropic.dailyLimit },
  });
}));

// ---------- Người dùng ----------
router.get('/users', wrap(async (req, res) => {
  res.json({ users: (await loadUsers()).map(pub) });
}));

router.get('/users.csv', wrap(async (req, res) => {
  const users = await loadUsers();
  const cols = ['id', 'username', 'name', 'created_at', 'last_seen', 'is_admin', 'is_disabled', 'totalXp', 'xp7', 'xp30', 'streak', 'bestStreak', 'activeDays', 'lessonsDone', 'cards', 'cardsMature', 'accuracy', 'minutes', 'stories', 'grammar', 'badges', 'lang', 'ai_total'];
  const esc = v => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = [cols.join(',')].concat(users.map(u => cols.map(c => esc(c in u.stats ? u.stats[c] : c === 'ai_total' ? u.ai.total : u[c])).join(',')));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="norsk-users-${today()}.csv"`);
  res.send('﻿' + lines.join('\n'));
}));

router.get('/users/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  const u = (await loadUsers()).find(x => x.id === id);
  if (!u) return res.status(404).json({ error: tr(req, 'Không tìm thấy người dùng') });
  const s = u._state || {};
  const ai = await db.q('SELECT day, n FROM ai_usage WHERE user_key = ? ORDER BY day DESC LIMIT 30', [`u${id}`]);
  res.json({
    user: pub(u),
    series: xpSeries(s, 60),
    lessons: s.lessons || {},
    mistakes: Object.values(s.mistakes || {}).sort((a, b) => b.n - a.n).slice(0, 20),
    recentCards: Object.values(s.cards || {}).sort((a, b) => (b.added || 0) - (a.added || 0)).slice(0, 20).map(c => ({ no: c.no, vi: c.vi, en: c.en, ivl: c.ivl, reps: c.reps, lapses: c.lapses, due: c.due })),
    stories: s.stories || {},
    grammar: s.grammar || {},
    badges: s.badges || {},
    settings: s.settings || {},
    ai,
  });
}));

const randomPassword = () => crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 10);

router.post('/users/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  const { action, value } = req.body || {};
  const r = await db.q('SELECT id, is_admin FROM users WHERE id = ?', [id]);
  if (!r[0]) return res.status(404).json({ error: tr(req, 'Không tìm thấy người dùng') });
  const self = id === req.userId;
  switch (action) {
    case 'rename': {
      const name = String(value || '').trim().slice(0, 60);
      if (!name) return res.status(400).json({ error: tr(req, 'Tên hiển thị không được trống') });
      await db.q('UPDATE users SET display_name = ? WHERE id = ?', [name, id]);
      break;
    }
    case 'admin':
      if (self && !value) return res.status(400).json({ error: tr(req, 'Không thể tự bỏ quyền quản trị của chính mình') });
      await db.q('UPDATE users SET is_admin = ? WHERE id = ?', [value ? 1 : 0, id]);
      break;
    case 'disable':
      if (self) return res.status(400).json({ error: tr(req, 'Không thể tự khóa tài khoản của chính mình') });
      await db.q('UPDATE users SET is_disabled = ? WHERE id = ?', [value ? 1 : 0, id]);
      await db.loadDisabled();
      break;
    case 'password': {
      const pw = randomPassword();
      await db.q('UPDATE users SET pass_hash = ? WHERE id = ?', [hashPassword(pw), id]);
      return res.json({ ok: true, password: pw });
    }
    case 'reset-progress':
      await db.q('DELETE FROM user_state WHERE user_id = ?', [id]);
      await db.q('DELETE FROM xp_daily WHERE user_id = ?', [id]);
      break;
    default:
      return res.status(400).json({ error: tr(req, 'Thao tác không hợp lệ') });
  }
  res.json({ ok: true });
}));

// ---------- Thêm / sửa thông tin tài khoản ----------
const USER_RE = /^[a-z0-9_.-]{3,40}$/;
async function validateAccount(req, { username, name, password }, id = null) {
  if (username !== undefined) {
    if (!USER_RE.test(username)) return tr(req, 'Tên đăng nhập 3–40 ký tự: chữ thường, số, dấu . _ -');
    const dup = await db.q('SELECT id FROM users WHERE username = ? AND id <> ?', [username, id || 0]);
    if (dup.length) return tr(req, 'Tên đăng nhập đã có người dùng');
  }
  if (name !== undefined && !name) return tr(req, 'Tên hiển thị không được trống');
  if (password && password.length < 6) return tr(req, 'Mật khẩu tối thiểu 6 ký tự');
  return null;
}
const clean = b => ({
  username: b.username === undefined ? undefined : String(b.username).trim().toLowerCase(),
  name: b.name === undefined ? undefined : String(b.name).trim().slice(0, 60),
  password: b.password ? String(b.password) : '',
});

// Tạo tài khoản mới. Không nhập mật khẩu thì tạo ngẫu nhiên và trả về một lần.
router.post('/users', wrap(async (req, res) => {
  const f = clean(req.body || {});
  if (f.name === undefined || f.name === '') f.name = f.username || '';
  const err = await validateAccount(req, { username: f.username ?? '', name: f.name, password: f.password });
  if (err) return res.status(400).json({ error: err });
  const pw = f.password || randomPassword();
  const r = await db.q('INSERT INTO users (username, display_name, pass_hash, is_admin, is_disabled) VALUES (?,?,?,?,?)',
    [f.username, f.name, hashPassword(pw), req.body.is_admin ? 1 : 0, req.body.is_disabled ? 1 : 0]);
  await db.loadDisabled();
  res.json({ ok: true, id: r.insertId, password: f.password ? null : pw });
}));

// Sửa nhiều trường cùng lúc: tên, tên đăng nhập, mật khẩu (tùy chọn), quyền quản trị, khóa.
router.put('/users/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  const cur = await db.q('SELECT id FROM users WHERE id = ?', [id]);
  if (!cur[0]) return res.status(404).json({ error: tr(req, 'Không tìm thấy người dùng') });
  const self = id === req.userId;
  const f = clean(req.body || {});
  const err = await validateAccount(req, f, id);
  if (err) return res.status(400).json({ error: err });
  if (self && req.body.is_admin === false) return res.status(400).json({ error: tr(req, 'Không thể tự bỏ quyền quản trị của chính mình') });
  if (self && req.body.is_disabled === true) return res.status(400).json({ error: tr(req, 'Không thể tự khóa tài khoản của chính mình') });
  const sets = []; const vals = [];
  if (f.username !== undefined) { sets.push('username = ?'); vals.push(f.username); }
  if (f.name !== undefined) { sets.push('display_name = ?'); vals.push(f.name); }
  if (f.password) { sets.push('pass_hash = ?'); vals.push(hashPassword(f.password)); }
  if (typeof req.body.is_admin === 'boolean') { sets.push('is_admin = ?'); vals.push(req.body.is_admin ? 1 : 0); }
  if (typeof req.body.is_disabled === 'boolean') { sets.push('is_disabled = ?'); vals.push(req.body.is_disabled ? 1 : 0); }
  if (sets.length) await db.q(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
  await db.loadDisabled();
  res.json({ ok: true });
}));

router.delete('/users/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.userId) return res.status(400).json({ error: tr(req, 'Không thể tự xóa tài khoản của chính mình') });
  await db.q("DELETE FROM ai_usage WHERE user_key = ?", [`u${id}`]);
  const r = await db.q('DELETE FROM users WHERE id = ?', [id]); // user_state, xp_daily xóa theo khóa ngoại
  if (!r.affectedRows) return res.status(404).json({ error: tr(req, 'Không tìm thấy người dùng') });
  await db.loadDisabled();
  res.json({ ok: true });
}));

// ---------- Cài đặt ----------
router.get('/settings', wrap(async (req, res) => res.json(await registration())));

router.post('/settings', wrap(async (req, res) => {
  const { mode, code } = req.body || {};
  if (mode !== undefined) {
    if (!['open', 'invite', 'closed'].includes(mode)) return res.status(400).json({ error: tr(req, 'Thao tác không hợp lệ') });
    await db.setSetting('registration', mode);
  }
  if (code !== undefined) {
    const c = String(code || '').trim();
    if (c && !/^[\w.-]{4,40}$/.test(c)) return res.status(400).json({ error: tr(req, 'Mã mời 4–40 ký tự: chữ, số, dấu . _ -') });
    await db.setSetting('invite_code', c || null);
  }
  res.json(await registration());
}));

module.exports = { router, registration };

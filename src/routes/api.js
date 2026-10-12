const express = require('express');
const config = require('../config');
const db = require('../db');
const { setSession, clearSession, hashPassword, checkPassword, requireUser } = require('../auth');
const dict = require('../dict');
const { translate, provider } = require('../translate');
const ai = require('../ai');
const { tr, langOf } = require('../i18n');

const router = express.Router();
const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error(req.path, e.message); res.status(500).json({ error: e.message }); });

// Giới hạn tần suất đơn giản theo IP (bảo vệ các dịch vụ bên ngoài).
const hits = new Map();
function rateLimit(max, windowMs) {
  return (req, res, next) => {
    const k = `${req.path}:${req.ip}`;
    const now = Date.now();
    const arr = (hits.get(k) || []).filter(t => now - t < windowMs);
    if (arr.length >= max) return res.status(429).json({ error: tr(req, 'Thao tác quá nhanh, thử lại sau ít phút') });
    arr.push(now); hits.set(k, arr);
    if (hits.size > 5000) hits.clear();
    next();
  };
}
function needDb(req, res, next) {
  if (db.enabled()) return next();
  return res.status(503).json({ error: tr(req, 'Máy chủ chưa kết nối cơ sở dữ liệu') });
}

// ---------- Thông tin chung ----------
router.get('/config', wrap(async (req, res) => {
  let user = null;
  if (req.userId && db.enabled()) {
    const r = await db.q('SELECT id, username, display_name FROM users WHERE id = ?', [req.userId]);
    if (r[0]) user = { id: r[0].id, username: r[0].username, name: r[0].display_name };
  }
  res.json({ db: db.enabled(), ai: ai.enabled(), aiScenarios: ai.SCENARIOS, invite: !!config.inviteCode, translator: provider(), user });
}));

// ---------- Tài khoản ----------
const USER_RE = /^[a-z0-9_.-]{3,40}$/;
router.post('/auth/register', needDb, rateLimit(10, 3600e3), wrap(async (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const name = String(req.body.name || '').trim().slice(0, 60) || username;
  const password = String(req.body.password || '');
  if (!USER_RE.test(username)) return res.status(400).json({ error: tr(req, 'Tên đăng nhập 3–40 ký tự: chữ thường, số, dấu . _ -') });
  if (password.length < 6) return res.status(400).json({ error: tr(req, 'Mật khẩu tối thiểu 6 ký tự') });
  if (config.inviteCode && String(req.body.invite || '').trim() !== config.inviteCode) return res.status(403).json({ error: tr(req, 'Mã mời không đúng') });
  const exist = await db.q('SELECT id FROM users WHERE username = ?', [username]);
  if (exist.length) return res.status(409).json({ error: tr(req, 'Tên đăng nhập đã có người dùng') });
  const r = await db.q('INSERT INTO users (username, display_name, pass_hash) VALUES (?,?,?)', [username, name, hashPassword(password)]);
  setSession(res, r.insertId);
  res.json({ user: { id: r.insertId, username, name } });
}));

router.post('/auth/login', needDb, rateLimit(20, 900e3), wrap(async (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const r = await db.q('SELECT id, username, display_name, pass_hash FROM users WHERE username = ?', [username]);
  if (!r[0] || !checkPassword(String(req.body.password || ''), r[0].pass_hash)) return res.status(401).json({ error: tr(req, 'Sai tên đăng nhập hoặc mật khẩu') });
  setSession(res, r[0].id);
  res.json({ user: { id: r[0].id, username: r[0].username, name: r[0].display_name } });
}));

router.post('/auth/logout', (req, res) => { clearSession(res); res.json({ ok: true }); });

router.post('/auth/password', needDb, requireUser, wrap(async (req, res) => {
  const r = await db.q('SELECT pass_hash FROM users WHERE id = ?', [req.userId]);
  if (!r[0] || !checkPassword(String(req.body.old || ''), r[0].pass_hash)) return res.status(401).json({ error: tr(req, 'Mật khẩu cũ không đúng') });
  if (String(req.body.password || '').length < 6) return res.status(400).json({ error: tr(req, 'Mật khẩu tối thiểu 6 ký tự') });
  await db.q('UPDATE users SET pass_hash = ? WHERE id = ?', [hashPassword(String(req.body.password)), req.userId]);
  res.json({ ok: true });
}));

router.post('/auth/profile', needDb, requireUser, wrap(async (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 60);
  if (!name) return res.status(400).json({ error: tr(req, 'Tên hiển thị không được trống') });
  await db.q('UPDATE users SET display_name = ? WHERE id = ?', [name, req.userId]);
  res.json({ ok: true });
}));

// ---------- Đồng bộ tiến độ ----------
router.get('/state', needDb, requireUser, wrap(async (req, res) => {
  const r = await db.q('SELECT state, updated_at FROM user_state WHERE user_id = ?', [req.userId]);
  res.json(r[0] ? { state: JSON.parse(r[0].state), updated_at: r[0].updated_at } : { state: null });
}));

router.put('/state', needDb, requireUser, express.json({ limit: '4mb' }), wrap(async (req, res) => {
  const state = req.body.state;
  if (!state || typeof state !== 'object') return res.status(400).json({ error: tr(req, 'Dữ liệu không hợp lệ') });
  const json = JSON.stringify(state);
  if (json.length > 3.5e6) return res.status(413).json({ error: tr(req, 'Dữ liệu quá lớn') });
  await db.q('INSERT INTO user_state (user_id, state) VALUES (?, ?) ON DUPLICATE KEY UPDATE state = VALUES(state)', [req.userId, json]);
  // XP theo ngày cho bảng xếp hạng (chỉ 14 ngày gần nhất).
  const days = Object.entries(state.xpByDay || {}).filter(([d]) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().slice(-14);
  for (const [day, xp] of days) {
    await db.q('INSERT INTO xp_daily (user_id, day, xp) VALUES (?,?,?) ON DUPLICATE KEY UPDATE xp = GREATEST(xp, VALUES(xp))', [req.userId, day, Math.min(100000, Math.max(0, parseInt(xp, 10) || 0))]);
  }
  res.json({ ok: true });
}));

// ---------- Bảng xếp hạng tuần ----------
router.get('/leaderboard', needDb, wrap(async (req, res) => {
  const now = new Date();
  const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const from = monday.toLocaleDateString('sv-SE');
  const rows = await db.q(
    `SELECT u.id, u.display_name name, COALESCE(SUM(x.xp),0) xp FROM users u
     LEFT JOIN xp_daily x ON x.user_id = u.id AND x.day >= ?
     GROUP BY u.id HAVING xp > 0 ORDER BY xp DESC LIMIT 30`, [from]);
  res.json({ from, rows: rows.map(r => ({ ...r, xp: Number(r.xp), me: r.id === req.userId })) });
}));

// ---------- Từ điển & dịch ----------
router.get('/dict/suggest', rateLimit(240, 60e3), wrap(async (req, res) => {
  res.json({ items: await dict.suggest(String(req.query.q || '').slice(0, 60)).catch(() => []) });
}));

router.get('/dict/lookup', rateLimit(90, 60e3), wrap(async (req, res) => {
  const w = String(req.query.w || '').trim().slice(0, 60);
  if (!w) return res.status(400).json({ error: tr(req, 'Thiếu từ cần tra') });
  res.json(await dict.lookup(w));
}));

router.post('/translate', rateLimit(60, 60e3), wrap(async (req, res) => {
  const texts = Array.isArray(req.body.texts) ? req.body.texts : [req.body.text];
  const out = await translate(texts.map(t => String(t || '').slice(0, 1000)), req.body.from || 'nb', req.body.to || 'vi');
  res.json({ texts: out, provider: provider() });
}));

// ---------- Gia sư AI (tùy chọn) ----------
async function aiQuota(req, res, next) {
  if (!ai.enabled()) return res.status(404).json({ error: tr(req, 'Chưa bật gia sư AI (thiếu ANTHROPIC_API_KEY)') });
  const key = req.userId ? `u${req.userId}` : `ip${req.ip}`;
  const day = new Date().toLocaleDateString('sv-SE');
  if (db.enabled()) {
    await db.q('INSERT INTO ai_usage (user_key, day, n) VALUES (?,?,1) ON DUPLICATE KEY UPDATE n = n + 1', [key, day]);
    const r = await db.q('SELECT n FROM ai_usage WHERE user_key = ? AND day = ?', [key, day]);
    if (r[0].n > config.anthropic.dailyLimit) return res.status(429).json({ error: tr(req, 'Đã dùng hết {n} lượt AI hôm nay', { n: config.anthropic.dailyLimit }) });
  }
  next();
}
const aiGate = (req, res, next) => aiQuota(req, res, next).catch(e => res.status(500).json({ error: e.message }));
router.post('/ai/explain', rateLimit(20, 60e3), aiGate, wrap(async (req, res) => {
  res.json(await ai.explain(String(req.body.text || '').slice(0, 500), langOf(req)));
}));
router.post('/ai/check', rateLimit(20, 60e3), aiGate, wrap(async (req, res) => {
  res.json(await ai.check(String(req.body.text || '').slice(0, 500), String(req.body.hint || '').slice(0, 300), langOf(req)));
}));
router.post('/ai/chat', rateLimit(30, 60e3), aiGate, wrap(async (req, res) => {
  res.json(await ai.chat(String(req.body.scenario || 'free'), Array.isArray(req.body.messages) ? req.body.messages : [], langOf(req)));
}));

module.exports = router;

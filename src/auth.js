const crypto = require('crypto');
const config = require('./config');
const { tr } = require('./i18n');
const db = require('./db');

const COOKIE = 'norsk_session';
const MAX_AGE = 180 * 24 * 3600 * 1000;
const sign = v => crypto.createHmac('sha256', config.sessionSecret).update(v).digest('hex');

function makeToken(userId) {
  const v = `${userId}.${Date.now() + MAX_AGE}`;
  return `${v}.${sign(v)}`;
}

function readToken(token) {
  if (!token) return null;
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  const v = `${parts[0]}.${parts[1]}`;
  const a = Buffer.from(sign(v));
  const b = Buffer.from(parts[2]);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Number(parts[1]) < Date.now()) return null;
  return Number(parts[0]);
}

function setSession(res, userId) {
  res.cookie(COOKIE, makeToken(userId), { httpOnly: true, sameSite: 'lax', secure: 'auto', maxAge: MAX_AGE });
}
function clearSession(res) { res.clearCookie(COOKIE); }

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
function checkPassword(pw, stored) {
  const [, salt, hash] = String(stored).split('$');
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, 'hex');
  const b = crypto.scryptSync(pw, salt, 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Ghi nhận lần cuối hoạt động (tối đa mỗi 5 phút một lần cho mỗi người).
const seen = new Map();
function touch(id) {
  const now = Date.now();
  if (now - (seen.get(id) || 0) < 5 * 60e3) return;
  seen.set(id, now);
  db.q('UPDATE users SET last_seen = NOW() WHERE id = ?', [id]).catch(() => {});
}

function attachUser(req, res, next) {
  const id = readToken(req.cookies[COOKIE]);
  req.userId = id && !db.isDisabled(id) ? id : null;
  if (req.userId && db.enabled()) touch(req.userId);
  next();
}
function requireUser(req, res, next) {
  if (req.userId) return next();
  return res.status(401).json({ error: tr(req, 'Cần đăng nhập') });
}

// Chỉ quản trị viên (kiểm tra trực tiếp trong CSDL mỗi lần gọi).
async function requireAdmin(req, res, next) {
  try {
    if (!req.userId || !db.enabled()) return res.status(401).json({ error: tr(req, 'Cần đăng nhập') });
    const r = await db.q('SELECT is_admin FROM users WHERE id = ?', [req.userId]);
    if (!r[0] || !r[0].is_admin) return res.status(403).json({ error: tr(req, 'Chỉ quản trị viên được truy cập') });
    next();
  } catch (e) { res.status(500).json({ error: e.message }); }
}

module.exports = { requireAdmin, setSession, clearSession, hashPassword, checkPassword, attachUser, requireUser };

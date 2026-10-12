const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('./config');

let pool = null;
let ready = false;

function enabled() { return ready; }

async function q(sql, params = []) {
  if (!pool) throw new Error('Chưa cấu hình cơ sở dữ liệu');
  const [rows] = await pool.query(sql, params);
  return rows;
}

// Nâng cấp bảng đã tạo từ phiên bản cũ (chỉ thêm cột còn thiếu).
async function upgradeSchema() {
  const cols = new Set((await q("SELECT COLUMN_NAME c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'")).map(r => r.c));
  if (!cols.has('is_admin')) await q('ALTER TABLE users ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0');
  if (!cols.has('is_disabled')) await q('ALTER TABLE users ADD COLUMN is_disabled TINYINT(1) NOT NULL DEFAULT 0');
  if (!cols.has('last_seen')) await q('ALTER TABLE users ADD COLUMN last_seen DATETIME NULL');
  if (!cols.has('last_login')) await q('ALTER TABLE users ADD COLUMN last_login DATETIME NULL');
  // Luôn có ít nhất một quản trị viên: người đăng ký sớm nhất.
  const admins = await q('SELECT COUNT(*) n FROM users WHERE is_admin = 1');
  if (!admins[0].n) await q('UPDATE users SET is_admin = 1 ORDER BY id LIMIT 1');
}

async function migrate() {
  if (!config.db.database) {
    console.log('DB_NAME trống: chạy không có cơ sở dữ liệu (tiến độ chỉ lưu trên trình duyệt)');
    return false;
  }
  pool = mysql.createPool({
    ...config.db,
    waitForConnections: true,
    connectionLimit: 6,
    charset: 'utf8mb4',
    timezone: 'local',
    dateStrings: true,
  });
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  for (const stmt of sql.split(/;\s*\n/).map(s => s.trim()).filter(Boolean)) {
    await pool.query(stmt);
  }
  await upgradeSchema();
  ready = true;
  await loadDisabled();
  return true;
}

// Tài khoản bị khóa: giữ trong bộ nhớ để kiểm tra mỗi yêu cầu mà không tốn truy vấn.
const disabled = new Set();
async function loadDisabled() {
  disabled.clear();
  (await q('SELECT id FROM users WHERE is_disabled = 1')).forEach(r => disabled.add(r.id));
}
const isDisabled = id => disabled.has(Number(id));

// Cài đặt ứng dụng do quản trị viên chỉnh (ưu tiên hơn biến môi trường).
async function getSetting(k, def = null) {
  if (!ready) return def;
  const r = await q('SELECT v FROM app_settings WHERE k = ?', [k]);
  return r[0] ? r[0].v : def;
}
async function setSetting(k, v) {
  if (v === null || v === undefined) await q('DELETE FROM app_settings WHERE k = ?', [k]);
  else await q('REPLACE INTO app_settings (k, v) VALUES (?, ?)', [k, String(v)]);
}

// Bộ nhớ đệm khóa–giá trị (từ điển, bản dịch). Không có CSDL thì dùng bộ nhớ tiến trình.
const mem = new Map();
async function cacheGet(k) {
  if (ready) {
    try {
      const r = await q('SELECT v FROM cache WHERE k = ?', [k]);
      return r[0] ? JSON.parse(r[0].v) : null;
    } catch (e) { return null; }
  }
  return mem.has(k) ? mem.get(k) : null;
}
async function cacheSet(k, v) {
  if (ready) {
    try { await q('REPLACE INTO cache (k, v) VALUES (?, ?)', [k, JSON.stringify(v)]); } catch (e) { /* bỏ qua */ }
    return;
  }
  if (mem.size > 3000) mem.delete(mem.keys().next().value);
  mem.set(k, v);
}

module.exports = { q, migrate, enabled, cacheGet, cacheSet, loadDisabled, isDisabled, getSetting, setSetting };

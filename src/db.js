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
  ready = true;
  return true;
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

module.exports = { q, migrate, enabled, cacheGet, cacheSet };

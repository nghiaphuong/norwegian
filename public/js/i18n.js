// Song ngữ giao diện: khóa là câu tiếng Việt, bảng EN nằm ở lang/en.js. Mặc định tiếng Anh.
import EN from './lang/en.js';

const KEY = 'norsk-state-v1';
let current = 'en';
try { current = JSON.parse(localStorage.getItem(KEY) || '{}').settings?.lang || 'en'; } catch (e) { /* */ }

export const lang = () => current;
export const isEn = () => current === 'en';
export function setLang(l) {
  current = l === 'vi' ? 'vi' : 'en';
  document.documentElement.lang = current;
  document.title = current === 'en' ? 'Norsk – Learn Norwegian' : 'Norsk – Học tiếng Na Uy';
}
setLang(current);

const missing = new Set();
// t('Đã thuộc {n} câu', { n: 5 })
export function t(key, vars) {
  let s = key;
  if (current === 'en') {
    // Giá trị dạng [số ít, số nhiều] chọn theo vars.n.
    if (EN[key] !== undefined) s = Array.isArray(EN[key]) ? EN[key][Number(vars?.n) === 1 ? 0 : 1] : EN[key];
    else if (!missing.has(key)) { missing.add(key); if (location.hostname === 'localhost') console.warn('[i18n] thiếu EN:', key); }
  }
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  return s;
}
export const missingKeys = () => [...missing];

// Trường nội dung theo ngôn ngữ: L(unit, 'title') → title_en khi giao diện tiếng Anh.
export const L = (obj, field) => (obj ? (current === 'en' ? (obj[`${field}_en`] ?? obj[field]) : obj[field]) : '');
// Nghĩa của một từ/câu (vi hoặc en).
export const mean = it => (it ? (current === 'en' ? (it.en || it.vi || '') : (it.vi || it.en || '')) : '');
// Ngôn ngữ dịch máy đích.
export const target = () => (current === 'en' ? 'en' : 'vi');
export const locale = () => (current === 'en' ? 'en-GB' : 'vi-VN');

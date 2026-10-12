// Từ vựng tích hợp (glossary + từ trong giáo trình) để tra nhanh offline và tra ngược Việt → Na Uy.
import { loadData, stripDia, bare } from './ui.js';

let ready = null;
const byLemma = new Map();
let entries = [];

const POS_VI = { n: 'danh từ', v: 'động từ', adj: 'tính từ', adv: 'trạng từ', pron: 'đại từ', prep: 'giới từ', conj: 'liên từ', num: 'số từ', interj: 'thán từ', det: 'từ hạn định', phrase: 'cụm từ' };
export const posVi = p => POS_VI[p] || '';
export const article = g => ({ m: 'en', f: 'ei', n: 'et' }[g] || '');

function add(e) {
  const k = e.no.toLowerCase();
  if (!byLemma.has(k)) { byLemma.set(k, e); entries.push(e); }
  else if (!byLemma.get(k).vi && e.vi) Object.assign(byLemma.get(k), e);
}

export function loadLexicon() {
  if (!ready) {
    ready = Promise.all([loadData('glossary').catch(() => []), loadData('course').catch(() => ({ units: [] }))]).then(([g, c]) => {
      for (const r of g) add({ no: r[0], pos: r[1], g: r[2], vi: r[3], en: r[4] });
      for (const u of c.units || []) for (const l of u.lessons || []) for (const v of l.vocab || []) add({ no: bare(v.no), pos: v.pos, g: v.g || '', vi: v.vi, en: '' });
      entries.forEach(e => { e._vi = stripDia(e.vi).toLowerCase(); });
      return true;
    });
  }
  return ready;
}

// Đoán dạng gốc từ dạng biến cách đơn giản (huset → hus, gikk vẫn cần từ điển online).
const SUFFIXES = ['ene', 'ane', 'en', 'et', 'a', 'er', 'r', 'te', 'de', 'et', 't', 'e', 's', 'ere', 'est', 'este'];
export function find(word) {
  const w = String(word || '').toLowerCase().trim();
  if (!w) return null;
  if (byLemma.has(w)) return byLemma.get(w);
  for (const s of SUFFIXES) {
    if (w.length > s.length + 1 && w.endsWith(s)) {
      const base = w.slice(0, -s.length);
      if (byLemma.has(base)) return byLemma.get(base);
      if (byLemma.has(base + 'e')) return byLemma.get(base + 'e');
      if (/(.)\1$/.test(base) && byLemma.has(base.slice(0, -1))) return byLemma.get(base.slice(0, -1));
    }
  }
  return null;
}

export function searchNo(q, n = 8) {
  const w = q.toLowerCase().trim();
  if (!w) return [];
  return entries.filter(e => e.no.toLowerCase().startsWith(w)).sort((a, b) => a.no.length - b.no.length).slice(0, n);
}

// Tra ngược: tìm theo nghĩa tiếng Việt (không phân biệt dấu) hoặc tiếng Anh.
export function searchVi(q, n = 30) {
  const raw = q.toLowerCase().trim();
  const w = stripDia(raw);
  if (!w) return [];
  const re = new RegExp(`(^|[ ,;(])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[ ,;)])`);
  const scored = [];
  for (const e of entries) {
    let s = 0;
    const exactVi = e.vi.toLowerCase().split(/[,;]\s*/).some(x => x.trim() === raw);
    if (exactVi) s = 100;
    else if (re.test(e._vi)) s = 60 - Math.min(30, e.vi.length / 2);
    else if (e._vi.includes(w)) s = 25 - Math.min(20, e.vi.length / 3);
    else if (e.en && e.en.toLowerCase().split(/[,;]\s*/).some(x => x.replace(/^to /, '') === raw)) s = 40;
    if (s) scored.push([s, e]);
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, n).map(x => x[1]);
}

export const lexiconSize = () => entries.length;
export const allEntries = () => entries;

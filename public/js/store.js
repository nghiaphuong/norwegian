// Trạng thái học tập: lưu trên trình duyệt, đồng bộ lên máy chủ khi đã đăng nhập.
import { today, addDays, api, bare } from './ui.js';

const KEY = 'norsk-state-v1';
const DAY = 864e5;

function fresh() {
  return {
    v: 1,
    updatedAt: 0,
    settings: { dailyGoal: 30, rate: 0.9, voice: '', theme: 'auto', sfx: true, autoplay: true, unlockAll: false, showRail: true },
    xpByDay: {},          // { 'YYYY-MM-DD': xp }
    frozen: [],           // các ngày được "đóng băng chuỗi"
    freezes: 1,           // số lượt đóng băng còn lại (tối đa 2)
    lessons: {},          // { u1l1: { n: số lần hoàn thành, best: % đúng, at } }
    cards: {},            // thẻ ôn tập ngắt quãng { id: {...} }
    mistakes: {},         // { câu/từ no: { no, vi, n, at } }
    phrases: [],          // id câu giao tiếp đã thuộc
    stories: {},          // { s1: { score, at } }
    grammar: {},          // { g1: { score, at } }
    dictHistory: [],
    pron: { text: '', history: [] },
    stats: { answers: 0, correct: 0, seconds: 0, words: 0 },
    badges: {},           // { id: ngày đạt }
  };
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && s.v === 1) {
      const f = fresh();
      return { ...f, ...s, settings: { ...f.settings, ...s.settings }, stats: { ...f.stats, ...s.stats } };
    }
  } catch (e) { /* bỏ qua */ }
  return fresh();
}

// Gộp hai trạng thái (máy này và máy chủ) mà không mất tiến độ.
function merge(a, b) {
  if (!b) return a;
  if (!a) return b;
  const newer = (a.updatedAt || 0) >= (b.updatedAt || 0) ? a : b;
  const out = { ...fresh(), ...newer };
  out.xpByDay = { ...a.xpByDay };
  for (const [d, x] of Object.entries(b.xpByDay || {})) out.xpByDay[d] = Math.max(out.xpByDay[d] || 0, x);
  out.frozen = [...new Set([...(a.frozen || []), ...(b.frozen || [])])];
  out.phrases = [...new Set([...(a.phrases || []), ...(b.phrases || [])])];
  const byTime = (x, y, field = 'at') => {
    const o = { ...x };
    for (const [k, v] of Object.entries(y || {})) if (!o[k] || (v[field] || 0) > (o[k][field] || 0)) o[k] = v;
    return o;
  };
  out.lessons = byTime(a.lessons, b.lessons);
  for (const k of Object.keys(out.lessons)) out.lessons[k] = { ...out.lessons[k], n: Math.max(a.lessons?.[k]?.n || 0, b.lessons?.[k]?.n || 0) };
  out.cards = byTime(a.cards, b.cards, 'upd');
  out.mistakes = byTime(a.mistakes, b.mistakes);
  out.stories = byTime(a.stories, b.stories);
  out.grammar = byTime(a.grammar, b.grammar);
  out.badges = { ...b.badges, ...a.badges };
  out.dictHistory = [...new Set([...(newer.dictHistory || []), ...((newer === a ? b : a).dictHistory || [])])].slice(0, 30);
  out.stats = {};
  for (const k of Object.keys(fresh().stats)) out.stats[k] = Math.max(a.stats?.[k] || 0, b.stats?.[k] || 0);
  out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
  return out;
}

const listeners = new Set();
let syncTimer = null;

export const store = {
  s: load(),
  user: null,
  syncing: false,
  lastSync: 0,
  on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  emit() { listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); },
  save(quiet = false) {
    this.s.updatedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch (e) { /* bộ nhớ đầy */ }
    if (!quiet) this.emit();
    if (this.user) { clearTimeout(syncTimer); syncTimer = setTimeout(() => this.push(), 2500); }
  },
  async pull() {
    if (!this.user) return;
    try {
      const d = await api('/state');
      this.s = merge(this.s, d.state);
      localStorage.setItem(KEY, JSON.stringify(this.s));
      this.lastSync = Date.now();
      this.emit();
      await this.push();
    } catch (e) { console.warn('pull', e.message); }
  },
  async push() {
    if (!this.user) return;
    try { await api('/state', { method: 'PUT', body: { state: this.s } }); this.lastSync = Date.now(); } catch (e) { console.warn('push', e.message); }
  },
  reset() { this.s = fresh(); this.save(); },
  replace(s) { this.s = merge(fresh(), s); this.save(); },

  // ---------- XP & chuỗi ngày ----------
  xpToday() { return this.s.xpByDay[today()] || 0; },
  addXp(n) {
    const d = today();
    this.s.xpByDay[d] = (this.s.xpByDay[d] || 0) + n;
    const st = this.streak();
    if (st > 0 && st % 7 === 0 && !this.s.badges[`freeze-${st}`]) { this.s.badges[`freeze-${st}`] = d; this.s.freezes = Math.min(2, (this.s.freezes || 0) + 1); }
    this.checkBadges();
    this.save();
  },
  activeDay(d) { return (this.s.xpByDay[d] || 0) > 0 || this.s.frozen.includes(d); },
  streak() {
    let d = today();
    if (!this.activeDay(d)) d = addDays(d, -1);
    let n = 0;
    while (this.activeDay(d)) { n++; d = addDays(d, -1); }
    return n;
  },
  bestStreak() {
    const days = [...new Set([...Object.keys(this.s.xpByDay).filter(d => this.s.xpByDay[d] > 0), ...this.s.frozen])].sort();
    let best = 0; let cur = 0; let prev = null;
    for (const d of days) { cur = prev && addDays(prev, 1) === d ? cur + 1 : 1; best = Math.max(best, cur); prev = d; }
    return best;
  },
  // Tự dùng lượt đóng băng nếu hôm qua quên học mà hôm kia có học.
  applyFreeze() {
    const y = addDays(today(), -1);
    if (!this.activeDay(y) && this.activeDay(addDays(y, -1)) && this.s.freezes > 0) {
      this.s.frozen.push(y); this.s.freezes--; this.save(true);
      return true;
    }
    return false;
  },
  totalXp() { return Object.values(this.s.xpByDay).reduce((a, b) => a + b, 0); },
  weekXp() {
    const d = new Date(); const monday = new Date(d); monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const from = today(monday);
    return Object.entries(this.s.xpByDay).filter(([k]) => k >= from).reduce((a, [, v]) => a + v, 0);
  },

  // ---------- Thẻ ôn tập ngắt quãng (SM-2 rút gọn) ----------
  cardId: no => bare(no).toLowerCase(),
  addCard(item, src = '') {
    const id = this.cardId(item.no);
    if (!id || this.s.cards[id]) return false;
    this.s.cards[id] = { no: item.no, vi: item.vi || '', pos: item.pos || '', g: item.g || '', src, due: Date.now(), ivl: 0, ease: 2.5, reps: 0, lapses: 0, added: Date.now(), upd: Date.now() };
    this.s.stats.words = Object.keys(this.s.cards).length;
    return true;
  },
  removeCard(id) { delete this.s.cards[id]; this.s.stats.words = Object.keys(this.s.cards).length; this.save(); },
  dueCards() { const now = Date.now(); return Object.entries(this.s.cards).filter(([, c]) => c.due <= now).map(([id, c]) => ({ id, ...c })).sort((a, b) => a.due - b.due); },
  // grade: 0 quên, 1 khó, 2 được, 3 dễ
  gradeCard(id, grade) {
    const c = this.s.cards[id]; if (!c) return;
    if (grade === 0) { c.lapses++; c.reps = 0; c.ivl = 0; c.ease = Math.max(1.3, c.ease - 0.2); c.due = Date.now() + 10 * 60e3; }
    else {
      c.reps++;
      if (c.reps === 1) c.ivl = grade === 3 ? 3 : 1;
      else if (c.reps === 2) c.ivl = grade === 1 ? 2 : grade === 3 ? 7 : 4;
      else c.ivl = Math.round(c.ivl * (grade === 1 ? 1.2 : grade === 3 ? c.ease * 1.3 : c.ease));
      c.ease = Math.max(1.3, c.ease + (grade === 1 ? -0.15 : grade === 3 ? 0.15 : 0));
      c.due = Date.now() + c.ivl * DAY;
    }
    c.upd = Date.now();
  },
  strength(c) { return c.reps === 0 ? 0 : c.ivl >= 21 ? 4 : c.ivl >= 7 ? 3 : c.ivl >= 3 ? 2 : 1; },

  // ---------- Lỗi sai ----------
  addMistake(item) {
    const k = item.no;
    const m = this.s.mistakes[k] || { no: item.no, vi: item.vi, n: 0 };
    m.n++; m.at = Date.now();
    this.s.mistakes[k] = m;
  },
  clearMistake(no) { delete this.s.mistakes[no]; },
  answer(ok) { this.s.stats.answers++; if (ok) this.s.stats.correct++; },

  // ---------- Huy hiệu ----------
  checkBadges() {
    const s = this.s; const d = today(); const got = [];
    const give = (id, cond) => { if (cond && !s.badges[id]) { s.badges[id] = d; got.push(id); } };
    const lessonsDone = Object.values(s.lessons).filter(l => l.n > 0).length;
    const st = this.streak(); const xp = this.totalXp(); const words = Object.keys(s.cards).length;
    give('first-lesson', lessonsDone >= 1); give('lessons-10', lessonsDone >= 10); give('lessons-30', lessonsDone >= 30);
    give('streak-3', st >= 3); give('streak-7', st >= 7); give('streak-30', st >= 30); give('streak-100', st >= 100);
    give('xp-500', xp >= 500); give('xp-2000', xp >= 2000); give('xp-10000', xp >= 10000);
    give('words-50', words >= 50); give('words-200', words >= 200); give('words-500', words >= 500);
    give('story-1', Object.keys(s.stories).length >= 1); give('story-all', Object.keys(s.stories).length >= 10);
    give('grammar-5', Object.keys(s.grammar).length >= 5);
    if (got.length) this.newBadges = (this.newBadges || []).concat(got);
    return got;
  },
};

export const BADGES = {
  'first-lesson': ['🌱', 'Khởi đầu', 'Hoàn thành bài học đầu tiên'],
  'lessons-10': ['📗', 'Chăm chỉ', 'Hoàn thành 10 bài học'],
  'lessons-30': ['📚', 'Học giả', 'Hoàn thành 30 bài học'],
  'streak-3': ['🔥', 'Bén lửa', 'Chuỗi 3 ngày'],
  'streak-7': ['🔥', 'Một tuần', 'Chuỗi 7 ngày'],
  'streak-30': ['🏔️', 'Bền bỉ', 'Chuỗi 30 ngày'],
  'streak-100': ['👑', 'Huyền thoại', 'Chuỗi 100 ngày'],
  'xp-500': ['⚡', '500 XP', 'Đạt 500 XP'],
  'xp-2000': ['⚡', '2.000 XP', 'Đạt 2.000 XP'],
  'xp-10000': ['🌟', '10.000 XP', 'Đạt 10.000 XP'],
  'words-50': ['🃏', '50 từ', 'Có 50 thẻ từ'],
  'words-200': ['🗂️', '200 từ', 'Có 200 thẻ từ'],
  'words-500': ['🧠', '500 từ', 'Có 500 thẻ từ'],
  'story-1': ['📖', 'Người kể chuyện', 'Đọc xong một truyện'],
  'story-all': ['🏆', 'Mọt truyện', 'Đọc xong 10 truyện'],
  'grammar-5': ['🧩', 'Ngữ pháp', 'Hoàn thành 5 bài ngữ pháp'],
};

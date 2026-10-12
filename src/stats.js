// Tính chỉ số học tập từ trạng thái tiến độ (JSON) mà trình duyệt đồng bộ lên.
const DAY = 864e5;
const fmt = d => d.toLocaleDateString('sv-SE');
const today = () => fmt(new Date());
const addDays = (s, n) => { const d = new Date(`${s}T12:00:00`); d.setDate(d.getDate() + n); return fmt(d); };

function strength(c) { return !c.reps ? 0 : c.ivl >= 21 ? 4 : c.ivl >= 7 ? 3 : c.ivl >= 3 ? 2 : 1; }

function summarize(state) {
  const s = state || {};
  const xpByDay = s.xpByDay || {};
  const frozen = new Set(s.frozen || []);
  const active = d => (xpByDay[d] || 0) > 0 || frozen.has(d);
  const t = today();

  let d = active(t) ? t : addDays(t, -1);
  let streak = 0;
  while (active(d)) { streak++; d = addDays(d, -1); }

  const days = [...new Set([...Object.keys(xpByDay).filter(k => xpByDay[k] > 0), ...frozen])].sort();
  let best = 0; let cur = 0; let prev = null;
  for (const k of days) { cur = prev && addDays(prev, 1) === k ? cur + 1 : 1; best = Math.max(best, cur); prev = k; }

  const sumSince = n => { const from = addDays(t, -(n - 1)); return Object.entries(xpByDay).filter(([k]) => k >= from).reduce((a, [, v]) => a + (Number(v) || 0), 0); };
  const cards = Object.values(s.cards || {});
  const now = Date.now();
  const strengthDist = [0, 0, 0, 0, 0];
  cards.forEach(c => { strengthDist[strength(c)]++; });
  const stats = s.stats || {};
  const activeDays = Object.keys(xpByDay).filter(k => xpByDay[k] > 0);

  return {
    totalXp: Object.values(xpByDay).reduce((a, b) => a + (Number(b) || 0), 0),
    xpToday: xpByDay[t] || 0,
    xp7: sumSince(7),
    xp30: sumSince(30),
    streak,
    bestStreak: best,
    activeDays: activeDays.length,
    firstDay: activeDays.sort()[0] || null,
    lastDay: activeDays.sort().slice(-1)[0] || null,
    lessonsDone: Object.values(s.lessons || {}).filter(l => l.n > 0).length,
    lessonRuns: Object.values(s.lessons || {}).reduce((a, l) => a + (l.n || 0), 0),
    cards: cards.length,
    cardsDue: cards.filter(c => c.due <= now).length,
    cardsMature: cards.filter(c => c.ivl >= 21).length,
    strengthDist,
    mistakes: Object.keys(s.mistakes || {}).length,
    phrases: (s.phrases || []).length,
    stories: Object.keys(s.stories || {}).length,
    grammar: Object.keys(s.grammar || {}).length,
    badges: Object.keys(s.badges || {}).filter(k => !k.startsWith('freeze-')).length,
    answers: stats.answers || 0,
    accuracy: stats.answers ? Math.round((stats.correct || 0) / stats.answers * 100) : null,
    minutes: Math.round((stats.seconds || 0) / 60),
    dailyGoal: s.settings?.dailyGoal || 30,
    lang: s.settings?.lang || 'en',
    freezes: s.freezes || 0,
  };
}

// Chuỗi XP theo ngày trong n ngày gần nhất (cho biểu đồ).
function xpSeries(state, n = 60) {
  const xpByDay = state?.xpByDay || {};
  const out = []; let d = addDays(today(), -(n - 1));
  for (let i = 0; i < n; i++) { out.push({ day: d, xp: Number(xpByDay[d]) || 0, frozen: (state?.frozen || []).includes(d) }); d = addDays(d, 1); }
  return out;
}

module.exports = { summarize, xpSeries, today, addDays, DAY };

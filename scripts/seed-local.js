// Tạo dữ liệu mẫu để thử trang quản trị trên máy (chỉ chạy với http://localhost).
// Dùng: node scripts/seed-local.js [http://localhost:3000]
const BASE = process.argv[2] || 'http://localhost:3000';
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) { console.error('Chỉ chạy với localhost'); process.exit(1); }

// Tài khoản thử, chỉ tồn tại trong CSDL cục bộ.
const USERS = [
  { username: 'demo-admin', name: 'Demo Admin', password: 'demo-pass-1', days: 40, rate: 0.8, lang: 'vi' },
  { username: 'linh', name: 'Linh Nguyễn', password: 'demo-pass-2', days: 25, rate: 0.6, lang: 'vi' },
  { username: 'ola', name: 'Ola Nordmann', password: 'demo-pass-3', days: 10, rate: 0.9, lang: 'en' },
  { username: 'sam', name: 'Sam Taylor', password: 'demo-pass-4', days: 3, rate: 0.4, lang: 'en' },
  { username: 'idle', name: 'Idle User', password: 'demo-pass-5', days: 0, rate: 0, lang: 'en' },
];

const fmt = d => d.toLocaleDateString('sv-SE');
function fakeState(u) {
  const xpByDay = {}; const lessons = {}; const cards = {}; const mistakes = {};
  for (let i = 0; i < 60; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (i < u.days && Math.random() < u.rate + (i < 3 ? 0.3 : 0)) xpByDay[fmt(d)] = 10 + Math.floor(Math.random() * 50);
  }
  const ids = []; for (let un = 1; un <= 14; un++) for (let l = 1; l <= 3; l++) ids.push(`u${un}l${l}`);
  ids.slice(0, Math.round(u.days * 0.9)).forEach(id => { lessons[id] = { n: 1 + Math.floor(Math.random() * 3), best: 70 + Math.floor(Math.random() * 31), at: Date.now() }; });
  const words = ['hei', 'takk', 'et hus', 'en bil', 'ei jente', 'å spise', 'å drikke', 'god morgen', 'vann', 'melk', 'brød', 'å jobbe', 'kontor', 'havbruk', 'sjømat', 'trikk', 'buss', 'lege', 'syk', 'fint'];
  words.slice(0, Math.min(words.length, u.days)).forEach((w, i) => {
    const ivl = [0, 1, 3, 8, 25][i % 5];
    cards[w.replace(/^(en|ei|et|å) /, '')] = { no: w, vi: '', en: '', due: Date.now() + (i % 3 ? 1 : -1) * 864e5, ivl, ease: 2.5, reps: ivl ? 2 : 0, lapses: i % 4 === 0 ? 1 : 0, added: Date.now() - i * 864e5, upd: Date.now() };
  });
  if (u.days) mistakes['Jeg heter Phuong.'] = { no: 'Jeg heter Phuong.', vi: 'Tôi tên là Phương.', en: 'My name is Phuong.', n: 3, at: Date.now() };
  return {
    v: 1, updatedAt: Date.now(), settings: { lang: u.lang, dailyGoal: 30 }, xpByDay, frozen: [], freezes: 1, lessons, cards, mistakes,
    phrases: [], stories: u.days > 5 ? { s1: { score: '2/3', at: Date.now() } } : {}, grammar: u.days > 10 ? { g1: { score: '4/5', at: Date.now() } } : {},
    dictHistory: [], stats: { answers: u.days * 30, correct: Math.round(u.days * 30 * (0.7 + Math.random() * 0.25)), seconds: u.days * 600, words: Object.keys(cards).length },
    badges: u.days ? { 'first-lesson': fmt(new Date()) } : {},
  };
}

(async () => {
  for (const u of USERS) {
    const call = async (path, body, cookie, method = 'POST') => {
      const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', 'X-Lang': 'vi', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
      return { r, d: await r.json().catch(() => ({})) };
    };
    let { r, d } = await call('/api/auth/register', { username: u.username, name: u.name, password: u.password });
    if (r.status === 409) ({ r, d } = await call('/api/auth/login', { username: u.username, password: u.password }));
    if (!r.ok) { console.log(u.username, 'lỗi:', d.error); continue; }
    const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
    const put = await call('/api/state', { state: fakeState(u) }, cookie, 'PUT');
    console.log(`${u.username}: ${d.user.admin ? 'admin' : 'user'}, đồng bộ ${put.r.status}`);
  }
})();

import { esc, ICON, today, addDays, loadData } from '../ui.js';
import { store } from '../store.js';
import { app, showNewBadges } from '../app.js';
import { getCourse, nextLesson, progress } from '../course.js';
import { loadLexicon, allEntries, article, posVi } from '../lexicon.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 10) return ['God morgen', 'Chào buổi sáng'];
  if (h < 17) return ['God dag', 'Chúc một ngày tốt lành'];
  return ['God kveld', 'Chào buổi tối'];
}

// Chọn ổn định theo ngày (mọi thiết bị cùng thấy một "từ của ngày").
function dayIndex(n) { const d = today().replace(/-/g, ''); let h = 0; for (const c of d) h = (h * 31 + c.charCodeAt(0)) % 1000003; return h % n; }

function ring(pct) {
  const r = 46; const c = 2 * Math.PI * r;
  return `<svg viewBox="0 0 112 112"><circle cx="56" cy="56" r="${r}" stroke="rgba(255,255,255,.2)" stroke-width="12" fill="none"/><circle cx="56" cy="56" r="${r}" stroke="#FFD166" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(1, pct))}"/></svg>`;
}

function heatmap() {
  const weeks = 17; const end = today();
  const start = addDays(end, -(weeks * 7 - 1) - ((new Date().getDay() + 6) % 7) + 6);
  let html = ''; let d = start;
  const goal = store.s.settings.dailyGoal;
  while (d <= end) {
    const xp = store.s.xpByDay[d] || 0;
    const lvl = xp === 0 ? (store.s.frozen.includes(d) ? 'fz' : '') : xp >= goal * 2 ? 'l3' : xp >= goal ? 'l2' : 'l1';
    html += `<i class="${lvl} ${d === end ? 'today' : ''}" title="${d}: ${xp} XP"></i>`;
    d = addDays(d, 1);
  }
  return html;
}

export async function render(main) {
  const [course] = await Promise.all([getCourse(), loadLexicon()]);
  const [g, gvi] = greeting();
  const name = store.user?.name ? `, ${esc(store.user.name.split(' ').pop())}` : '';
  const xp = store.xpToday(); const goal = store.s.settings.dailyGoal;
  const next = nextLesson(course);
  const pr = progress(course);
  const due = store.dueCards().length;
  const mistakes = Object.keys(store.s.mistakes).length;
  const words = allEntries().filter(e => e.vi && e.pos !== 'phrase' && e.no.length > 2 && !/[A-Z]/.test(e.no[0]));
  const w = words[dayIndex(words.length)] || { no: 'hei', vi: 'chào' };
  const wNo = w.g ? `${article(w.g)} ${w.no}` : w.pos === 'v' ? `å ${w.no}` : w.no;
  let phrase = null;
  try { const pb = await loadData('phrasebook'); const all = pb.topics.flatMap(t => t.items); phrase = all[dayIndex(all.length + 7) % all.length]; } catch (e) { /* */ }

  main.innerHTML = `<div class="page">
    <section class="hero">
      <div>
        <p style="opacity:.75;margin:0" lang="nb">${g}${name}!</p>
        <h1>${xp >= goal ? 'Đã đạt mục tiêu hôm nay 🎉' : xp > 0 ? 'Tiếp tục nào!' : gvi + '!'}</h1>
        <p>${next.checkpoint ? `Kiểm tra chương: ${esc(next.unit.title)}` : `Chương ${next.ui + 1} · ${esc(next.unit.title)} · Bài ${next.li + 1}: ${esc(next.title)}`}</p>
        <a class="btn primary" href="#/learn/${next.id}">${ICON.play} ${pr.done ? 'Học tiếp' : 'Bắt đầu học'}</a>
      </div>
      <div class="ring">${ring(xp / goal)}<div class="lbl"><b>${xp}</b><small>/ ${goal} XP</small></div></div>
    </section>

    <div class="stat-boxes" style="margin-top:14px">
      <div class="sbox"><b style="color:var(--flame)">🔥 ${store.streak()}</b><small>ngày liên tiếp${store.s.freezes ? ` · ❄️ ${store.s.freezes}` : ''}</small></div>
      <div class="sbox"><b>${pr.done}/${pr.total}</b><small>bài đã học</small></div>
      <div class="sbox"><b>${Object.keys(store.s.cards).length}</b><small>thẻ từ</small></div>
      <div class="sbox"><b>${store.weekXp()}</b><small>XP tuần này</small></div>
    </div>

    ${due || mistakes ? `<div class="two-col" style="margin-top:14px">
      ${due ? `<a class="tile" href="#/review"><span class="ic">${ICON.cards}</span><b>${due} thẻ đến hạn</b><small>Ôn đúng lúc để không quên.</small></a>` : ''}
      ${mistakes ? `<a class="tile" href="#/learn/mistakes"><span class="ic" style="background:var(--bad-soft);color:var(--bad)">${ICON.x}</span><b>Luyện ${mistakes} lỗi sai</b><small>Làm lại những câu từng trả lời sai.</small></a>` : ''}
    </div>` : ''}

    <div class="section-title"><h2>Luyện tập</h2></div>
    <div class="quick">
      <a class="tile" href="#/dict"><span class="ic">${ICON.search}</span><b>Từ điển</b><small>Na Uy ⇄ Việt, biến cách, ví dụ</small></a>
      <a class="tile" href="#/phrases"><span class="ic">${ICON.chat}</span><b>Câu giao tiếp</b><small>Học, nhại theo, nghe hiểu</small></a>
      <a class="tile" href="#/pron"><span class="ic">${ICON.lips}</span><b>Phát âm</b><small>Nghe bất kỳ câu, bảng âm</small></a>
      <a class="tile" href="#/stories"><span class="ic">${ICON.story}</span><b>Truyện</b><small>Hội thoại có câu hỏi</small></a>
      <a class="tile" href="#/grammar"><span class="ic">${ICON.grammar}</span><b>Ngữ pháp</b><small>Giải thích ngắn + bài tập</small></a>
      <a class="tile" href="#/learn/listen"><span class="ic">${ICON.ear}</span><b>Luyện nghe</b><small>Nghe và chép câu đã học</small></a>
      <a class="tile" href="#/learn/speak"><span class="ic">${ICON.mic}</span><b>Luyện nói</b><small>Đọc to, máy chấm điểm</small></a>
      ${app.config.ai ? `<a class="tile" href="#/tutor"><span class="ic">${ICON.spark}</span><b>Gia sư AI</b><small>Hội thoại nhập vai, sửa câu</small></a>` : `<a class="tile" href="#/review?tab=words"><span class="ic">${ICON.bookmark}</span><b>Sổ từ</b><small>Từ anh đã lưu</small></a>`}
    </div>

    <div class="two-col" style="margin-top:24px">
      <section class="card">
        <div class="card-head"><h3>Từ của ngày</h3><span class="tag">${posVi(w.pos)}</span></div>
        <div class="wod"><button class="icon-btn" data-say="${esc(wNo)}" aria-label="Nghe">${ICON.sound}</button><div><div class="w" lang="nb">${esc(wNo)}</div><p class="muted">${esc(w.vi)}</p></div></div>
        <div style="display:flex;gap:8px;margin-top:12px"><a class="btn small" href="#/dict/${encodeURIComponent(w.no)}">Tra chi tiết</a><button class="btn small" id="wodSave">${ICON.bookmark} Lưu thẻ</button></div>
      </section>
      ${phrase ? `<section class="card">
        <div class="card-head"><h3>Câu của ngày</h3></div>
        <div class="wod"><button class="icon-btn" data-say="${esc(phrase.no)}" aria-label="Nghe">${ICON.sound}</button><div><div class="w" style="font-size:1.35rem" lang="nb">${esc(phrase.no)}</div><p class="muted">${esc(phrase.vi)}</p>${phrase.tip ? `<p class="tip">💡 ${esc(phrase.tip)}</p>` : ''}</div></div>
      </section>` : ''}
    </div>

    <section class="card" style="margin-top:12px">
      <div class="card-head"><h3>Lịch sử học tập</h3><span class="muted small">Kỷ lục: ${store.bestStreak()} ngày</span></div>
      <div class="heat">${heatmap()}</div>
      <p class="muted small" style="margin-top:6px">Ô càng đậm càng nhiều XP. Ô xanh nhạt là ngày được đóng băng chuỗi (mỗi chuỗi 7 ngày tặng 1 lượt, tối đa 2).</p>
    </section>
  </div>`;

  main.querySelector('#wodSave').onclick = () => {
    const ok = store.addCard({ no: wNo, vi: w.vi, pos: w.pos, g: w.g }, 'wod'); store.save();
    import('../ui.js').then(m => m.toast(ok ? 'Đã thêm vào thẻ ôn tập' : 'Từ này đã có trong thẻ ôn tập'));
  };
  showNewBadges();
}

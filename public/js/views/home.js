import { esc, ICON, today, addDays, loadData, toast } from '../ui.js';
import { store } from '../store.js';
import { app, showNewBadges } from '../app.js';
import { getCourse, nextLesson, progress, currentLevel, levelProgress } from '../course.js';
import { loadLexicon, allEntries, article, posVi } from '../lexicon.js';
import { t, L, mean } from '../i18n.js';

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
  const words = allEntries().filter(e => mean(e) && e.pos !== 'phrase' && e.no.length > 2 && !/[A-Z]/.test(e.no[0]));
  const w = words[dayIndex(words.length)] || { no: 'hei', vi: 'chào', en: 'hi' };
  const wNo = w.g ? `${article(w.g)} ${w.no}` : w.pos === 'v' ? `å ${w.no}` : w.no;
  let phrase = null;
  try { const pb = await loadData('phrasebook'); const all = pb.topics.flatMap(x => x.items); phrase = all[dayIndex(all.length + 7) % all.length]; } catch (e) { /* */ }
  const nextLabel = next.checkpoint
    ? t('Kiểm tra chương: {u}', { u: esc(L(next.unit, 'title')) })
    : t('Chương {n} · {u} · Bài {l}: {title}', { n: next.ui + 1, u: esc(L(next.unit, 'title')), l: next.li + 1, title: esc(L(next, 'title')) });

  main.innerHTML = `<div class="page">
    <section class="hero">
      <div>
        <p style="opacity:.75;margin:0" lang="nb">${g}${name}!</p>
        <h1>${xp >= goal ? `${t('Đã đạt mục tiêu hôm nay')} 🎉` : xp > 0 ? t('Tiếp tục nào!') : `${t(gvi)}!`}</h1>
        <p><span class="hero-level" title="${t('Cấp độ hiện tại')}">${esc(currentLevel(course))}</span> ${nextLabel}</p>
        <a class="btn primary" href="#/learn/${next.id}">${ICON.play} ${pr.done ? t('Học tiếp') : t('Bắt đầu học')}</a>
      </div>
      <div class="ring">${ring(xp / goal)}<div class="lbl"><b>${xp}</b><small>/ ${goal} XP</small></div></div>
    </section>

    <div class="stat-boxes" style="margin-top:14px">
      <div class="sbox"><b style="color:var(--flame)">🔥 ${store.streak()}</b><small>${t('ngày liên tiếp')}${store.s.freezes ? ` · ❄️ ${store.s.freezes}` : ''}</small></div>
      <div class="sbox"><b>${esc(currentLevel(course))} · ${levelProgress(course, currentLevel(course)).done}/${levelProgress(course, currentLevel(course)).total}</b><small>${t('Cấp độ hiện tại')} · ${t('{d}/{n} bài', { d: pr.done, n: pr.total })}</small></div>
      <div class="sbox"><b>${Object.keys(store.s.cards).length}</b><small>${t('thẻ từ')}</small></div>
      <div class="sbox"><b>${store.weekXp()}</b><small>${t('XP tuần này')}</small></div>
    </div>

    ${due || mistakes ? `<div class="two-col" style="margin-top:14px">
      ${due ? `<a class="tile" href="#/review"><span class="ic">${ICON.cards}</span><b>${t('{n} thẻ đến hạn', { n: due })}</b><small>${t('Ôn đúng lúc để không quên.')}</small></a>` : ''}
      ${mistakes ? `<a class="tile" href="#/learn/mistakes"><span class="ic" style="background:var(--bad-soft);color:var(--bad)">${ICON.x}</span><b>${t('Luyện {n} lỗi sai', { n: mistakes })}</b><small>${t('Làm lại những câu từng trả lời sai.')}</small></a>` : ''}
    </div>` : ''}

    <div class="section-title"><h2>${t('Luyện tập')}</h2></div>
    <div class="quick">
      <a class="tile" href="#/dict"><span class="ic">${ICON.search}</span><b>${t('Từ điển')}</b><small>${t('Na Uy ⇄ Việt, biến cách, ví dụ')}</small></a>
      <a class="tile" href="#/phrases"><span class="ic">${ICON.chat}</span><b>${t('Câu giao tiếp')}</b><small>${t('Học, nhại theo, nghe hiểu')}</small></a>
      <a class="tile" href="#/pron"><span class="ic">${ICON.lips}</span><b>${t('Phát âm')}</b><small>${t('Nghe bất kỳ câu, bảng âm')}</small></a>
      <a class="tile" href="#/stories"><span class="ic">${ICON.story}</span><b>${t('Truyện')}</b><small>${t('Hội thoại có câu hỏi')}</small></a>
      <a class="tile" href="#/grammar"><span class="ic">${ICON.grammar}</span><b>${t('Ngữ pháp')}</b><small>${t('Giải thích ngắn + bài tập')}</small></a>
      <a class="tile" href="#/learn/listen"><span class="ic">${ICON.ear}</span><b>${t('Luyện nghe')}</b><small>${t('Nghe và chép câu đã học')}</small></a>
      <a class="tile" href="#/learn/speak"><span class="ic">${ICON.mic}</span><b>${t('Luyện nói')}</b><small>${t('Đọc to, máy chấm điểm')}</small></a>
      ${app.config.ai ? `<a class="tile" href="#/tutor"><span class="ic">${ICON.spark}</span><b>${t('Gia sư AI')}</b><small>${t('Hội thoại nhập vai, sửa câu')}</small></a>` : `<a class="tile" href="#/review?tab=words"><span class="ic">${ICON.bookmark}</span><b>${t('Sổ từ')}</b><small>${t('Từ anh đã lưu')}</small></a>`}
    </div>

    <div class="two-col" style="margin-top:24px">
      <section class="card">
        <div class="card-head"><h3>${t('Từ của ngày')}</h3><span class="tag">${posVi(w.pos)}</span></div>
        <div class="wod"><button class="icon-btn" data-say="${esc(wNo)}" aria-label="${t('Nghe')}">${ICON.sound}</button><div><div class="w" lang="nb">${esc(wNo)}</div><p class="muted">${esc(mean(w))}</p></div></div>
        <div style="display:flex;gap:8px;margin-top:12px"><a class="btn small" href="#/dict/${encodeURIComponent(w.no)}">${t('Tra chi tiết')}</a><button class="btn small" id="wodSave">${ICON.bookmark} ${t('Lưu thẻ')}</button></div>
      </section>
      ${phrase ? `<section class="card">
        <div class="card-head"><h3>${t('Câu của ngày')}</h3></div>
        <div class="wod"><button class="icon-btn" data-say="${esc(phrase.no)}" aria-label="${t('Nghe')}">${ICON.sound}</button><div><div class="w" style="font-size:1.35rem" lang="nb">${esc(phrase.no)}</div><p class="muted">${esc(mean(phrase))}</p>${L(phrase, 'tip') ? `<p class="tip">💡 ${esc(L(phrase, 'tip'))}</p>` : ''}</div></div>
      </section>` : ''}
    </div>

    <section class="card" style="margin-top:12px">
      <div class="card-head"><h3>${t('Lịch sử học tập')}</h3><span class="muted small">${t('Kỷ lục: {n} ngày', { n: store.bestStreak() })}</span></div>
      <div class="heat">${heatmap()}</div>
      <p class="muted small" style="margin-top:6px">${t('Ô càng đậm càng nhiều XP. Ô xanh nhạt là ngày được đóng băng chuỗi (mỗi chuỗi 7 ngày tặng 1 lượt, tối đa 2).')}</p>
    </section>
  </div>`;

  main.querySelector('#wodSave').onclick = () => {
    const ok = store.addCard({ no: wNo, vi: w.vi, en: w.en, pos: w.pos, g: w.g }, 'wod'); store.save();
    toast(ok ? t('Đã thêm vào thẻ ôn tập') : t('Từ này đã có trong thẻ ôn tập'));
  };
  showNewBadges();

}

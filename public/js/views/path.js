import { esc, ICON, modal } from '../ui.js';
import { store } from '../store.js';
import { getCourse, status, nextLesson, progress, LEVELS, levelProgress } from '../course.js';
import { t, L, mean } from '../i18n.js';

const OFFSETS = [0, 46, 70, 46, 0, -46, -70, -46];

// Mô tả từng cấp độ CEFR.
const LEVEL_INFO = {
  A1: ['Sơ cấp', 'Chào hỏi, gia đình, số và giờ, đồ ăn, nhà ở, đi lại, mua sắm, thói quen hằng ngày.'],
  A2: ['Sơ trung cấp', 'Sức khỏe, công việc, sở thích, văn hóa Na Uy, du lịch, công nghệ, kể chuyện quá khứ.'],
  B1: ['Trung cấp', 'Hội nhập, thị trường lao động, nhà ở, y tế, giáo dục, tin tức, nêu ý kiến, môi trường.'],
  B2: ['Trung cao cấp', 'Chính trị, kinh tế, kinh tế biển, ngoại giao, luật, khoa học, văn hóa, lịch sử, giao tiếp chuyên nghiệp.'],
};

export async function render(main) {
  const course = await getCourse();
  const next = nextLesson(course);
  const pr = progress(course);
  const levels = LEVELS.filter(lv => course.units.some(u => u.level === lv));
  const lp = Object.fromEntries(levels.map(lv => [lv, levelProgress(course, lv)]));

  const unitHtml = (u, ui) => {
    const ls = course.flat.filter(l => l.ui === ui);
    const doneN = ls.filter(l => status(course, l) === 'done').length;
    return `<section class="unit" id="${u.id}">
      <div class="unit-head" style="background:${esc(u.color)}">
        <div><span class="lvl">${t('CHƯƠNG')} ${ui + 1} · ${esc(u.level)}</span><h2>${esc(L(u, 'title'))} <span style="font-weight:400;opacity:.8" lang="nb">· ${esc(u.title_no)}</span></h2><p>${esc(L(u, 'desc'))}</p></div>
        <button class="btn small" data-guide="${ui}">${ICON.book}<span>${t('Từ vựng')}</span></button>
      </div>
      <div class="nodes">${ls.map((l, i) => {
        const st = status(course, l);
        const cur = l.id === next.id && st !== 'done';
        const n = store.s.lessons[l.id]?.n || 0;
        const icon = st === 'locked' ? ICON.lock : l.checkpoint ? ICON.trophy : st === 'done' ? ICON.check : ICON.star;
        const title = l.checkpoint ? t('Kiểm tra chương') : L(l, 'title');
        return `<div class="node-wrap ${cur ? 'current' : ''}" style="transform:translateX(${OFFSETS[i % OFFSETS.length]}px)">
          ${cur ? `<span class="start-bubble">${t('BẮT ĐẦU')}</span>` : ''}
          <button class="node ${st === 'locked' ? 'locked' : ''} ${cur ? 'current' : ''} ${l.checkpoint ? 'checkpoint' : ''}" data-l="${l.id}" style="background:${esc(u.color)};--node-color:${esc(u.color)}" aria-label="${esc(title)}${st === 'locked' ? ` (${t('chưa mở')})` : ''}">${icon}${n > 1 ? `<span class="crown">${n}</span>` : ''}</button>
          <span class="node-label">${esc(title)}</span>
        </div>`;
      }).join('')}</div>
      <p class="muted small" style="text-align:center">${t('{d}/{n} hoàn thành', { d: doneN, n: ls.length })}</p>
    </section>`;
  };

  main.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>${t('Lộ trình')}</h1><p>${t('{d}/{n} bài · {u} chương, từ A1 đến {top}', { d: pr.done, n: pr.total, u: course.units.length, top: levels[levels.length - 1] })}</p></div>
    <div class="progress" style="width:180px"><div style="width:${Math.round(pr.done / pr.total * 100)}%"></div></div></div>
    <nav class="level-jump" aria-label="${t('Cấp độ')}">${levels.map(lv => `<a href="#" data-jump="${lv}" class="lj ${lv === next.unit.level ? 'cur' : ''}"><b>${lv}</b><small>${lp[lv].done}/${lp[lv].total}</small><span class="lj-bar"><i style="width:${Math.round(lp[lv].done / lp[lv].total * 100)}%"></i></span></a>`).join('')}</nav>
    ${levels.map(lv => `<section class="level" id="level-${lv}">
      <div class="level-head"><span class="level-code">${lv}</span><div><h2>${t(LEVEL_INFO[lv][0])}</h2><p class="muted small">${t(LEVEL_INFO[lv][1])}</p>
        <p class="muted small">${t('{d}/{n} bài', { d: lp[lv].done, n: lp[lv].total })}${lp[lv].done === lp[lv].total ? ` · ${t('Đã hoàn thành')} 🎉` : ''}</p></div></div>
      ${course.units.map((u, ui) => (u.level === lv ? unitHtml(u, ui) : '')).join('')}
    </section>`).join('')}
  </div>`;

  // Gắn vào .page (được tạo lại mỗi lần vẽ) để không cộng dồn trình xử lý trên #main.
  main.firstElementChild.addEventListener('click', e => {
    const j = e.target.closest('[data-jump]');
    if (j) { e.preventDefault(); main.querySelector(`#level-${j.dataset.jump}`).scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const nd = e.target.closest('.node');
    if (nd) {
      const l = course.byId[nd.dataset.l];
      const st = status(course, l);
      if (st === 'locked') {
        modal(`<h2>${t('Bài này chưa mở')}</h2><p class="muted" style="margin:8px 0 16px">${t('Hoàn thành các bài trước để mở khóa, hoặc làm bài kiểm tra để học vượt lên chương {n}.', { n: l.ui + 1 })}</p>
          <div style="display:flex;flex-direction:column;gap:8px"><a class="btn primary" href="#/learn/${l.unit.id}-check" data-close>${t('Kiểm tra học vượt')}</a><button class="btn" data-close>${t('Để sau')}</button></div>`);
        return;
      }
      const v = l.vocab.slice(0, 10);
      modal(`<p class="muted small">${l.checkpoint ? t('Kiểm tra chương') : t('Chương {n} · Bài {l}', { n: l.ui + 1, l: l.li + 1 })} · ${esc(l.unit.level)}</p><h2>${esc(l.checkpoint ? L(l.unit, 'title') : L(l, 'title'))}</h2>
        ${l.checkpoint ? `<p class="muted" style="margin:8px 0">${t('Tổng hợp toàn bộ từ và câu của chương. Hoàn thành để mở chương tiếp theo.')}</p>` : `<div class="chips" style="margin:12px 0">${v.map(x => `<span class="chip" lang="nb">${esc(x.no)}</span>`).join('')}${l.vocab.length > v.length ? `<span class="chip">+${l.vocab.length - v.length}</span>` : ''}</div>`}
        <p class="muted small" style="margin-bottom:14px">${st === 'done' ? t('Đã hoàn thành {n} lần · ôn lại để nhận thêm XP.', { n: store.s.lessons[l.id].n }) : t('+10 XP · khoảng 3–5 phút')}</p>
        <a class="btn primary block" href="#/learn/${l.id}" data-close>${st === 'done' ? t('Ôn lại') : t('Bắt đầu')}</a>`);
      return;
    }
    const gb = e.target.closest('[data-guide]');
    if (gb) {
      const u = course.units[Number(gb.dataset.guide)];
      modal(`<h2>${esc(L(u, 'title'))}</h2><p class="muted small" style="margin-bottom:10px">${t('Từ vựng và câu mẫu của chương. Chạm loa để nghe.')}</p>
        ${u.lessons.map(l => `<h3 style="margin:14px 0 6px">${esc(L(l, 'title'))}</h3><div class="list">${l.vocab.map(x => `<div class="row"><button class="icon-btn" data-say="${esc(x.no)}" aria-label="${t('Nghe')}">${ICON.sound}</button><div class="grow"><div class="no" lang="nb">${esc(x.no)}</div><div class="vi">${esc(mean(x))}</div></div></div>`).join('')}</div>`).join('')}`, { wide: true });
    }
  });

  const cur = main.querySelector('.node-wrap.current');
  if (cur) setTimeout(() => cur.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120);
}

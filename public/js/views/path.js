import { esc, ICON, modal } from '../ui.js';
import { store } from '../store.js';
import { go } from '../app.js';
import { getCourse, status, nextLesson, progress } from '../course.js';

const OFFSETS = [0, 46, 70, 46, 0, -46, -70, -46];

export async function render(main) {
  const course = await getCourse();
  const next = nextLesson(course);
  const pr = progress(course);
  main.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>Lộ trình</h1><p>${pr.done}/${pr.total} bài · ${course.units.length} chương, từ A1 đến A2</p></div>
    <div class="progress" style="width:180px"><div style="width:${Math.round(pr.done / pr.total * 100)}%"></div></div></div>
    ${course.units.map((u, ui) => {
      const ls = course.flat.filter(l => l.ui === ui);
      const doneN = ls.filter(l => status(course, l) === 'done').length;
      return `<section class="unit" id="${u.id}">
        <div class="unit-head" style="background:${esc(u.color)}">
          <div><span class="lvl">CHƯƠNG ${ui + 1} · ${esc(u.level)}</span><h2>${esc(u.title)} <span style="font-weight:400;opacity:.8" lang="nb">· ${esc(u.title_no)}</span></h2><p>${esc(u.desc)}</p></div>
          <button class="btn small" data-guide="${ui}">${ICON.book}<span>Từ vựng</span></button>
        </div>
        <div class="nodes">${ls.map((l, i) => {
          const st = status(course, l);
          const cur = l.id === next.id && st !== 'done';
          const n = store.s.lessons[l.id]?.n || 0;
          const icon = st === 'locked' ? ICON.lock : l.checkpoint ? ICON.trophy : st === 'done' ? ICON.check : ICON.star;
          return `<div class="node-wrap ${cur ? 'current' : ''}" style="transform:translateX(${OFFSETS[i % OFFSETS.length]}px)">
            ${cur ? '<span class="start-bubble">BẮT ĐẦU</span>' : ''}
            <button class="node ${st === 'locked' ? 'locked' : ''} ${cur ? 'current' : ''} ${l.checkpoint ? 'checkpoint' : ''}" data-l="${l.id}" style="background:${esc(u.color)};--node-color:${esc(u.color)}" aria-label="${esc(l.title)}${st === 'locked' ? ' (chưa mở)' : ''}">${icon}${n > 1 ? `<span class="crown">${n}</span>` : ''}</button>
            <span class="node-label">${esc(l.title)}</span>
          </div>`;
        }).join('')}</div>
        <p class="muted small" style="text-align:center">${doneN}/${ls.length} hoàn thành</p>
      </section>`;
    }).join('')}
  </div>`;

  main.addEventListener('click', e => {
    const n = e.target.closest('.node');
    if (n) {
      const l = course.byId[n.dataset.l];
      const st = status(course, l);
      if (st === 'locked') {
        modal(`<h2>Bài này chưa mở</h2><p class="muted" style="margin:8px 0 16px">Hoàn thành các bài trước để mở khóa, hoặc làm bài kiểm tra để học vượt lên chương ${l.ui + 1}.</p>
          <div style="display:flex;flex-direction:column;gap:8px"><a class="btn primary" href="#/learn/${l.unit.id}-check" data-close>Kiểm tra học vượt</a><button class="btn" data-close>Để sau</button></div>`);
        return;
      }
      const v = l.vocab.slice(0, 8);
      modal(`<p class="muted small">${l.checkpoint ? 'Kiểm tra chương' : `Chương ${l.ui + 1} · Bài ${l.li + 1}`}</p><h2>${esc(l.title)}</h2>
        ${l.checkpoint ? '<p class="muted" style="margin:8px 0">Tổng hợp toàn bộ từ và câu của chương. Hoàn thành để mở chương tiếp theo.</p>' : `<div class="chips" style="margin:12px 0">${v.map(x => `<span class="chip" lang="nb">${esc(x.no)}</span>`).join('')}</div>`}
        <p class="muted small" style="margin-bottom:14px">${st === 'done' ? `Đã hoàn thành ${store.s.lessons[l.id].n} lần · ôn lại để nhận thêm XP.` : '+10 XP · khoảng 3–5 phút'}</p>
        <a class="btn primary block" href="#/learn/${l.id}" data-close>${st === 'done' ? 'Ôn lại' : 'Bắt đầu'}</a>`);
      return;
    }
    const gb = e.target.closest('[data-guide]');
    if (gb) {
      const u = course.units[Number(gb.dataset.guide)];
      modal(`<h2>${esc(u.title)}</h2><p class="muted small" style="margin-bottom:10px">Từ vựng và câu mẫu của chương. Chạm loa để nghe.</p>
        ${u.lessons.map(l => `<h3 style="margin:14px 0 6px">${esc(l.title)}</h3><div class="list">${l.vocab.map(x => `<div class="row"><button class="icon-btn" data-say="${esc(x.no)}" aria-label="Nghe">${ICON.sound}</button><div class="grow"><div class="no" lang="nb">${esc(x.no)}</div><div class="vi">${esc(x.vi)}</div></div></div>`).join('')}</div>`).join('')}`, { wide: true });
    }
  });

  const cur = main.querySelector('.node-wrap.current');
  if (cur) setTimeout(() => cur.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120);
}

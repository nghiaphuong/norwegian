// Kiểm tra trang truyện: đọc hết 10 truyện, có điều hướng và nút quay lại, nút Xong về danh sách.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const $ = s => document.querySelector(s); const $$ = s => [...document.querySelectorAll(s)];
await sleep(1200);
const st = await (await fetch('/data/stories.json')).json();
const out = { fails: [], checks: {} };
for (const s of st.stories) {
  location.hash = '#/stories/' + s.id; await sleep(400);
  if (s.id === 's1') {
    out.checks.navVisible = innerWidth < 768 ? getComputedStyle($('#tabbar')).display !== 'none' : getComputedStyle($('.sidebar')).display !== 'none';
    out.checks.backButton = !!$('.story-bar a[href="#/stories"]');
  }
  for (let i = 0; i < 80; i++) { const b = $('#snext'); if (!b || b.dataset.done) break; if (b.disabled) { $('.q-card .opt:not([disabled])')?.click(); await sleep(40); } b.click(); await sleep(35); }
  if (!$('.done-screen')) out.fails.push(s.id);
}
$('#snext').click(); await sleep(400);
out.checks.doneReturnsToList = location.hash === '#/stories';
location.hash = '#/stories/s2'; await sleep(400);
$('.story-bar a[href="#/stories"]').click(); await sleep(400);
out.checks.backWorks = location.hash === '#/stories' && $$('.topic-tile').length === 10;
out.checks.noOverflow = document.documentElement.scrollWidth <= innerWidth + 1;
out.errors = window.__errs || [];
return out;

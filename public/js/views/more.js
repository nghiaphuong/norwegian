// Menu "Thêm" trên điện thoại.
import { ICON, esc } from '../ui.js';
import { app } from '../app.js';
import { store } from '../store.js';
import { t, lang } from '../i18n.js';

export async function render(main) {
  const items = [
    ['phrases', 'chat', 'Câu giao tiếp', '22 tình huống: học, nhại theo, nghe hiểu'],
    ['pron', 'lips', 'Phát âm', 'Nghe bất kỳ câu, bảng âm, cặp âm dễ nhầm'],
    ['stories', 'story', 'Truyện', 'Hội thoại ngắn có câu hỏi'],
    ['grammar', 'grammar', 'Ngữ pháp', 'Giải thích ngắn gọn + kiểm tra'],
    ['learn/listen', 'ear', 'Luyện nghe', 'Nghe và chép câu đã học'],
    ['learn/speak', 'mic', 'Luyện nói', 'Đọc to, máy chấm điểm'],
    ...(app.config.ai ? [['tutor', 'spark', 'Gia sư AI', 'Hội thoại nhập vai, sửa câu']] : []),
    ['me', 'user', store.user ? null : 'Hồ sơ & cài đặt', 'Thống kê, huy hiệu, bảng xếp hạng, cài đặt'],
    ...(store.user?.admin ? [['admin', 'shield', 'Quản trị', 'Quản lý người dùng và thống kê']] : []),
  ];
  main.innerHTML = `<div class="page"><div class="page-head"><h1>${t('Thêm')}</h1>
    <div class="seg lang-switch" role="group" aria-label="Language"><button data-lang="en" aria-pressed="${lang() === 'en'}">English</button><button data-lang="vi" aria-pressed="${lang() === 'vi'}">Tiếng Việt</button></div></div>
    <div class="list">${items.map(([href, ic, ti, d]) => `<a class="row" href="#/${href}" style="text-decoration:none"><span class="tile" style="padding:0;border:0;background:none"><span class="ic">${ICON[ic]}</span></span><div class="grow"><b>${ti === null ? esc(store.user.name) : t(ti)}</b><div class="vi">${t(d)}</div></div>${ICON.next}</a>`).join('')}</div></div>`;
}

// Menu "Thêm" trên điện thoại.
import { ICON } from '../ui.js';
import { app } from '../app.js';
import { store } from '../store.js';

export async function render(main) {
  const items = [
    ['phrases', 'chat', 'Câu giao tiếp', '14 tình huống: học, nhại theo, nghe hiểu'],
    ['pron', 'lips', 'Phát âm', 'Nghe bất kỳ câu, bảng âm, cặp âm dễ nhầm'],
    ['stories', 'story', 'Truyện', 'Hội thoại ngắn có câu hỏi'],
    ['grammar', 'grammar', 'Ngữ pháp', 'Giải thích ngắn gọn + kiểm tra'],
    ['learn/listen', 'ear', 'Luyện nghe', 'Nghe và chép câu đã học'],
    ['learn/speak', 'mic', 'Luyện nói', 'Đọc to, máy chấm điểm'],
    ...(app.config.ai ? [['tutor', 'spark', 'Gia sư AI', 'Hội thoại nhập vai, sửa câu']] : []),
    ['me', 'user', store.user ? store.user.name : 'Hồ sơ & cài đặt', 'Thống kê, huy hiệu, bảng xếp hạng, cài đặt'],
  ];
  main.innerHTML = `<div class="page"><h1 style="margin-bottom:16px">Thêm</h1>
    <div class="list">${items.map(([href, ic, t, d]) => `<a class="row" href="#/${href}" style="text-decoration:none"><span class="tile" style="padding:0;border:0;background:none"><span class="ic">${ICON[ic]}</span></span><div class="grow"><b>${t}</b><div class="vi">${d}</div></div>${ICON.next}</a>`).join('')}</div></div>`;
}

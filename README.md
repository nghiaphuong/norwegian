# Norsk – Học tiếng Na Uy cho người Việt

Ứng dụng web Node.js + MySQL kết hợp hai công cụ "Norsk hver dag" (luyện nghe nói) và "Norsk uttale" (phát âm), mở rộng thành một nền tảng học tiếng Na Uy (Bokmål, chuẩn Oslo) đầy đủ, lấy cảm hứng từ Duolingo, Anki, Memrise và Clozemaster.

## Chức năng
| Mục | Nội dung |
|---|---|
| **Hôm nay** | Mục tiêu XP hằng ngày, chuỗi ngày học (có lượt đóng băng chuỗi), từ của ngày, câu của ngày, lịch sử học dạng ô nhiệt 17 tuần |
| **Lộ trình** | 14 chương, 42 bài A1→A2 và bài kiểm tra cuối chương (có học vượt). Mỗi bài 9 dạng bài tập: chọn nghĩa, chọn từ, nghe chọn, ghép cặp, xếp câu từ thẻ chữ, điền chỗ trống, nghe chép, gõ từ, nói (máy chấm). Câu sai được làm lại cuối bài |
| **Ôn tập** | Thẻ lặp lại ngắt quãng (SM-2: Quên/Khó/Nhớ/Dễ, cả chiều Việt → Na Uy), sổ từ cá nhân, luyện lỗi sai |
| **Từ điển** | Bokmålsordboka (biến cách đầy đủ, nghĩa, ví dụ, thành ngữ) + dịch nghĩa sang tiếng Việt + Wiktionary tiếng Anh + 2.400 từ thông dụng có nghĩa tiếng Việt soạn sẵn; tra được dạng chia (huset, gikk), tra ngược Việt → Na Uy, dịch câu Na Uy ⇄ Việt/Anh, lưu thẻ một chạm |
| **Câu giao tiếp** | 14 tình huống (siêu thị, Ruter, bác sĩ, NAV, công sở…) với 3 chế độ: Học câu (nghe, nói thử có chấm), Nhại theo (shadowing), Nghe hiểu |
| **Phát âm** | Nghe bất kỳ câu (chậm, 3 lần, đánh vần, mẹo đọc tự động), bảng phát âm đầy đủ, luyện tai với cặp âm dễ nhầm (tak/takk, bønder/bønner…) |
| **Truyện** | 10 truyện hội thoại kiểu Duolingo Stories, chạm từ để xem nghĩa, câu hỏi hiểu bài xen giữa |
| **Ngữ pháp** | 14 bài giải thích bằng tiếng Việt, so sánh với tiếng Việt, ví dụ có âm thanh, bài kiểm tra |
| **Gia sư AI** (tùy chọn) | Hội thoại nhập vai với Claude (quán cà phê, bác sĩ, phỏng vấn…) có sửa lỗi, sửa câu tự viết, giải thích câu từng từ |
| **Hồ sơ** | Tài khoản, đồng bộ đa thiết bị, bảng xếp hạng tuần, 16 huy hiệu, cài đặt giọng đọc/tốc độ/giao diện, sao lưu và khôi phục |

Giao diện riêng cho **desktop** (thanh điều hướng trái, cột tổng quan phải), **máy tính bảng** (thanh icon thu gọn) và **điện thoại** (thanh tab dưới, làm bài toàn màn hình); chế độ sáng/tối; cài được như ứng dụng (PWA) và mở được khi ngoại tuyến.

## Dữ liệu
- Không đăng nhập: tiến độ lưu trên trình duyệt.
- Có MySQL + đăng nhập: tiến độ đồng bộ giữa các thiết bị (gộp thông minh, không mất dữ liệu), có bảng xếp hạng tuần, bộ nhớ đệm từ điển và bản dịch (giảm gọi dịch vụ ngoài).
- Bảng tự tạo khi khởi động (`src/schema.sql`).

## Triển khai trên Hostinger (Node.js Web App)
1. hPanel → Databases → tạo database MySQL + user.
2. Websites → Add website → Node.js Web App → Import Git Repository → chọn `norwegian`, nhánh `main`.
   - Framework: Express · Entry file: `server.js` · Node 20/22 · Build: để trống hoặc `npm run build`.
3. Đặt biến môi trường theo `.env.example` (tối thiểu `DB_*`, `SESSION_SECRET`; thêm `ANTHROPIC_API_KEY` nếu muốn bật Gia sư AI).
4. Deploy. Mỗi lần push lên `main`, Hostinger tự build lại.

## Chạy trên máy
```bash
cp .env.example .env   # có thể để trống DB_NAME
npm install
npm start              # http://localhost:3000
npm run check          # kiểm tra tính hợp lệ của dữ liệu bài học
```

## Cấu trúc
```
server.js                 Express, nén, cache tĩnh, migrate CSDL
src/config.js             Biến môi trường
src/db.js, schema.sql     MySQL (users, user_state, xp_daily, cache, ai_usage)
src/auth.js               Phiên đăng nhập ký HMAC, mật khẩu scrypt
src/dict.js               Bokmålsordboka + Wiktionary, chuẩn hóa và lưu đệm
src/translate.js          Dịch máy (Google nếu có khóa, nếu không MyMemory)
src/ai.js                 Gia sư Claude (tùy chọn)
src/routes/api.js         REST API
public/index.html         Khung ứng dụng (SPA, không cần bước build)
public/css/app.css        Giao diện desktop / tablet / mobile, sáng / tối
public/js/app.js          Điều hướng, thanh bên, chạm từ xem nghĩa
public/js/engine.js       Trình làm bài kiểu Duolingo
public/js/store.js        Tiến độ, XP, chuỗi ngày, SRS, huy hiệu, đồng bộ
public/js/speech.js       Đọc thành tiếng và nhận dạng giọng nói
public/js/views/*.js      Các trang
public/data/*.json        Giáo trình, từ vựng, câu giao tiếp, truyện, ngữ pháp
```

## Nguồn
Bokmålsordboka © Språkrådet og Universitetet i Bergen (ordbokene.no) · Wiktionary (CC BY-SA) · MyMemory. Giọng đọc và nhận dạng giọng nói do trình duyệt cung cấp (Web Speech API); nên dùng Chrome/Edge trên máy tính, Safari trên iPhone.

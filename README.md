# Norsk – Learn Norwegian / Học tiếng Na Uy

**Song ngữ:** giao diện và toàn bộ nội dung có bản **tiếng Anh (mặc định)** và **tiếng Việt**, chuyển bằng nút EN/VI (thanh bên trái trên desktop, góc trên trên điện thoại, hoặc Hồ sơ → Cài đặt). Lựa chọn được lưu và đồng bộ theo tài khoản.

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

## Trang quản trị (#/admin)
Chỉ hiện với tài khoản quản trị viên (kiểm tra cả ở máy chủ lẫn giao diện).
- **Tổng quan:** số người dùng, người học hôm nay / 7 / 30 ngày, XP, lượt hoàn thành bài, giờ luyện tập, biểu đồ 30 ngày, người chăm nhất tuần, tỷ lệ ngôn ngữ giao diện, lượt dùng gia sư AI.
- **Người dùng:** tìm kiếm, lọc (hoạt động / không hoạt động / quản trị viên / bị khóa), sắp xếp theo từng cột, xuất CSV.
- **Chi tiết từng người:** chuỗi ngày, XP theo ngày (60 ngày), tiến độ theo chương, độ nhớ thẻ từ, lỗi hay gặp, huy hiệu, lượt AI; thao tác đổi tên, đặt lại mật khẩu (tạo mật khẩu ngẫu nhiên, hiện một lần), cấp/bỏ quyền quản trị, khóa/mở khóa, xóa tiến độ, xóa tài khoản.
- **Cài đặt đăng ký:** mở cho mọi người / cần mã mời / đóng; đổi mã mời ngay trên trang (ghi đè INVITE_CODE).
- Người đăng ký đầu tiên tự động là quản trị viên; với CSDL có sẵn, người có id nhỏ nhất được nâng lên quản trị viên.
- Thử trên máy: chạy MySQL/MariaDB cục bộ, đặt DB_* trong `.env`, rồi `node scripts/seed-local.js` để tạo dữ liệu mẫu.

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
npm run check          # kiểm tra dữ liệu bài học (cả bản EN) và độ phủ bảng dịch giao diện
```

## Cấu trúc
```
server.js                 Express, nén, cache tĩnh, migrate CSDL
src/config.js             Biến môi trường
src/db.js, schema.sql     MySQL (users, user_state, xp_daily, cache, ai_usage, app_settings)
src/auth.js               Phiên đăng nhập ký HMAC, mật khẩu scrypt
src/dict.js               Bokmålsordboka + Wiktionary, chuẩn hóa và lưu đệm
src/translate.js          Dịch máy (Google nếu có khóa, nếu không MyMemory)
src/ai.js                 Gia sư Claude (tùy chọn)
src/routes/api.js         REST API
src/routes/admin.js       API quản trị
src/stats.js              Tính chỉ số học tập từ tiến độ đồng bộ
public/index.html         Khung ứng dụng (SPA, không cần bước build)
public/css/app.css        Giao diện desktop / tablet / mobile, sáng / tối
public/js/app.js          Điều hướng, thanh bên, chạm từ xem nghĩa, chuyển EN/VI
public/js/i18n.js         t() dịch giao diện, L()/mean() chọn nội dung theo ngôn ngữ
public/js/lang/en.js      Bảng dịch tiếng Anh (khóa = câu tiếng Việt)
public/js/pron-data-en.js Bảng phát âm bản tiếng Anh
src/i18n.js               Thông báo API theo header X-Lang
public/js/engine.js       Trình làm bài kiểu Duolingo
public/js/store.js        Tiến độ, XP, chuỗi ngày, SRS, huy hiệu, đồng bộ
public/js/speech.js       Đọc thành tiếng và nhận dạng giọng nói
public/js/views/*.js      Các trang
public/data/*.json        Giáo trình, từ vựng, câu giao tiếp, truyện, ngữ pháp
```

## Nguồn
Bokmålsordboka © Språkrådet og Universitetet i Bergen (ordbokene.no) · Wiktionary (CC BY-SA) · MyMemory. Giọng đọc và nhận dạng giọng nói do trình duyệt cung cấp (Web Speech API); nên dùng Chrome/Edge trên máy tính, Safari trên iPhone.

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
process.env.TZ = process.env.TZ || 'Europe/Oslo';

const env = (k, d = '') => (process.env[k] !== undefined && process.env[k] !== '' ? process.env[k] : d);

module.exports = {
  port: parseInt(env('PORT', '3000'), 10),
  tz: env('TZ', 'Europe/Oslo'),
  publicUrl: env('PUBLIC_URL', ''),
  // Bỏ trống DB_NAME → app vẫn chạy, tiến độ chỉ lưu trên trình duyệt (không có tài khoản, bảng xếp hạng, bộ nhớ đệm từ điển).
  db: {
    // "localhost" có thể phân giải sang IPv6 (::1) mà user MySQL trên Hostinger không được cấp quyền.
    host: env('DB_HOST', '127.0.0.1').replace(/^localhost$/i, '127.0.0.1'),
    port: parseInt(env('DB_PORT', '3306'), 10),
    database: env('DB_NAME', ''),
    user: env('DB_USER', 'root'),
    password: env('DB_PASSWORD', ''),
  },
  sessionSecret: env('SESSION_SECRET', 'dev-secret-change-me'),
  // Mã mời khi đăng ký tài khoản. Bỏ trống = ai cũng đăng ký được.
  inviteCode: env('INVITE_CODE', ''),
  // Tùy chọn: Gia sư AI (giải thích câu, sửa câu, hội thoại nhập vai). Bỏ trống = ẩn tính năng AI.
  anthropic: {
    key: env('ANTHROPIC_API_KEY'),
    model: env('ANTHROPIC_MODEL', 'claude-haiku-5-5'),
    dailyLimit: parseInt(env('AI_DAILY_LIMIT', '60'), 10), // số lượt AI tối đa mỗi người mỗi ngày
  },
  // Tùy chọn: Google Cloud Translation (chính xác hơn). Bỏ trống = dùng MyMemory miễn phí.
  googleTranslateKey: env('GOOGLE_TRANSLATE_API_KEY'),
  myMemoryEmail: env('MYMEMORY_EMAIL'), // tăng hạn mức MyMemory từ 5.000 lên 50.000 ký tự/ngày
};

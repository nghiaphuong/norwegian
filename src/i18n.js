// Thông báo của API theo ngôn ngữ giao diện (header X-Lang: en | vi; mặc định en).
const EN = {
  'Thao tác quá nhanh, thử lại sau ít phút': 'Too many requests, please try again in a few minutes',
  'Máy chủ chưa kết nối cơ sở dữ liệu': 'The server is not connected to a database',
  'Tên đăng nhập 3–40 ký tự: chữ thường, số, dấu . _ -': 'Username must be 3–40 characters: lowercase letters, digits, . _ -',
  'Mật khẩu tối thiểu 6 ký tự': 'Password must be at least 6 characters',
  'Mã mời không đúng': 'Invalid invite code',
  'Tên đăng nhập đã có người dùng': 'That username is already taken',
  'Sai tên đăng nhập hoặc mật khẩu': 'Wrong username or password',
  'Mật khẩu cũ không đúng': 'Your current password is incorrect',
  'Tên hiển thị không được trống': 'Display name cannot be empty',
  'Dữ liệu không hợp lệ': 'Invalid data',
  'Dữ liệu quá lớn': 'Data is too large',
  'Thiếu từ cần tra': 'Missing word to look up',
  'Chưa bật gia sư AI (thiếu ANTHROPIC_API_KEY)': 'The AI tutor is not enabled (ANTHROPIC_API_KEY is missing)',
  'Cần đăng nhập': 'Please sign in',
  'Đã dùng hết {n} lượt AI hôm nay': 'You have used all {n} AI requests for today',
};

const langOf = req => (req.get('X-Lang') === 'vi' ? 'vi' : 'en');
function tr(req, s, vars) {
  let out = langOf(req) === 'en' ? (EN[s] || s) : s;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  return out;
}

module.exports = { tr, langOf };

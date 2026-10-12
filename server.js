const path = require('path');
const express = require('express');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const config = require('./src/config');
const { migrate } = require('./src/db');
const { attachUser } = require('./src/auth');

const app = express();
app.set('trust proxy', 1);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(attachUser);
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'microphone=(self)');
  next();
});
app.get('/healthz', (req, res) => res.json({ ok: true }));
app.use('/api', require('./src/routes/api'));

const pub = path.join(__dirname, 'public');
// Mã nguồn và dữ liệu: luôn kiểm tra lại bằng ETag (rẻ, luôn mới sau mỗi lần deploy); ảnh/icon cache 7 ngày.
app.use(express.static(pub, {
  index: false,
  setHeaders(res, file) {
    if (/\.(html|js|css|json|webmanifest)$/.test(file))res.setHeader('Cache-Control', 'no-cache');
    else res.setHeader('Cache-Control', 'public, max-age=604800');
  },
}));
app.get('*', (req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.sendFile(path.join(pub, 'index.html')); });

(async () => {
  try {
    if (await migrate()) console.log('Database ready');
  } catch (e) {
    console.error('Lỗi cơ sở dữ liệu – kiểm tra biến DB_*:', e.message);
  }
  app.listen(config.port, () => console.log(`Norsk listening on ${config.port}`));
})();

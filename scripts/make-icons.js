// Tạo icon PNG (cờ Na Uy cách điệu trên nền bo góc) không cần thư viện ngoài.
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, maskable) {
  const RED = [186, 12, 47], WHITE = [255, 255, 255], NAVY = [0, 32, 91];
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const r = maskable ? 0 : size * 0.2;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      // Bo góc
      let inside = true;
      const cx = Math.min(Math.max(x, r), size - 1 - r), cy = Math.min(Math.max(y, r), size - 1 - r);
      if (r && (x - cx) ** 2 + (y - cy) ** 2 > r * r) inside = false;
      let col = RED;
      const vx = 0.36, vy = 0.5; // tâm chữ thập (lệch trái như cờ thật)
      if (Math.abs(u - vx) < 0.12 || Math.abs(v - vy) < 0.12) col = WHITE;
      if (Math.abs(u - vx) < 0.06 || Math.abs(v - vy) < 0.06) col = NAVY;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = col[0]; raw[o + 1] = col[1]; raw[o + 2] = col[2]; raw[o + 3] = inside ? 255 : 0;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const out = path.join(__dirname, '..', 'public', 'icons');
fs.writeFileSync(path.join(out, 'icon-192.png'), png(192));
fs.writeFileSync(path.join(out, 'icon-512.png'), png(512));
fs.writeFileSync(path.join(out, 'maskable-512.png'), png(512, true));
console.log('ok');

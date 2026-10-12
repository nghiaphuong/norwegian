// Đọc tiếng Na Uy trên máy chủ, dùng khi thiết bị không có giọng Na Uy (giọng tiếng Anh sẽ đánh vần sai, vd "hva").
// Có GOOGLE_TTS_API_KEY → Google Cloud Text-to-Speech (giọng nb-NO chính thức); không có → giọng Google Dịch.
// Mỗi câu chỉ tạo một lần rồi lưu đệm trong CSDL.
const crypto = require('crypto');
const config = require('./config');
const { cacheGet, cacheSet } = require('./db');

const MAX = 400;   // độ dài tối đa một yêu cầu
const CHUNK = 180; // Google Dịch nhận tối đa ~200 ký tự mỗi lượt

function chunks(text) {
  const out = [];
  for (const part of text.split(/(?<=[.!?;:,])\s+/)) {
    let p = part.trim();
    while (p.length > CHUNK) {
      const cut = p.lastIndexOf(' ', CHUNK) > 40 ? p.lastIndexOf(' ', CHUNK) : CHUNK;
      out.push(p.slice(0, cut)); p = p.slice(cut).trim();
    }
    if (p) out.push(p);
  }
  return out;
}

async function googleTranslateTts(text) {
  const parts = chunks(text);
  const bufs = [];
  for (let i = 0; i < parts.length; i++) {
    const params = new URLSearchParams({ ie: 'UTF-8', tl: 'no', client: 'tw-ob', q: parts[i], total: String(parts.length), idx: String(i), textlen: String(parts[i].length) });
    const r = await fetch(`https://translate.google.com/translate_tts?${params}`, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://translate.google.com/' } });
    if (!r.ok) throw new Error(`TTS HTTP ${r.status}`);
    bufs.push(Buffer.from(await r.arrayBuffer()));
  }
  return Buffer.concat(bufs); // ghép các khung MP3 liền nhau vẫn phát bình thường
}

async function googleCloudTts(text) {
  const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${config.googleTtsKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { text }, voice: { languageCode: 'nb-NO', name: config.googleTtsVoice }, audioConfig: { audioEncoding: 'MP3' } }),
  });
  if (!r.ok) throw new Error(`Cloud TTS HTTP ${r.status}`);
  return Buffer.from((await r.json()).audioContent, 'base64');
}

const inflight = new Map();
async function synth(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim().slice(0, MAX);
  if (!t) throw new Error('empty');
  const src = config.googleTtsKey ? `cloud:${config.googleTtsVoice}` : 'gt';
  const key = `tts:${src}:${crypto.createHash('sha1').update(t.toLowerCase()).digest('hex')}`;
  const hit = await cacheGet(key);
  if (hit) return Buffer.from(hit, 'base64');
  // Gộp các yêu cầu trùng nhau đang chạy (nhiều người bấm cùng một từ).
  if (inflight.has(key)) return inflight.get(key);
  const p = (config.googleTtsKey ? googleCloudTts(t) : googleTranslateTts(t))
    .then(async buf => { await cacheSet(key, buf.toString('base64')); return buf; })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

module.exports = { synth, provider: () => (config.googleTtsKey ? 'Google Cloud TTS' : 'Google Translate') };

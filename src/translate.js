// Dịch máy: Google Cloud Translation nếu có khóa, nếu không dùng MyMemory (miễn phí). Mỗi câu lưu đệm vĩnh viễn.
const crypto = require('crypto');
const config = require('./config');
const { cacheGet, cacheSet } = require('./db');

const LANGS = ['nb', 'vi', 'en'];
const h = s => crypto.createHash('sha1').update(s).digest('hex');

async function googleBatch(texts, from, to) {
  const r = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${config.googleTranslateKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: texts, source: from === 'nb' ? 'no' : from, target: to === 'nb' ? 'no' : to, format: 'text' }),
  });
  if (!r.ok) throw new Error(`Google Translate HTTP ${r.status}`);
  const d = await r.json();
  return d.data.translations.map(t => t.translatedText);
}

async function myMemory(text, from, to) {
  const params = new URLSearchParams({ q: text.slice(0, 480), langpair: `${from === 'nb' ? 'no' : from}|${to === 'nb' ? 'no' : to}` });
  if (config.myMemoryEmail) params.set('de', config.myMemoryEmail);
  const r = await fetch(`https://api.mymemory.translated.net/get?${params}`);
  if (!r.ok) throw new Error(`MyMemory HTTP ${r.status}`);
  const d = await r.json();
  if (d.quotaFinished) throw new Error('Hết hạn mức dịch miễn phí hôm nay');
  const t = d.responseData?.translatedText || '';
  if (/MYMEMORY WARNING|INVALID LANGUAGE/i.test(t)) throw new Error('Dịch vụ dịch đang bận');
  return t;
}

async function translate(texts, from, to) {
  if (!LANGS.includes(from) || !LANGS.includes(to) || from === to) throw new Error('Cặp ngôn ngữ không hợp lệ');
  const list = texts.map(t => String(t || '').trim()).slice(0, 12);
  const out = new Array(list.length).fill('');
  const missing = [];
  for (let i = 0; i < list.length; i++) {
    if (!list[i]) continue;
    const hit = await cacheGet(`tr:${from}:${to}:${h(list[i])}`);
    if (hit) out[i] = hit; else missing.push(i);
  }
  if (missing.length) {
    let res;
    if (config.googleTranslateKey) res = await googleBatch(missing.map(i => list[i]), from, to);
    else res = await Promise.all(missing.map(i => myMemory(list[i], from, to).catch(() => '')));
    for (let k = 0; k < missing.length; k++) {
      const i = missing[k];
      out[i] = res[k] || '';
      if (out[i]) await cacheSet(`tr:${from}:${to}:${h(list[i])}`, out[i]);
    }
  }
  return out;
}

module.exports = { translate, provider: () => (config.googleTranslateKey ? 'Google Translate' : 'MyMemory') };

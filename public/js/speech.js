// Đọc thành tiếng và nhận dạng giọng nói tiếng Na Uy.
// Hai nguồn đọc: giọng Na Uy của thiết bị (Web Speech API) hoặc giọng trực tuyến do máy chủ tạo (/api/tts).
// Chế độ "tự động": dùng giọng thiết bị nếu có giọng Na Uy, nếu không dùng giọng trực tuyến
// (giọng tiếng Anh mặc định sẽ đánh vần sai các từ Na Uy, ví dụ "hva" → h-v-a).
import { store } from './store.js';
import { t } from './i18n.js';

const synth = window.speechSynthesis || null;
const audio = typeof Audio !== 'undefined' ? new Audio() : null;
if (audio) { audio.preload = 'auto'; audio.preservesPitch = true; audio.mozPreservesPitch = true; audio.webkitPreservesPitch = true; }
let voices = [];
let voice = null;
let token = 0;
let lastCancel = 0;
let voicesLoaded = false;
const cancel = () => { lastCancel = Date.now(); synth.cancel(); };

function loadVoices() {
  if (!synth) return;
  const all = synth.getVoices();
  if (all.length) voicesLoaded = true;
  voices = all.filter(v => /^(nb|no|nn)/i.test(v.lang.replace('_', '-')));
  // Ưu tiên giọng đã chọn, rồi giọng Bokmål "chất lượng cao" (Google/Microsoft Online/Natural).
  const want = store.s.settings.voice;
  voice = voices.find(v => v.name === want)
    || voices.find(v => /^nb/i.test(v.lang) && /natural|online|google|premium|enhanced/i.test(v.name))
    || voices.find(v => /^nb/i.test(v.lang)) || voices[0] || null;
}
if (synth) { loadVoices(); synth.onvoiceschanged = loadVoices; }

// 'device' hoặc 'online' theo cài đặt (auto | online | device) và giọng có trên máy.
function mode() {
  const m = store.s.settings.voiceMode || 'auto';
  if (!synth) return 'online';
  if (!audio) return 'device';
  if (m === 'online') return 'online';
  if (m === 'device') return 'device';
  return voices.length ? 'device' : 'online';
}

function speakDevice(text, rate) {
  return new Promise(res => {
    if (!synth) return res();
    let done = false; const fin = () => { if (!done) { done = true; res(); } };
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice ? voice.lang : 'nb-NO';
    if (voice) u.voice = voice;
    u.rate = rate || store.s.settings.rate || 0.9;
    u.onend = fin; u.onerror = fin;
    setTimeout(fin, 3000 + text.length * 170 / u.rate);
    // Safari iOS chỉ cho đọc khi speak() được gọi ngay trong thao tác chạm, nên gọi đồng bộ
    // nếu không có câu đang đọc; chỉ chờ một nhịp sau cancel() khi phải ngắt câu cũ (lỗi Chrome).
    if (synth.speaking || synth.pending) cancel();
    if (Date.now() - lastCancel < 60) setTimeout(() => synth.speak(u), 30); else synth.speak(u);
  });
}

let audioSeq = 0;
function speakOnline(text, rate) {
  return new Promise(res => {
    const my = ++audioSeq;
    let done = false; const fin = () => { if (!done) { done = true; res(); } };
    // Tốc độ: 0.9 trong cài đặt = tốc độ gốc của giọng trực tuyến.
    const pr = Math.min(1.5, Math.max(0.5, (rate || store.s.settings.rate || 0.9) / 0.9));
    try { audio.pause(); } catch (e) { /* */ }
    audio.onended = fin;
    audio.onerror = () => { if (my !== audioSeq) return fin(); speakDevice(text, rate).then(fin); }; // mất mạng: dùng giọng thiết bị
    audio.onloadedmetadata = () => { audio.playbackRate = pr; };
    audio.src = `/api/tts?q=${encodeURIComponent(text.slice(0, 400))}`;
    audio.defaultPlaybackRate = pr; audio.playbackRate = pr;
    setTimeout(fin, 6000 + text.length * 200 / pr);
    // play() được gọi ngay (đồng bộ) để Safari iOS coi là trong thao tác chạm.
    const p = audio.play();
    if (p && p.catch) p.catch(err => { if (my === audioSeq && err && err.name !== 'AbortError') { console.warn('audio', err.name); fin(); } });
  });
}

export const tts = {
  supported: !!(synth || audio),
  voices: () => voices,
  current: () => voice,
  hasNorwegian: () => voices.length > 0,
  voicesLoaded: () => voicesLoaded,
  mode,
  setVoice(name) { store.s.settings.voice = name; store.save(); loadVoices(); },
  setMode(m) { store.s.settings.voiceMode = m; store.save(); },
  stop() { token++; audioSeq++; if (synth) cancel(); if (audio) { try { audio.pause(); } catch (e) { /* */ } } },
  speak(text, rate) {
    const tx = String(text || '').trim();
    if (!tx) return Promise.resolve();
    return mode() === 'online' ? speakOnline(tx, rate) : speakDevice(tx, rate);
  },
  // Đọc nhiều lần / nhiều câu, dừng được giữa chừng.
  async sequence(items, gap = 600) {
    const my = ++token;
    for (const it of items) {
      if (my !== token) return false;
      await this.speak(it.text, it.rate);
      if (my !== token) return false;
      await new Promise(r => setTimeout(r, it.gap ?? gap));
    }
    return my === token;
  },
  token: () => token,
};

// Âm thanh câm rất ngắn (WAV) để "mở khóa" phát âm thanh trên Safari iOS ở lần chạm đầu.
function silentWav() {
  const n = 800; const b = new Uint8Array(44 + n * 2); const v = new DataView(b.buffer);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  let bin = ''; b.forEach(x => { bin += String.fromCharCode(x); }); return 'data:audio/wav;base64,' + btoa(bin);
}

// Safari iOS: mở khóa bộ đọc và phần tử audio ở lần chạm đầu tiên để các câu đọc tự động sau đó phát được tiếng.
{
  const unlock = () => {
    document.removeEventListener('pointerdown', unlock, true); document.removeEventListener('keydown', unlock, true);
    if (synth && !synth.speaking && !synth.pending) { try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } catch (e) { /* */ } }
    if (audio && audio.paused && !audio.src) { try { audio.src = silentWav(); audio.play().catch(() => {}); } catch (e) { /* */ } }
  };
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('keydown', unlock, true);
}

// Nút loa dùng chung: mọi phần tử có data-say sẽ đọc to khi bấm.
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-say]');
  if (!b) return;
  e.preventDefault();
  const slow = b.hasAttribute('data-slow');
  b.classList.add('speaking');
  await tts.speak(b.dataset.say, slow ? 0.55 : undefined);
  b.classList.remove('speaking');
});

// ---------- Nhận dạng giọng nói ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
const DIG = { 0: 'null', 1: 'en', 2: 'to', 3: 'tre', 4: 'fire', 5: 'fem', 6: 'seks', 7: 'sju', 8: 'åtte', 9: 'ni', 10: 'ti', 11: 'elleve', 12: 'tolv', 20: 'tjue', 89: 'åttini' };
const words = s => s.toLowerCase().replace(/[.,!?;:«»"“”()]/g, ' ').split(/\s+/).filter(Boolean).map(w => DIG[w] || w);

export function similarity(target, heard) {
  const t = words(target).filter(w => w !== 'phuong' && w !== 'phương');
  const h = new Set(words(heard));
  if (!t.length) return 1;
  return t.filter(w => h.has(w)).length / t.length;
}

let active = null;
export const stt = {
  supported: !!SR,
  listen(target) {
    return new Promise((resolve, reject) => {
      if (!SR) return reject(new Error('unsupported'));
      if (active) { try { active.abort(); } catch (e) { /* */ } }
      tts.stop();
      const r = new SR(); active = r;
      r.lang = 'nb-NO'; r.interimResults = false; r.maxAlternatives = 4;
      let got = false;
      r.onresult = e => {
        got = true;
        let best = { text: '', score: -1 };
        for (const alt of e.results[0]) { const s = similarity(target, alt.transcript); if (s > best.score) best = { text: alt.transcript, score: s }; }
        resolve(best);
      };
      r.onerror = e => reject(new Error(e.error || 'error'));
      r.onend = () => { active = null; if (!got) reject(new Error('no-speech')); };
      try { r.start(); } catch (e) { reject(e); }
    });
  },
  abort() { if (active) { try { active.abort(); } catch (e) { /* */ } } },
  errorText(err) {
    const m = err?.message;
    if (m === 'unsupported') return t('Trình duyệt chưa hỗ trợ nhận dạng giọng nói. Dùng Chrome hoặc Edge trên máy tính, Chrome trên Android, hoặc Safari trên iPhone.');
    if (m === 'not-allowed' || m === 'service-not-allowed') return t('Trang chưa được phép dùng micro. Hãy cho phép micro trong trình duyệt.');
    if (m === 'no-speech') return t('Chưa nghe thấy gì. Bấm micro và nói to, rõ hơn nhé.');
    if (m === 'aborted') return '';
    return t('Không nhận dạng được lần này, thử lại sau giây lát.');
  },
};

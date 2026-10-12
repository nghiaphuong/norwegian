// Đọc thành tiếng (Web Speech API) và nhận dạng giọng nói tiếng Na Uy.
import { store } from './store.js';
import { t } from './i18n.js';

const synth = window.speechSynthesis || null;
let voices = [];
let voice = null;
let token = 0;

function loadVoices() {
  if (!synth) return;
  voices = synth.getVoices().filter(v => /^(nb|no|nn)\b/i.test(v.lang.replace('_', '-')));
  // Ưu tiên giọng đã chọn, rồi giọng Bokmål "chất lượng cao" (Google/Microsoft Online/Natural).
  const want = store.s.settings.voice;
  voice = voices.find(v => v.name === want)
    || voices.find(v => /^nb/i.test(v.lang) && /natural|online|google|premium|enhanced/i.test(v.name))
    || voices.find(v => /^nb/i.test(v.lang)) || voices[0] || null;
}
if (synth) { loadVoices(); synth.onvoiceschanged = loadVoices; }

export const tts = {
  supported: !!synth,
  voices: () => voices,
  current: () => voice,
  hasNorwegian: () => voices.length > 0,
  setVoice(name) { store.s.settings.voice = name; store.save(); loadVoices(); },
  stop() { token++; if (synth) synth.cancel(); },
  speak(text, rate) {
    return new Promise(res => {
      if (!synth || !String(text || '').trim()) return res();
      synth.cancel();
      let done = false; const fin = () => { if (!done) { done = true; res(); } };
      const u = new SpeechSynthesisUtterance(text);
      u.lang = voice ? voice.lang : 'nb-NO';
      if (voice) u.voice = voice;
      u.rate = rate || store.s.settings.rate || 0.9;
      u.onend = fin; u.onerror = fin;
      setTimeout(fin, 3000 + text.length * 170 / u.rate);
      setTimeout(() => synth.speak(u), 30);
    });
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
      if (synth) synth.cancel();
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

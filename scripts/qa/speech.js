const sleep = ms => new Promise(r => setTimeout(r, ms));
await sleep(1200);
const { tts } = await import('/js/speech.js');
const s = speechSynthesis; let spoken = 0; let started = 0;
const orig = s.speak.bind(s);
s.speak = u => { spoken++; u.addEventListener('start', () => started++); return orig(u); };
const out = {};
// 1) Đọc một câu khi đang rảnh: phải gọi speak() ngay (đồng bộ)
let before = spoken; tts.speak('Hei'); out.syncWhenIdle = spoken === before + 1;
await sleep(50);
// 2) Ngắt câu đang đọc bằng câu mới: phải vẫn đọc câu mới
tts.speak('Dette er en lang setning som tar litt tid å lese høyt for deg.'); await sleep(200);
before = spoken; const p = tts.speak('Ny setning'); await sleep(120); out.afterInterruptSpoke = spoken === before + 1;
// 3) stop() rồi speak() ngay (như khi chuyển trang): vẫn đọc
tts.stop(); before = spoken; tts.speak('Etter stopp'); await sleep(120); out.afterStopSpoke = spoken === before + 1;
// 4) Chuỗi đọc 3 lần hoàn tất
const t = performance.now(); const ok = await tts.sequence([{ text: 'en' }, { text: 'to' }, { text: 'tre' }], 100); out.sequenceDone = ok; out.sequenceMs = Math.round(performance.now() - t);
out.startedEvents = started; out.voices = s.getVoices().length;
tts.stop();
return out;

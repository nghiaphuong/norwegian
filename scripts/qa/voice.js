// Kiểm tra nguồn giọng đọc: thiết bị không có giọng Na Uy phải dùng giọng trực tuyến, không để giọng tiếng Anh đánh vần.
const sleep = ms => new Promise(r => setTimeout(r, ms));
await sleep(1500);
const { tts } = await import('/js/speech.js');
const { store } = await import('/js/store.js');
const out = { voicesNb: tts.voices().map(v => v.name), mode: tts.mode() };
// Ép chế độ trực tuyến và bấm loa từ "hva" như người dùng
tts.setMode('online');
const btn = document.createElement('button'); btn.dataset.say = 'hva'; document.body.appendChild(btn);
let reqs = 0; const po = new PerformanceObserver(l => l.getEntries().forEach(e => { if (e.name.includes('/api/tts')) reqs++; })); po.observe({ type: 'resource', buffered: false });
const t0 = performance.now();
btn.click();
// Chờ âm thanh phát xong (lớp .speaking được gỡ khi xong)
await sleep(50); const startedSpeaking = btn.classList.contains('speaking');
for (let i = 0; i < 100 && btn.classList.contains('speaking'); i++) await sleep(100);
out.online = { startedSpeaking, finished: !btn.classList.contains('speaking'), ms: Math.round(performance.now() - t0), ttsRequests: reqs };
// Câu dài + tốc độ chậm
const r = await fetch('/api/tts?q=' + encodeURIComponent('Hyggelig å møte deg! Hvor kommer du fra?'));
out.longSentence = { status: r.status, type: r.headers.get('content-type'), bytes: (await r.arrayBuffer()).byteLength, cache: r.headers.get('cache-control') };
const t1 = performance.now(); await tts.speak('Takk for maten', 0.55); out.slowMs = Math.round(performance.now() - t1);
// Dừng giữa chừng
tts.speak('Dette er en ganske lang setning som skal stoppes'); await sleep(300); tts.stop(); out.stoppedPaused = document.querySelector('audio') === null;
// Về chế độ tự động
tts.setMode('auto'); out.autoMode = tts.mode();
out.errors = window.__errs || [];
return out;

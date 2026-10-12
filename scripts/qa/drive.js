// Điều khiển trình duyệt headless để chạy bộ kiểm thử trong trang.
// node scripts/qa/drive.js <chrome|edge|opera|firefox> http://localhost:3000/ scripts/qa/suite.js [--mobile]
// Cần: app chạy trên máy với MySQL/MariaDB cục bộ (.env). Kết quả in ra dạng JSON.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BROWSERS = {
  chrome: { kind: 'cdp', exe: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
  edge: { kind: 'cdp', exe: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' },
  opera: { kind: 'cdp', exe: path.join(process.env.LOCALAPPDATA, 'Programs', 'Opera', 'opera.exe') },
  firefox: { kind: 'bidi', exe: 'C:\\Program Files\\Mozilla Firefox\\firefox.exe' },
};
const [name, url, suiteFile, ...flags] = process.argv.slice(2);
const mobile = flags.includes('--mobile');
const B = BROWSERS[name];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const profile = fs.mkdtempSync(path.join(require('os').tmpdir(), `norsk-qa-${name}-`));
const port = 9400 + Math.floor(Math.random() * 400);
const W = mobile ? 375 : 1366; const H = mobile ? 812 : 900;

// Ghi lỗi JS từ lúc bắt đầu tải trang.
const PRELOAD = `(() => { window.__errs = []; const push = m => { try { window.__errs.push(String(m).slice(0, 300)); } catch (e) {} };
  window.addEventListener('error', e => push('error: ' + (e.message || e.target?.src || e.type) + (e.filename ? ' @' + e.filename.split('/').pop() + ':' + e.lineno : '')), true);
  window.addEventListener('unhandledrejection', e => push('rejection: ' + (e.reason?.message || e.reason)));
  const ce = console.error; console.error = (...a) => { push('console.error: ' + a.map(String).join(' ')); ce.apply(console, a); };
  const cw = console.warn; console.warn = (...a) => { const s = a.map(String).join(' '); if (!/i18n/.test(s)) {} else push('i18n: ' + s); cw.apply(console, a); };
})();`;

let proc;
function launch() {
  if (B.kind === 'cdp') {
    proc = spawn(B.exe, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--headless=new', '--no-first-run', '--no-default-browser-check',
      '--disable-extensions', '--mute-audio', `--window-size=${W},${H}`, '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
  } else {
    fs.writeFileSync(path.join(profile, 'user.js'), 'user_pref("remote.active-protocols", 1);\nuser_pref("browser.shell.checkDefaultBrowser", false);\nuser_pref("datareporting.policy.dataSubmissionEnabled", false);\nuser_pref("media.autoplay.default", 0);\n');
    proc = spawn(B.exe, ['--headless', '--remote-debugging-port', String(port), '-profile', profile, '-no-remote', '--width', String(W), '--height', String(H)], { stdio: 'ignore' });
  }
}

function rpc(ws) {
  let id = 0; const pending = new Map(); const events = [];
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else events.push(d); };
  return { send: (method, params = {}, extra = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params, ...extra })); }), events };
}
async function connect(u) {
  for (let i = 0; i < 80; i++) {
    try { const ws = new WebSocket(u); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }); return ws; } catch (e) { await sleep(400); }
  }
  throw new Error('không kết nối được ' + u);
}

async function runCdp(code) {
  let target;
  for (let i = 0; i < 80 && !target; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); target = l.find(t => t.type === 'page'); } catch (e) { /* */ } if (!target) await sleep(400); }
  if (!target) throw new Error('không thấy tab');
  const ws = await connect(target.webSocketDebuggerUrl);
  const { send } = rpc(ws);
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: PRELOAD });
  if (mobile) await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true });
  const t0 = Date.now();
  await send('Page.navigate', { url });
  for (let i = 0; i < 100; i++) { const r = await send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true }); if (r.result?.result?.value === 'complete') break; await sleep(100); }
  const load = Date.now() - t0;
  const r = await send('Runtime.evaluate', { expression: `(async () => { ${code} })().then(r => JSON.stringify(r))`, awaitPromise: true, returnByValue: true, timeout: 900000 });
  if (r.result?.exceptionDetails) return { load, error: r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text };
  return { load, ...JSON.parse(r.result.result.value) };
}

async function runBidi(code) {
  const ws = await connect(`ws://127.0.0.1:${port}/session`);
  const { send } = rpc(ws);
  await send('session.new', { capabilities: {} });
  const ctx = (await send('browsingContext.getTree', {})).result.contexts[0].context;
  await send('script.addPreloadScript', { functionDeclaration: `() => { ${PRELOAD} }` });
  if (mobile) { const v = await send('browsingContext.setViewport', { context: ctx, viewport: { width: W, height: H }, devicePixelRatio: 2 }); if (v.error) console.error('setViewport', v.error, v.message); }
  const t0 = Date.now();
  await send('browsingContext.navigate', { context: ctx, url, wait: 'complete' });
  const load = Date.now() - t0;
  if (mobile) { const v = await send('browsingContext.setViewport', { context: ctx, viewport: { width: W, height: H }, devicePixelRatio: 2 }); if (v.error) console.error('setViewport2', v.error, v.message); await sleep(500); }
  const r = await send('script.evaluate', { expression: `(async () => { ${code} })().then(r => JSON.stringify(r))`, target: { context: ctx }, awaitPromise: true, resultOwnership: 'none' });
  if (r.error) return { load, error: r.message };
  if (r.result?.type === 'exception') return { load, error: r.result.exceptionDetails?.text };
  return { load, ...JSON.parse(r.result.result.value) };
}

(async () => {
  launch();
  const code = fs.readFileSync(suiteFile, 'utf8');
  let res;
  try { res = B.kind === 'cdp' ? await runCdp(code) : await runBidi(code); } catch (e) { res = { error: e.message }; }
  console.log(JSON.stringify({ browser: name, mobile, ...res }, null, 1));
  // Dừng cả cây tiến trình (trình duyệt sinh nhiều tiến trình con, nhất là trên Windows).
  try { if (process.platform === 'win32') require('child_process').execSync(`taskkill /PID ${proc.pid} /T /F`, { stdio: 'ignore' }); else proc.kill('SIGKILL'); } catch (e) { /* */ }
  setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* */ } process.exit(0); }, 2000);
})();

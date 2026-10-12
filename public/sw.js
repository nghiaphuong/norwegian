// Service worker: mở được khi ngoại tuyến. Mạng trước, bộ nhớ đệm dự phòng; API không lưu đệm.
const CACHE = 'norsk-v2';
const SHELL = ['/', '/css/app.css', '/js/app.js', '/js/ui.js', '/js/store.js', '/js/speech.js', '/js/lexicon.js', '/js/engine.js', '/js/course.js', '/js/pron-data.js', '/js/pron-data-en.js', '/js/i18n.js', '/js/lang/en.js',
  '/data/course.json', '/data/glossary.json', '/data/phrasebook.json', '/data/stories.json', '/data/grammar.json', '/icons/icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || (e.request.mode === 'navigate' ? caches.match('/') : undefined)))
  );
});

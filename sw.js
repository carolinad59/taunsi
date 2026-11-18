// Service worker de Taunsi: la app funciona sin conexión tras la primera carga.
// - Red primero (así ves los cambios al desarrollar) con caché de respaldo.
// - Audio (audio/*.mp3): caché primero.
// Sube VERSION si cambias la lista SHELL.
const VERSION = 'taunsi-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'css/styles.css', 'icons/icon.svg', 'icons/icon-192.png',
  'js/main.js', 'js/storage.js', 'js/course.js', 'js/path.js', 'js/lesson.js', 'js/srs.js', 'js/hearts.js', 'js/audio.js',
  'js/speech.js', 'audio/manifest.json', 'js/normalize.js', 'js/ui.js', 'js/util.js',
  ...['common', 'index', 'translate_pick', 'tn_to_es_choice', 'listen_choose', 'listen_type', 'speak', 'match_pairs', 'fill_blank', 'order_words', 'dialogue_reply'].map((n) => `js/exercises/${n}.js`),
  'data/course.json'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(SHELL);
    try { // precachea también las unidades
      const idx = await (await fetch('data/course.json')).json();
      await cache.addAll(idx.units.map((u) => `data/units/${u}.json`));
    } catch { /* se cacheará al usarse */ }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isAudio = new URL(req.url).pathname.includes('/audio/');
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    if (isAudio) {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    }
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch {
      return (await cache.match(req)) || (await cache.match('index.html')) || Response.error();
    }
  })());
});

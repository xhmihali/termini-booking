// Termini service worker: caches the app shell so it opens fast and offline.
// Bump VERSION whenever you change files, so phones pick up the update.
const VERSION = 'termini-v9';
const SHELL = ['./', 'index.html', 'config.js', 'css/styles.css', 'js/i18n.js', 'js/app.js', 'js/db-demo.js', 'js/db-supabase.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'js/vendor/qrcode.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  // Only touch Termini's own caches. Other apps on the same github.io address (e.g. other projects) are never affected.
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('termini-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // never cache API calls (Supabase)
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return; // only Termini's own files
  // Network first, fall back to cache (so updates show up immediately when online)
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});

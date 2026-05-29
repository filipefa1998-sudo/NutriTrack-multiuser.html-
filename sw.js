// NutriTrack Pro — Service Worker
// Caches the app shell so it opens instantly and works offline (your data lives in
// localStorage, so the diary, progress, fasting, etc. all work with no connection).
// API and barcode-lookup calls always go to the network and are never cached.

const CACHE = 'nutritrack-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Never intercept non-GET (API POSTs to the proxy must hit the network untouched)
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Live data sources: always network, never cached
  if (url.hostname === 'api.anthropic.com' ||
      url.hostname === 'world.openfoodfacts.org' ||
      url.hostname.endsWith('workers.dev')) {
    return; // browser handles it normally
  }

  // App navigation: network-first (so updates show when online), fall back to cached shell offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Static assets + CDN (fonts, ZXing): stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

const CACHE_NAME = 'st-flights-v3';
const ASSETS = [
  '/manifest.json',
  '/favicon.svg'
  // NOTE: Do NOT cache '/' (the HTML page) — let it always fetch fresh from server
];

self.addEventListener('install', (e) => {
  // Take control immediately without waiting for old SW to finish
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (e) => {
  // Claim all clients so new SW takes effect on already-open tabs
  e.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // NEVER cache the HTML page — always fetch fresh so React loads correctly
  if (url.pathname === '/' || url.pathname === '' || e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request));
    return;
  }

  // For other assets, cache-first strategy
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});

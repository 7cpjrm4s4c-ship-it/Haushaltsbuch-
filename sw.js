/* Service Worker v6 — Network-first with fallback */
const CACHE = 'hp-v6';
const SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting(); // Activate immediately, don't wait for tabs to close
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks =>
      Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // Take control of all open clients immediately
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Network-first: always try network, fall back to cache
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(e.request).then(c => c || caches.match('./index.html')))
  );
});

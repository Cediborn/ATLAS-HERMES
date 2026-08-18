// Atlas — Service worker.
// Static-app caching so Atlas keeps working offline after the first visit:
// navigations go network-first (fresh HTML), assets are served from cache and
// refreshed in the background (stale-while-revalidate). Bump VERSION when
// deploying a new build so clients drop the old cache and pick it up.

const VERSION = 'atlas-v6';
const CACHE = `atlas-${VERSION}`;
const SHELL = ['./index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;

  // HTML navigations: network first, cached shell as offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(SHELL[0], copy));
          return response;
        })
        .catch(() => caches.match(SHELL[0]))
    );
    return;
  }

  // Everything else (js/css/svg): serve from cache, refresh in background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

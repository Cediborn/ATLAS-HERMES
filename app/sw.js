// Atlas — Service worker.
// Static-app caching so Atlas keeps working offline after the first visit:
// navigations go network-first (fresh HTML), assets are served from cache and
// refreshed in the background (stale-while-revalidate). Bump VERSION when
// deploying a new build so clients drop the old cache and pick it up.

const VERSION = 'atlas-v12';
const CACHE = `atlas-${VERSION}`;
const SHELL = [
  './index.html',
  '../js/main.js',
  '../js/persistence.js',
  '../js/db.js',
  '../js/store.js',
  '../js/config.js',
  '../js/router.js',
  '../js/views.js',
  '../js/components.js',
  '../js/icons.js',
  '../js/form-dialog.js',
  '../js/command-palette.js',
  '../js/notifications.js',
  '../js/sanitize.js',
  '../js/timing.js',
  '../js/scroll-header.js',
  '../js/date-utils.js',
  '../js/theme.js',
  '../js/sidebar.js',
  '../js/topbar.js',
  '../js/luna.js',
  '../js/browser-notifications.js',
  '../js/popover.js',
  '../js/mock-data.js',
  // Project modules
  '../js/projects/view.js',
  '../js/projects/state.js',
  '../js/projects/data.js',
  '../js/projects/components.js',
  '../js/projects/dialog.js',
  // Calendar modules
  '../js/calendar/view.js',
  '../js/calendar/state.js',
  '../js/calendar/data.js',
  '../js/calendar/repository.js',
  '../js/calendar/components.js',
  '../js/calendar/event-panel.js',
  '../js/calendar/mini-calendar.js',
  '../js/calendar/month-view.js',
  '../js/calendar/agenda-view.js',
  '../js/calendar/upcoming-panel.js',
  // Notes modules
  '../js/notes/view.js',
  '../js/notes/state.js',
  '../js/notes/data.js',
  '../js/notes/components.js',
  '../js/notes/editor.js',
  '../js/notes/markdown.js',
  // Habits modules
  '../js/habits/view.js',
  '../js/habits/state.js',
  '../js/habits/data.js',
  '../js/habits/components.js',
  '../js/habits/habit-dialog.js',
  // Goals modules
  '../js/goals/view.js',
  '../js/goals/state.js',
  '../js/goals/data.js',
  '../js/goals/components.js',
  '../js/goals/dialog.js',
  // Learning modules
  '../js/learning/view.js',
  '../js/learning/state.js',
  '../js/learning/data.js',
  '../js/learning/components.js',
  '../js/learning/dialog.js',
  // Finance modules
  '../js/finance/view.js',
  '../js/finance/state.js',
  '../js/finance/data.js',
  '../js/finance/components.js',
  '../js/finance/dialog.js',
  // Books modules
  '../js/books/view.js',
  '../js/books/state.js',
  '../js/books/data.js',
  '../js/books/components.js',
  '../js/books/dialog.js',
  // Coding modules
  '../js/coding/view.js',
  '../js/coding/state.js',
  '../js/coding/data.js',
  '../js/coding/components.js',
  '../js/coding/dialog.js',
  // Shared utilities
  '../js/list-state.js',

  // CSS
  '../css/tokens.css',
  '../css/base.css',
  '../css/app-shell.css',
  '../css/components.css',
  '../css/dashboard.css',
  '../css/projects.css',
  '../css/calendar.css',
  '../css/notes.css',
  '../css/habits.css',
  '../css/goals.css',
  '../css/learning.css',
  '../css/finance.css',
  '../css/books.css',
  '../css/coding.css',
  '../css/luna.css',
  '../css/landing.css',
];

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

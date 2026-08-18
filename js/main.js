// Atlas — App bootstrap. This is the only file that wires modules together;
// every other file stays independent and reusable on its own.

import { navItems } from './config.js';
import { initTheme, setTheme } from './theme.js';
import { getState } from './store.js';
import { renderNav, initSidebarControls } from './sidebar.js';
import { initTopbar } from './topbar.js';
import { initCommandPalette } from './command-palette.js';
import { initRouter, navigate, rerender } from './router.js';
import { initLuna } from './luna.js';
import { hydrate, switchWorkspace } from './persistence.js';
import { syncBrowserNotifications } from './browser-notifications.js';

// Data layer must be ready (IndexedDB hydrated into the in-memory arrays)
// before any view renders — otherwise the first paint would show empty/seed
// state and the router's initial render would read stale arrays.
// Branded splash: the data layer hydrates before the first view paints, so the
// splash covers that gap. Hold it long enough to read, then fade it out.
const MIN_SPLASH_MS = 450;
const bootStart = performance.now();

function hideSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;
  splash.classList.add('is-leaving');
  // Transition is --duration-panel (320ms); drop it from the DOM afterwards.
  setTimeout(() => splash.remove(), 400);
}

async function boot() {
  initTheme();
  renderNav(navItems);
  initSidebarControls({
    onWorkspaceChange: async (workspaceId) => {
      await switchWorkspace(workspaceId);
      rerender();
    },
  });
  initTopbar();

  initLuna();

  initCommandPalette({
    navItems,
    onNavigate: navigate,
    onToggleTheme: cycleTheme,
    onToggleSidebarCollapse: () => document.getElementById('sidebar-collapse-toggle').click(),
  });

  await hydrate();
  initRouter();
  setTimeout(hideSplash, Math.max(0, MIN_SPLASH_MS - (performance.now() - bootStart)));

  registerServiceWorker();

  // Surface real, computed items as system notifications when the toggle in
  // Settings is on and permission is granted. Re-sync whenever the tab becomes
  // visible again so items that arrived while hidden aren't missed.
  syncBrowserNotifications();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncBrowserNotifications();
  });
}

// PWA offline support — only in secure contexts (https or localhost).
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(location.hostname)) return;
  navigator.serviceWorker.register('./sw.js').catch(() => {
    // SW registration failed (private browsing etc.) — app still works online.
  });
}

boot();

function cycleTheme() {
  const order = ['light', 'dark', 'system'];
  const next = order[(order.indexOf(getState().theme) + 1) % order.length];
  setTheme(next);
}

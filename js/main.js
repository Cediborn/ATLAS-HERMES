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
import { initScrollHeader } from './scroll-header.js';
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

function showBootFailure(err) {
  const splash = document.getElementById('splash');
  if (splash) splash.remove();
  const root = document.getElementById('view-root') || document.body;
  root.innerHTML = `
    <div class="boot-failure" role="alert" style="padding:3rem;text-align:center;max-width:480px;margin:4rem auto;font-family:system-ui,sans-serif;">
      <h1 style="font-size:1.5rem;margin-bottom:0.5rem;">Atlas couldn’t start</h1>
      <p style="color:#888;margin-bottom:1rem;">
        Your browser’s local storage may be unavailable or full.
        Try clearing site data or using a different browser profile.
      </p>
      <pre style="background:#1a1a2e;color:#e0e0e0;padding:1rem;border-radius:6px;text-align:left;overflow:auto;font-size:0.85rem;">${String(err && err.message || err)}</pre>
      <button onclick="location.reload()" style="margin-top:1rem;padding:0.5rem 1.5rem;border:none;border-radius:6px;background:#E6C66D;color:#0B0C0F;font-weight:600;cursor:pointer;">Retry</button>
    </div>`;
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

  try {
    await hydrate();
  } catch (err) {
    showBootFailure(err);
    return;
  }
  initRouter();
  initScrollHeader();
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

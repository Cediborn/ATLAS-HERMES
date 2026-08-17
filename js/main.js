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

// Data layer must be ready (IndexedDB hydrated into the in-memory arrays)
// before any view renders — otherwise the first paint would show empty/seed
// state and the router's initial render would read stale arrays.
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
}

boot();

function cycleTheme() {
  const order = ['light', 'dark', 'system'];
  const next = order[(order.indexOf(getState().theme) + 1) % order.length];
  setTheme(next);
}

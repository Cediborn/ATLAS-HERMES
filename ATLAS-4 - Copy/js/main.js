// Atlas — App bootstrap. This is the only file that wires modules together;
// every other file stays independent and reusable on its own.

import { navItems } from './mock-data.js';
import { initTheme, setTheme } from './theme.js';
import { getState } from './store.js';
import { renderNav, initSidebarControls } from './sidebar.js';
import { initTopbar } from './topbar.js';
import { initCommandPalette } from './command-palette.js';
import { initRouter, navigate } from './router.js';

initTheme();
renderNav(navItems);
initSidebarControls();
initTopbar();

initCommandPalette({
  navItems,
  onNavigate: navigate,
  onToggleTheme: cycleTheme,
  onToggleSidebarCollapse: () => document.getElementById('sidebar-collapse-toggle').click(),
});

initRouter();

function cycleTheme() {
  const order = ['light', 'dark', 'system'];
  const next = order[(order.indexOf(getState().theme) + 1) % order.length];
  setTheme(next);
}

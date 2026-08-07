// Atlas — Theme controller. Dark mode is first-class (Foundation §7), not a toggle bolted on.

import { getState, setState, resolvedTheme } from './store.js';

export function applyTheme() {
  document.documentElement.setAttribute('data-theme', resolvedTheme());
}

export function setTheme(theme) {
  setState({ theme });
  applyTheme();
}

export function initTheme() {
  applyTheme();
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (getState().theme === 'system') applyTheme();
    });
  }
}

// Atlas — Minimal observable store.
// Deliberately small and framework-free: this whole file is what becomes
// Zustand (or React Context) once Atlas moves to Next.js (Foundation §4).

const STORAGE_KEY = 'atlas:state';
const PERSISTED_KEYS = ['theme', 'workspaceId', 'sidebarCollapsed'];

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function systemPrefersDark() {
  return typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

const defaults = {
  theme: 'system',          // 'light' | 'dark' | 'system'
  workspaceId: 'personal',
  sidebarCollapsed: false,  // desktop icon-rail state, persisted
  sidebarOpen: false,       // mobile drawer state, intentionally not persisted
};

let state = { ...defaults, ...loadPersisted() };
const listeners = new Set();

export function getState() {
  return state;
}

export function setState(patch) {
  state = { ...state, ...patch };
  persist();
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function persist() {
  try {
    const toSave = {};
    for (const key of PERSISTED_KEYS) toSave[key] = state[key];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // Private browsing / storage disabled — app still runs, just won't remember.
  }
}

export function resolvedTheme() {
  return state.theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : state.theme;
}

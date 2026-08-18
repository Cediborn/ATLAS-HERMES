// Atlas — Timing utilities for async loop lifecycle.
// Extracted from landing.js for testability.

/**
 * Wait for `ms` milliseconds, but resolve immediately if the
 * AbortController has been signaled (tab hidden, loop stopped, etc.).
 */
export function wait(ms, signal) {
  return new Promise((resolve) => {
    if (signal && signal.aborted) { resolve(); return; }
    const id = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener('abort', () => { clearTimeout(id); resolve(); }, { once: true });
    }
  });
}

/**
 * Wait for `ms` ms or until the tab becomes hidden. Returns true
 * if the tab was hidden (caller should break out of the loop).
 *
 * Optionally accepts a `doc` parameter (defaults to `document`) so
 * tests can inject a mock without touching the global.
 */
export function waitOrHidden(ms, signal, doc) {
  const d = doc || document;
  return new Promise((resolve) => {
    if (signal && signal.aborted) { resolve(false); return; }
    let resolved = false;
    const done = (hidden) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timerId);
      resolve(hidden);
    };
    const timerId = setTimeout(() => done(false), ms);
    const onVis = () => { if (d.hidden) done(true); };
    d.addEventListener('visibilitychange', onVis, { once: true });
    if (signal) {
      signal.addEventListener('abort', () => done(false), { once: true });
    }
  });
}

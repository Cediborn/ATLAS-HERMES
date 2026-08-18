// Atlas — Landing page script. Self-contained: doesn't touch the app shell modules.

import { icon } from './icons.js';
import { pillars, heroDemos } from './mock-data.js';
import { initTheme } from './theme.js';
import { wait, waitOrHidden } from './timing.js';
import { esc } from './sanitize.js';

initTheme();

const philosophy = [
  { icon: 'check', title: 'Local-first & persistent', desc: 'Every project, note, habit, and transaction lives in your browser (IndexedDB). Refresh, restart, or go offline \u2014 it\u2019s all still there.' },
  { icon: 'layers', title: 'Workspaces, not folders', desc: 'Personal, University, and Startup are real data scopes \u2014 switch contexts and the whole system follows.' },
  { icon: 'search', title: 'One search, everything', desc: 'The command palette finds projects, tasks, notes, events, goals, and books \u2014 then takes you straight to the item.' },
  { icon: 'sparkle', title: 'LUNA, your local AI', desc: 'Ask LUNA about your day in plain language. It reads your live data on-device \u2014 nothing leaves your machine.' },
];

document.getElementById('philosophy').innerHTML = philosophy
  .map(
    (p) => `
    <div class="philosophy__item">
      <span>${icon(p.icon, { size: 18 })}</span>
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.desc)}</p>
    </div>`
  )
  .join('');

document.getElementById('pillars-grid').innerHTML = pillars
  .map(
    (p) => `
    <div class="pillar-card">
      <span class="pillar-card__icon">${icon(p.icon, { size: 20 })}</span>
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.desc)}</p>
    </div>`
  )
  .join('');

// ---- Hero command-palette demo: cycles through example searches and results ----
const typedEl = document.getElementById('palette-typed');
const resultEl = document.getElementById('palette-result');
const resultIconEl = document.getElementById('palette-result-icon');
const resultTitleEl = document.getElementById('palette-result-title');
const resultTimeEl = document.getElementById('palette-result-time');
const resultTagEl = document.getElementById('palette-result-tag');
const replayBtn = document.getElementById('palette-replay');

// Guard: if any hero element is missing, bail out cleanly.
if (!typedEl || !resultEl || !resultIconEl || !resultTitleEl || !resultTimeEl || !resultTagEl) {
  // No hero demo to run — landing page is still usable.
} else {
  // Respect the user's OS-level reduced-motion preference. When active,
  // show a static example and offer an explicit opt-in control.
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionQuery.matches;

  // State for loop lifecycle
  let loopRunning = false;
  let abortController = null; // AbortController to cancel in-flight waits
  let loopIndex = 0;

  async function typeText(text, signal) {
    typedEl.textContent = '';
    for (const char of text) {
      if (signal && signal.aborted) return;
      typedEl.textContent += char;
      await wait(35, signal);
    }
  }

  function showResult(demo) {
    resultIconEl.innerHTML = icon(demo.icon, { size: 18 });
    resultTitleEl.textContent = demo.resultTitle;
    resultTimeEl.textContent = demo.time;
    resultTagEl.textContent = demo.tag;
  }

  function showStatic() {
    const demo = heroDemos[0];
    typedEl.textContent = demo.typed;
    showResult(demo);
    resultEl.classList.add('is-visible');
  }

  function updateReplayButton() {
    if (!replayBtn) return;
    if (reducedMotion && !loopRunning) {
      replayBtn.hidden = false;
      replayBtn.textContent = '';
      replayBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Play demo</span>';
    } else if (loopRunning && reducedMotion) {
      // While playing in reduced-motion mode, show a stop control
      replayBtn.hidden = false;
      replayBtn.textContent = '';
      replayBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg><span>Stop demo</span>';
    } else {
      replayBtn.hidden = true;
    }
  }

  // --- Loop ---

  async function runDemoLoop() {
    if (loopRunning) return; // guard: prevent duplicate loops
    loopRunning = true;
    abortController = new AbortController();
    const signal = abortController.signal;
    updateReplayButton();

    try {
      let i = loopIndex;
      for (;;) {
        if (signal.aborted) break;
        if (document.hidden) {
          // Wait until the page becomes visible again
          await new Promise((resolve) => {
            const onVis = () => { if (!document.hidden) { document.removeEventListener('visibilitychange', onVis); resolve(); } };
            document.addEventListener('visibilitychange', onVis);
            if (signal) signal.addEventListener('abort', () => { document.removeEventListener('visibilitychange', onVis); resolve(); }, { once: true });
          });
          if (signal.aborted || document.hidden) break;
        }

        const demo = heroDemos[i % heroDemos.length];
        resultEl.classList.remove('is-visible');
        showResult(demo);
        await typeText(demo.typed, signal);
        if (signal.aborted) break;
        const hiddenDuringWait = await waitOrHidden(350, signal);
        if (signal.aborted || hiddenDuringWait) break;
        resultEl.classList.add('is-visible');
        const hiddenDuringResult = await waitOrHidden(2800, signal);
        if (signal.aborted || hiddenDuringResult) break;
        loopIndex = (i + 1);
        i += 1;
      }
    } finally {
      loopRunning = false;
      abortController = null;
      updateReplayButton();
    }
  }

  function stopLoop() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    loopRunning = false;
    updateReplayButton();
  }

  // --- Reduced-motion change listener ---
  motionQuery.addEventListener('change', (e) => {
    reducedMotion = e.matches;
    if (reducedMotion) {
      // User enabled reduced motion — stop the loop, show static
      stopLoop();
      showStatic();
    } else {
      // User disabled reduced motion — start the loop
      loopIndex = 0;
      runDemoLoop();
    }
  });

  // --- Replay button ---
  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      if (loopRunning) {
        stopLoop();
        showStatic();
      } else {
        loopIndex = 0;
        runDemoLoop();
      }
    });
  }

  // --- Pause on tab hidden, resume on visible ---
  document.addEventListener('visibilitychange', () => {
    // The loop itself handles hidden→visible transitions.
    // When visible→hidden during a wait, waitOrHidden resolves
    // immediately and the loop breaks. We re-enter on next visible.
    if (!document.hidden && !loopRunning && !reducedMotion) {
      runDemoLoop();
    }
  });

  // --- Boot ---
  // Start the demo after the DOM is ready (already is, since this is
  // a module — modules are deferred). Use requestAnimationFrame to
  // ensure the first paint has happened.
  requestAnimationFrame(() => {
    if (reducedMotion) {
      showStatic();
      updateReplayButton();
    } else {
      runDemoLoop();
    }
  });
}

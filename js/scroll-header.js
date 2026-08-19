// Atlas — Smart scroll header.
// Hides the topbar when the user scrolls down and reveals it when scrolling up.
// The scroll container is `.view-root` (overflow-y: auto), NOT window.
//
// Works across every module because it attaches to the shared topbar element
// and the shared scroll container — no per-module duplication needed.

import { waitOrHidden } from './timing.js';

// Minimum pixels scrolled before the direction change triggers a show/hide.
// Prevents flickering from tiny scroll gestures or trackpad inertia.
const SCROLL_THRESHOLD = 8;

let topbar = null;
let scrollContainer = null;
let lastScrollTop = 0;
let initialized = false;
let reducedMotion = false;

// State: 'visible' | 'hidden'
let headerState = 'visible';

function applyHeaderVisibility(animate = true) {
  if (!topbar) return;

  if (!animate || reducedMotion) {
    // Reduced motion: skip the transform animation, just toggle a class
    topbar.classList.toggle('topbar--hidden', headerState === 'hidden');
    topbar.style.transform = '';
    return;
  }

  if (headerState === 'hidden') {
    topbar.classList.add('topbar--hidden');
    topbar.style.transform = 'translateY(-100%)';
  } else {
    topbar.classList.remove('topbar--hidden');
    topbar.style.transform = 'translateY(0)';
  }
}

function onScroll() {
  if (!scrollContainer || !topbar) return;

  const scrollTop = scrollContainer.scrollTop;
  const delta = scrollTop - lastScrollTop;

  // At the very top — always show the header
  if (scrollTop <= 0) {
    if (headerState !== 'visible') {
      headerState = 'visible';
      applyHeaderVisibility(true);
    }
    lastScrollTop = scrollTop;
    return;
  }

  // Scrolling down (positive delta, past threshold)
  if (delta > SCROLL_THRESHOLD && headerState !== 'hidden') {
    headerState = 'hidden';
    applyHeaderVisibility(true);
  }
  // Scrolling up (negative delta, past threshold)
  else if (delta < -SCROLL_THRESHOLD && headerState !== 'visible') {
    headerState = 'visible';
    applyHeaderVisibility(true);
  }

  lastScrollTop = scrollTop;
}

/**
 * Initialize the smart scroll header.
 * Should be called once after boot, once the topbar and view-root exist.
 * Safe to call multiple times — only attaches listeners once.
 */
export function initScrollHeader() {
  if (initialized) return;

  topbar = document.querySelector('.topbar');
  scrollContainer = document.getElementById('view-root');
  if (!topbar || !scrollContainer) return;

  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reset state when switching routes (view-root may re-render content)
  lastScrollTop = scrollContainer.scrollTop;
  headerState = 'visible';
  applyHeaderVisibility(false); // ensure visible on init

  scrollContainer.addEventListener('scroll', onScroll, { passive: true });
  initialized = true;

  // Listen for reduced-motion changes at runtime
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mqHandler = (e) => {
    reducedMotion = e.matches;
    if (reducedMotion) {
      // Immediately remove transform so reduced-motion users never see it
      topbar.style.transform = '';
      topbar.classList.remove('topbar--hidden');
      headerState = 'visible';
    }
  };
  if (mq.addEventListener) mq.addEventListener('change', mqHandler);
  else mq.addListener(mqHandler);
}

/**
 * Reset the header to visible state.
 * Called when the route changes so the new module starts with the header shown.
 */
export function resetScrollHeader() {
  headerState = 'visible';
  if (topbar) {
    topbar.style.transform = '';
    topbar.classList.remove('topbar--hidden');
  }
  if (scrollContainer) {
    lastScrollTop = scrollContainer.scrollTop;
  }
}

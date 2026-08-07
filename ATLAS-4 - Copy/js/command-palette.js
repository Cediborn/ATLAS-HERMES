// Atlas — Command palette. The "spine of the app" (Foundation §8): one
// surface for both search and action, opened via ⌘K or the topbar search pill.

import { icon } from './icons.js';

const els = {};
let commands = [];
let filtered = [];
let activeIndex = 0;
let lastFocused = null;

export function initCommandPalette({ navItems, onNavigate, onToggleTheme, onToggleSidebarCollapse }) {
  els.overlay = document.getElementById('cp-overlay');
  els.input = document.getElementById('cp-input');
  els.list = document.getElementById('cp-list');

  const navCommands = navItems.map((item) => ({
    id: `nav-${item.id}`,
    label: `Go to ${item.label}`,
    iconName: item.icon,
    run: () => onNavigate(item.id),
  }));

  commands = [
    ...navCommands,
    { id: 'action-theme', label: 'Toggle theme', iconName: 'sun', run: onToggleTheme },
    { id: 'action-sidebar', label: 'Toggle sidebar width', iconName: 'menu', run: onToggleSidebarCollapse },
  ];

  document.getElementById('search-trigger').addEventListener('click', open);

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      els.overlay.hidden ? open() : close();
    } else if (e.key === 'Escape' && !els.overlay.hidden) {
      close();
    }
  });

  els.overlay.addEventListener('click', (e) => {
    if (e.target === els.overlay) close();
  });

  els.input.addEventListener('input', () => render(els.input.value));
  els.input.addEventListener('keydown', onInputKeydown);
  els.list.addEventListener('click', (e) => {
    const opt = e.target.closest('[data-index]');
    if (opt) runCommand(filtered[Number(opt.dataset.index)]);
  });
}

function open() {
  lastFocused = document.activeElement;
  els.overlay.hidden = false;
  els.input.value = '';
  render('');
  requestAnimationFrame(() => els.input.focus());
}

function close() {
  els.overlay.hidden = true;
  if (lastFocused && lastFocused.focus) lastFocused.focus();
}

function render(query) {
  const q = query.trim().toLowerCase();
  filtered = q ? commands.filter((c) => c.label.toLowerCase().includes(q)) : commands;
  activeIndex = 0;

  if (!filtered.length) {
    els.list.innerHTML = '<li class="command-palette__empty">No matches</li>';
    els.input.removeAttribute('aria-activedescendant');
    return;
  }

  els.list.innerHTML = filtered
    .map(
      (c, i) => `
      <li id="cp-option-${i}" role="option" data-index="${i}" class="menu__item" aria-selected="${i === activeIndex}">
        ${icon(c.iconName, { size: 18 })}<span>${c.label}</span>
      </li>`
    )
    .join('');

  els.input.setAttribute('aria-activedescendant', `cp-option-${activeIndex}`);
}

function onInputKeydown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    move(1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    move(-1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (filtered[activeIndex]) runCommand(filtered[activeIndex]);
  } else if (e.key === 'Tab') {
    e.preventDefault(); // the input is the only focusable control by design
  }
}

function move(delta) {
  if (!filtered.length) return;
  document.getElementById(`cp-option-${activeIndex}`)?.setAttribute('aria-selected', 'false');
  activeIndex = (activeIndex + delta + filtered.length) % filtered.length;
  const next = document.getElementById(`cp-option-${activeIndex}`);
  if (next) {
    next.setAttribute('aria-selected', 'true');
    next.scrollIntoView({ block: 'nearest' });
  }
  els.input.setAttribute('aria-activedescendant', `cp-option-${activeIndex}`);
}

function runCommand(cmd) {
  close();
  cmd.run();
}

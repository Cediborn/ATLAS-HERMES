// Atlas — Command palette. The "spine of the app" (Foundation §8): one
// surface for search, actions, and navigation, opened via ⌘K or the topbar
// search pill. Besides nav/actions it now searches real user content across
// every module (projects, tasks, notes, events, goals, books, learning,
// habits) and offers real create commands for each module.

import { icon } from './icons.js';

const els = {};
let commands = [];
let filtered = [];
let activeIndex = 0;
let lastFocused = null;

// ---- Content search sources (read live from the data layer) ----
function contentResults(q) {
  const needle = q.toLowerCase();
  const out = [];
  const push = (group, iconName, label, route, id) => {
    if (label && label.toLowerCase().includes(needle)) {
      out.push({ id: id || `${group}-${label}`, label, iconName, group, run: () => onNavigate(route), route });
    }
  };

  // Projects + their tasks
  for (const p of projectsList()) {
    push('Projects', 'folder', p.title, 'projects');
    for (const t of p.tasks || []) push('Tasks', 'check', `${t.title} · ${p.title}`, 'projects');
  }
  // Notes
  for (const n of notesList()) push('Notes', 'fileText', n.title, 'notes');
  // Native calendar events (recurring series surface by their base title)
  for (const e of eventsList()) push('Calendar', 'calendar', e.title, 'calendar');
  // Goals
  for (const g of goalsList()) push('Goals', 'target', g.title, 'goals');
  // Books
  for (const b of booksList()) push('Books', 'book', `${b.title} — ${b.author}`, 'books');
  // Learning resources
  for (const r of resourcesList()) push('Learning', 'bookOpen', r.title, 'learning');
  // Habits
  for (const h of habitsList()) push('Habits', 'flame', h.title, 'habits');
  // Coding items
  for (const c of codingList()) push('Coding', 'code', c.title, 'coding');

  return out;
}

// Lazy getters so the palette doesn't drag every module in at boot.
function projectsList() { return import('./projects/data.js').then((m) => m.projects); }
function notesList() { return import('./notes/data.js').then((m) => m.notes); }
function eventsList() { return import('./calendar/data.js').then((m) => m.events); }
function goalsList() { return import('./goals/data.js').then((m) => m.goals); }
function booksList() { return import('./books/data.js').then((m) => m.books); }
function resourcesList() { return import('./learning/data.js').then((m) => m.resources); }
function habitsList() { return import('./habits/data.js').then((m) => m.habits); }
function codingList() { return import('./coding/data.js').then((m) => m.codingItems); }

// ---- Real create commands (each opens the module's actual create dialog) ----
const CREATE_COMMANDS = [
  { id: 'create-project', label: 'New Project', iconName: 'folder', open: () => import('./projects/dialog.js').then((m) => m.openProjectDialog('create', null, () => {})) },
  { id: 'create-note', label: 'New Note', iconName: 'fileText', open: () => {
    onNavigate('notes');
    const tryClick = () => {
      const btn = document.getElementById('notes-new');
      if (btn) btn.click();
      else setTimeout(tryClick, 100);
    };
    setTimeout(tryClick, 100);
  } },
  { id: 'create-event', label: 'New Event', iconName: 'calendar', open: () => import('./calendar/event-panel.js').then((m) => m.openEventDialog('create', new Date().toISOString().slice(0, 10))) },
  { id: 'create-habit', label: 'New Habit', iconName: 'flame', open: () => import('./habits/habit-dialog.js').then((m) => m.openHabitDialog('create', null, () => {})) },
  { id: 'create-goal', label: 'New Goal', iconName: 'target', open: () => import('./goals/dialog.js').then((m) => m.openGoalDialog('create', null, () => {})) },
  { id: 'create-resource', label: 'Add Learning Resource', iconName: 'bookOpen', open: () => import('./learning/dialog.js').then((m) => m.openResourceDialog('create', null, () => {})) },
  { id: 'create-transaction', label: 'New Transaction', iconName: 'wallet', open: () => import('./finance/dialog.js').then((m) => m.openTransactionDialog('create', null, () => {})) },
  { id: 'create-book', label: 'New Book', iconName: 'book', open: () => import('./books/dialog.js').then((m) => m.openBookDialog('create', null, () => {})) },
  { id: 'create-coding', label: 'New Coding Item', iconName: 'code', open: () => import('./coding/dialog.js').then((m) => m.openCodingDialog('create', null, () => {})) },
];

let onNavigate = () => {};

export function initCommandPalette({ navItems, onNavigate: nav, onToggleTheme, onToggleSidebarCollapse }) {
  onNavigate = nav;
  els.overlay = document.getElementById('cp-overlay');
  els.input = document.getElementById('cp-input');
  els.list = document.getElementById('cp-list');

  const navCommands = navItems.map((item) => ({
    id: `nav-${item.id}`,
    label: `Go to ${item.label}`,
    iconName: item.icon,
    run: () => onNavigate(item.id),
  }));

  const actionCommands = [
    ...CREATE_COMMANDS.map((c) => ({ ...c, run: () => c.open() })),
    { id: 'action-theme', label: 'Toggle theme', iconName: 'sun', run: onToggleTheme },
    { id: 'action-sidebar', label: 'Toggle sidebar width', iconName: 'menu', run: onToggleSidebarCollapse },
  ];

  commands = [...navCommands, ...actionCommands];

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

  if (q) {
    // Content search is async (module chunks load on demand) — render the
    // static matches immediately, then merge content results in.
    renderStatic(q, []);
    contentResults(q).then((content) => {
      if (els.input.value.trim().toLowerCase() !== q) return; // query changed since
      renderStatic(q, content);
    });
    return;
  }

  filtered = commands;
  renderList(filtered);
}

function renderStatic(q, content) {
  const staticMatches = commands.filter((c) => c.label.toLowerCase().includes(q));
  // Content results rank above generic actions when the query actually hits them.
  filtered = [...content, ...staticMatches];
  renderList(filtered);
}

function renderList(list) {
  activeIndex = 0;

  if (!list.length) {
    els.list.innerHTML = '<li class="command-palette__empty">No matches</li>';
    els.input.removeAttribute('aria-activedescendant');
    return;
  }

  let html = '';
  let lastGroup = null;
  let index = 0;
  for (const c of list) {
    if (c.group && c.group !== lastGroup) {
      html += `<li class="command-palette__group" aria-hidden="true">${c.group}</li>`;
      lastGroup = c.group;
    }
    html += `
      <li id="cp-option-${index}" role="option" data-index="${index}" class="menu__item" aria-selected="${index === activeIndex}">
        ${icon(c.iconName, { size: 18 })}<span>${c.label}</span>
      </li>`;
    index += 1;
  }
  els.list.innerHTML = html;
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

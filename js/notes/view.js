// Atlas — Notes page controller. Same division of labor as projects/view.js:
// this is the only file in the module that touches the DOM.

import { icon } from '../icons.js';
import { createPopover } from '../popover.js';
import { ActionMenu } from '../components.js';
import { saveNotes } from '../persistence.js';
import { notes, CATEGORIES, CATEGORY_CONFIG, allNoteTags, createNoteId } from './data.js';
import {
  getState,
  setState,
  getVisibleNotes,
  invalidateVisibleNotesCache,
  resetFilters,
  SORT_OPTIONS,
  timeAgo,
} from './state.js';
import { NoteCard, NoteListRow, NoteEmptyState, NoteSkeleton } from './components.js';
import { initEditor, openEditor } from './editor.js';

export function renderNotes(container) {
  container.innerHTML = `
    <div class="notes-page">
      <aside class="notes-sidebar" aria-label="Notes navigation">
        <div class="notes-sidebar__section">
          <h4>Recent</h4>
          <div id="notes-sidebar-recent"></div>
        </div>
        <div class="notes-sidebar__section">
          <h4>Categories</h4>
          <div id="notes-sidebar-categories"></div>
        </div>
        <div class="notes-sidebar__section">
          <h4>Tags</h4>
          <div class="notes-sidebar__tags" id="notes-sidebar-tags"></div>
        </div>
      </aside>

      <div class="notes-main">
        <div class="notes-toolbar">
          <label class="toolbar-search" for="notes-search">
            ${icon('search', { size: 16 })}
            <input type="text" id="notes-search" placeholder="Search notes\u2026" autocomplete="off" />
          </label>

          <button type="button" class="btn btn--primary" id="notes-new">${icon('fileText', { size: 16 })}<span>New Note</span></button>

          <div class="toolbar-spacer"></div>

          <div class="view-switcher" role="tablist" aria-label="View">
            <button type="button" class="view-switcher__option is-active" data-view="grid" role="tab" aria-selected="true">${icon('grid', { size: 15 })}<span>Grid</span></button>
            <button type="button" class="view-switcher__option" data-view="list" role="tab" aria-selected="false">${icon('layers', { size: 15 })}<span>List</span></button>
          </div>

          <div class="toolbar-popover">
            <button type="button" class="btn btn--secondary" id="notes-filter-trigger">
              ${icon('filter', { size: 15 })}<span>Filter</span><span class="badge badge--accent" id="notes-filter-count" hidden></span>
            </button>
            <div class="menu projects-filter-panel" id="notes-filter-panel" hidden></div>
          </div>

          <div class="toolbar-popover">
            <button type="button" class="btn btn--secondary" id="notes-sort-trigger">${icon('sort', { size: 15 })}<span>Sort</span></button>
            <div class="menu" id="notes-sort-panel" hidden></div>
          </div>
        </div>

        <div id="notes-content"></div>
      </div>
    </div>`;

  initSidebarInteractions();
  initToolbar();
  initContentInteractions();
  initEditor(container, {
    onChange: () => {
      invalidateVisibleNotesCache();
      renderContent();
      renderSidebar();
    },
    onDiscardEmpty: (note) => {
      const idx = notes.findIndex((n) => n.id === note.id);
      if (idx !== -1) notes.splice(idx, 1);
      saveNotes();
      invalidateVisibleNotesCache();
      renderContent();
      renderSidebar();
    },
    onDelete: (note) => {
      const idx = notes.findIndex((n) => n.id === note.id);
      if (idx !== -1) notes.splice(idx, 1);
      saveNotes();
      invalidateVisibleNotesCache();
      renderContent();
      renderSidebar();
    },
  });

  renderSidebar();
  updateFilterCount();
  renderContent();
}

export function renderNotesSkeleton(container) {
  container.innerHTML = `<div class="notes-page"><div class="notes-main"><div class="notes-grid">${NoteSkeleton({ count: 8 })}</div></div></div>`;
}

// ================= CONTENT (Grid / List dispatch) =================
function renderContent() {
  const contentEl = document.getElementById('notes-content');
  const visible = getVisibleNotes(notes, getState());

  if (!visible.length) {
    contentEl.className = 'notes-empty-wrap';
    contentEl.innerHTML = NoteEmptyState({ hasFilters: hasActiveFilters() });
    return;
  }

  if (getState().viewMode === 'list') {
    contentEl.className = 'notes-list';
    contentEl.innerHTML = visible.map((n) => NoteListRow({ note: n })).join('');
  } else {
    contentEl.className = 'notes-grid';
    contentEl.innerHTML = visible.map((n) => NoteCard({ note: n })).join('');
  }
}

function hasActiveFilters() {
  const f = getState();
  return Boolean(f.search || f.categoryFilter.size || f.tagFilter.size || f.favoritesOnly || f.pinnedOnly);
}

function initContentInteractions() {
  const content = document.getElementById('notes-content');
  content.addEventListener('click', (e) => {
    const actionItem = e.target.closest('[data-action]');
    if (actionItem) {
      handleQuickAction(actionItem.closest('.action-menu'), actionItem.dataset.action);
      closeAllActionMenus();
      return;
    }

    const menuTrigger = e.target.closest('.action-menu__trigger');
    if (menuTrigger) {
      const panel = menuTrigger.nextElementSibling;
      const wasOpen = !panel.hidden;
      closeAllActionMenus();
      if (!wasOpen) {
        panel.hidden = false;
        menuTrigger.setAttribute('aria-expanded', 'true');
      }
      return;
    }

    const tagBtn = e.target.closest('.tag-chip');
    if (tagBtn) {
      setState({ tagFilter: new Set([tagBtn.dataset.tag]) });
      renderSidebar();
      renderContent();
      updateFilterCount();
      return;
    }

    const item = e.target.closest('.note-card, .note-list-row');
    if (item) openEditor(notes.find((n) => n.id === item.dataset.id));
  });

  content.addEventListener('keydown', (e) => {
    const item = e.target.closest('.note-card, .note-list-row');
    if (item && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openEditor(notes.find((n) => n.id === item.dataset.id));
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.action-menu')) closeAllActionMenus();
  });
}

function closeAllActionMenus() {
  document.querySelectorAll('.action-menu__panel').forEach((p) => { p.hidden = true; });
  document.querySelectorAll('.action-menu__trigger').forEach((b) => b.setAttribute('aria-expanded', 'false'));
}

function handleQuickAction(menuEl, action) {
  const trigger = menuEl?.querySelector('.action-menu__trigger');
  const n = notes.find((note) => note.id === trigger?.dataset.id);
  if (!n) return;
  if (action === 'favorite') n.favorite = !n.favorite;
  else if (action === 'pin') n.pinned = !n.pinned;
  else if (action === 'archive') n.archived = !n.archived;
  saveNotes();
  invalidateVisibleNotesCache();
  renderContent();
  renderSidebar();
}

// ================= SIDEBAR =================
function renderSidebar() {
  renderRecent();
  renderCategories();
  renderTags();
}

function renderRecent() {
  const recent = notes
    .filter((n) => !n.archived)
    .slice()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);

  document.getElementById('notes-sidebar-recent').innerHTML = recent.length
    ? recent
        .map(
          (n) => `
      <button type="button" class="notes-sidebar__item" data-open-note="${n.id}">
        <span class="notes-sidebar__item-title">${n.title}</span>
        <span class="notes-sidebar__item-meta">${timeAgo(n.updatedAt)}</span>
      </button>`
        )
        .join('')
    : '<p class="notes-sidebar__empty">Nothing yet.</p>';
}

function renderCategories() {
  const active = getState().categoryFilter;
  document.getElementById('notes-sidebar-categories').innerHTML = CATEGORIES.map((c) => {
    const count = notes.filter((n) => n.category === c && !n.archived).length;
    const cfg = CATEGORY_CONFIG[c];
    return `
      <button type="button" class="notes-sidebar__item notes-sidebar__item--category${active.has(c) ? ' is-active' : ''}" data-category="${c}">
        <span class="notes-sidebar__item-icon notes-sidebar__item-icon--${cfg.color}">${icon(cfg.icon, { size: 14 })}</span>
        <span class="notes-sidebar__item-title">${c}</span>
        <span class="notes-sidebar__item-count">${count}</span>
      </button>`;
  }).join('');
}

function renderTags() {
  const active = getState().tagFilter;
  document.getElementById('notes-sidebar-tags').innerHTML = allNoteTags().map(
    (t) => `<button type="button" class="tag-chip${active.has(t) ? ' is-active' : ''}" data-tag="${t}">${t}</button>`
  ).join('');
}

function initSidebarInteractions() {
  document.getElementById('notes-sidebar-recent').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open-note]');
    if (btn) {
      const note = notes.find((n) => n.id === btn.dataset.openNote);
      if (note) openEditor(note);
    }
  });

  document.getElementById('notes-sidebar-categories').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-category]');
    if (!btn) return;
    const cat = btn.dataset.category;
    const current = getState().categoryFilter;
    setState({ categoryFilter: current.has(cat) && current.size === 1 ? new Set() : new Set([cat]) });
    renderSidebar();
    renderContent();
    updateFilterCount();
  });

  document.getElementById('notes-sidebar-tags').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tag]');
    if (!btn) return;
    const tag = btn.dataset.tag;
    const current = getState().tagFilter;
    setState({ tagFilter: current.has(tag) && current.size === 1 ? new Set() : new Set([tag]) });
    renderSidebar();
    renderContent();
    updateFilterCount();
  });
}

// ================= TOOLBAR =================
function initToolbar() {
  const searchInput = document.getElementById('notes-search');
  searchInput.addEventListener('input', () => {
    setState({ search: searchInput.value });
    renderContent();
  });

  document.getElementById('notes-new').addEventListener('click', createAndOpenNewNote);

  document.querySelectorAll('.view-switcher__option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      setState({ viewMode: view });
      document.querySelectorAll('.view-switcher__option').forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', String(active));
      });
      renderContent();
    });
  });

  initFilterPopover();
  initSortPopover();
}

function createAndOpenNewNote() {
  const note = {
    id: createNoteId(),
    title: '',
    content: '',
    category: CATEGORIES[0],
    tags: [],
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
    pinned: false,
    favorite: false,
    archived: false,
  };
  notes.unshift(note);
  saveNotes();
  invalidateVisibleNotesCache();
  openEditor(note);
}

function filterCheckbox(type, value, checked, label) {
  return `
    <label class="menu__item filter-checkbox">
      <input type="checkbox" data-filter-type="${type}" value="${value || ''}" ${checked ? 'checked' : ''} />
      <span>${label || value}</span>
    </label>`;
}

function toggleSetFilter(key, value, checked) {
  const current = new Set(getState()[key]);
  if (checked) current.add(value);
  else current.delete(value);
  setState({ [key]: current });
}

function initFilterPopover() {
  const trigger = document.getElementById('notes-filter-trigger');
  const panel = document.getElementById('notes-filter-panel');

  function render() {
    const f = getState();
    panel.innerHTML = `
      <div class="menu__label">Category</div>
      ${CATEGORIES.map((c) => filterCheckbox('category', c, f.categoryFilter.has(c))).join('')}
      <div class="menu__divider"></div>
      <div class="menu__label">Tags</div>
      ${allNoteTags().map((t) => filterCheckbox('tag', t, f.tagFilter.has(t))).join('')}
      <div class="menu__divider"></div>
      ${filterCheckbox('favoritesOnly', '', f.favoritesOnly, 'Favorites only')}
      ${filterCheckbox('pinnedOnly', '', f.pinnedOnly, 'Pinned only')}
      ${filterCheckbox('showArchived', '', f.showArchived, 'Show archived')}
      <div class="menu__divider"></div>
      <button type="button" class="menu__item" id="notes-filter-clear">${icon('x', { size: 16 })}<span>Clear filters</span></button>
    `;
  }

  createPopover({ trigger, panel, onOpenRender: render });

  panel.addEventListener('change', (e) => {
    const cb = e.target;
    const type = cb.dataset.filterType;
    if (type === 'category') toggleSetFilter('categoryFilter', cb.value, cb.checked);
    else if (type === 'tag') toggleSetFilter('tagFilter', cb.value, cb.checked);
    else if (type === 'favoritesOnly') setState({ favoritesOnly: cb.checked });
    else if (type === 'pinnedOnly') setState({ pinnedOnly: cb.checked });
    else if (type === 'showArchived') setState({ showArchived: cb.checked });
    renderSidebar();
    renderContent();
    updateFilterCount();
  });

  panel.addEventListener('click', (e) => {
    if (e.target.closest('#notes-filter-clear')) {
      resetFilters();
      render();
      renderSidebar();
      renderContent();
      updateFilterCount();
    }
  });
}

function updateFilterCount() {
  const f = getState();
  const count = f.categoryFilter.size + f.tagFilter.size + (f.favoritesOnly ? 1 : 0) + (f.pinnedOnly ? 1 : 0);
  const badge = document.getElementById('notes-filter-count');
  badge.hidden = count === 0;
  badge.textContent = String(count);
}

function initSortPopover() {
  const trigger = document.getElementById('notes-sort-trigger');
  const panel = document.getElementById('notes-sort-panel');

  function render() {
    const current = getState().sortBy;
    panel.innerHTML = SORT_OPTIONS.map(
      (opt) => `
      <button type="button" class="menu__item" data-sort="${opt.id}" aria-selected="${opt.id === current}">
        ${opt.id === current ? icon('check', { size: 16 }) : '<span class="menu__item-spacer"></span>'}
        <span>${opt.label}</span>
      </button>`
    ).join('');
  }

  const popover = createPopover({ trigger, panel, onOpenRender: render });

  panel.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sort]');
    if (btn) {
      setState({ sortBy: btn.dataset.sort });
      renderContent();
      popover.close();
    }
  });
}

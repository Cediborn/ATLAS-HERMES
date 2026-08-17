// Atlas — Books page controller. The only file in the module that touches the
// DOM or wires events; data.js/state.js/components.js stay pure.

import { icon } from '../icons.js';
import { createPopover } from '../popover.js';
import { StatCard, SectionCard, Badge, emptyState } from '../components.js';
import { navigate } from '../router.js';
import { saveBooks } from '../persistence.js';
import { books, BOOK_GENRES, BOOK_STATUSES, GENRE_CONFIG, BOOK_STATUS_CONFIG } from './data.js';
import {
  getState,
  setState,
  getVisibleBooks,
  invalidateVisibleBooksCache,
  resetFilters,
  computeBookStats,
  statusDistribution,
  genreDistribution,
  pagesRemaining,
  enrichBook,
  SORT_OPTIONS,
  formatDate,
  timeAgo,
} from './state.js';
import {
  BookCard,
  BookRow,
  BookHeader,
  BookProgress,
  BookSkeleton,
  BookEmptyState,
  BookGenre,
} from './components.js';
import { openBookDialog } from './dialog.js';
import { goals } from '../goals/data.js';
import { habits } from '../habits/data.js';

export function renderBooks(container) {
  container.innerHTML = `
    <div class="books-page">
      <div class="books-toolbar">
        <label class="toolbar-search" for="books-search">
          ${icon('search', { size: 16 })}
          <input type="text" id="books-search" placeholder="Search books\u2026" autocomplete="off" />
        </label>

        <button type="button" class="btn btn--primary books-toolbar__new" id="books-new">
          ${icon('plus', { size: 16 })}<span>New Book</span>
        </button>

        <div class="toolbar-spacer"></div>

        <div class="view-switcher" role="tablist" aria-label="View">
          <button type="button" class="view-switcher__option is-active" role="tab" aria-selected="true" data-view="grid">${icon('grid', { size: 15 })}<span>Grid</span></button>
          <button type="button" class="view-switcher__option" role="tab" aria-selected="false" data-view="list">${icon('checklist', { size: 15 })}<span>List</span></button>
        </div>

        <div class="toolbar-popover">
          <button type="button" class="btn btn--secondary" id="books-filter-trigger">
            ${icon('filter', { size: 15 })}<span>Filter</span><span class="badge badge--accent" id="books-filter-count" hidden></span>
          </button>
          <div class="menu books-filter-panel" id="books-filter-panel" hidden></div>
        </div>

        <div class="toolbar-popover">
          <button type="button" class="btn btn--secondary" id="books-sort-trigger">${icon('sort', { size: 15 })}<span>Sort</span></button>
          <div class="menu" id="books-sort-panel" hidden></div>
        </div>

        <div class="toolbar-popover">
          <button type="button" class="icon-btn" id="books-more-trigger" aria-label="More actions">${icon('moreHorizontal', { size: 18 })}</button>
          <div class="menu menu--right" id="books-more-panel" hidden></div>
        </div>
      </div>

      <div class="books-stats" id="books-stats"></div>

      <div class="books-charts" id="books-charts"></div>

      <div class="books-view" id="books-view"></div>
    </div>

    <div class="overlay book-detail-overlay" id="book-detail-overlay" hidden>
      <aside class="book-detail-panel" role="dialog" aria-modal="true" aria-label="Book details" id="book-detail-panel"></aside>
    </div>
  `;

  initToolbar();
  initViewSwitcher();
  initDetailPanel();
  initPanelInteractions();
  renderStats();
  renderCharts();
  renderView();
}

export function renderBooksSkeleton(container) {
  container.innerHTML = `<div class="books-page"><div class="books-view">${BookSkeleton({ count: 6 })}</div></div>`;
}

// ================= STATS + CHARTS =================
function renderStats() {
  const el = document.getElementById('books-stats');
  const s = computeBookStats(books);
  el.innerHTML = [
    StatCard({ title: 'Currently reading', value: String(s.reading.length), icon: 'bookOpen', accent: 'accent' }),
    StatCard({ title: 'Finished', value: String(s.finished.length), icon: 'check', accent: 'success' }),
    StatCard({ title: 'Pages read', value: String(s.pagesRead), icon: 'layers', accent: 'warning' }),
    StatCard({ title: 'Avg rating', value: s.avgRating ? `${s.avgRating}` : '\u2014', icon: 'star', accent: 'warning' }),
  ].join('');
}

function renderCharts() {
  const el = document.getElementById('books-charts');
  const byStatus = statusDistribution(books);
  const byGenre = genreDistribution(books);

  const statusBody = `
    <div class="book-status-chart">
      ${byStatus
        .map(
          (s) => `
        <div class="book-status-chart__row">
          <span class="book-status-chart__label">${s.status}</span>
          <div class="book-status-chart__track">
            <div class="book-status-chart__fill book-status-chart__fill--${(BOOK_STATUS_CONFIG[s.status] || { color: 'neutral' }).color}" style="width:${s.pct}%"></div>
          </div>
          <span class="book-status-chart__count">${s.count}</span>
        </div>`
        )
        .join('')}
    </div>`;

  const genreBody = byGenre.length
    ? byGenre
        .map(
          (g) => `
          <div class="book-chart-row">
            <span class="book-chart-row__label">${BookGenre({ genre: g.genre, compact: true })}<span class="book-chart-row__count">${g.count}</span></span>
            <span class="book-chart-row__pages">${g.pagesRead} pages read</span>
          </div>`
        )
        .join('')
    : emptyState({ icon: 'book', title: 'No shelf data', description: 'Add books to see genres.', size: 'sm' });

  el.innerHTML = `
    ${SectionCard({ title: 'Library status', description: 'How your shelf is split', content: statusBody })}
    ${SectionCard({ title: 'Reading by genre', description: 'Books and pages read per genre', content: genreBody })}
  `;
}

// ================= VIEW (grid / list) =================
function renderView() {
  const el = document.getElementById('books-view');
  const { viewMode } = getState();
  el.className = `books-view books-view--${viewMode}`;

  const visible = getVisibleBooks(books, getState());
  if (!visible.length) {
    el.innerHTML = BookEmptyState({ hasFilters: hasActiveFilters() });
    return;
  }

  el.innerHTML = viewMode === 'list' ? visible.map((b) => BookRow({ book: b })).join('') : visible.map((b) => BookCard({ book: b })).join('');
}

function hasActiveFilters() {
  const f = getState();
  return Boolean(f.search || f.genreFilter.size || f.statusFilter.size || f.favoritesOnly);
}

// ================= VIEW INTERACTIONS =================
function initViewSwitcher() {
  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setState({ viewMode: btn.dataset.view });
      document.querySelectorAll('[data-view]').forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', String(active));
      });
      renderView();
    });
  });
}

function initViewClickHandlers() {
  const view = document.getElementById('books-view');
  view.addEventListener('click', (e) => {
    const row = e.target.closest('.book-card, .book-row');
    if (row) openDetail(row.dataset.id);
  });
  view.addEventListener('keydown', (e) => {
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && (t.classList.contains('book-card') || t.classList.contains('book-row'))) {
      e.preventDefault();
      openDetail(t.dataset.id);
    }
  });
}

// ================= TOOLBAR =================
function initToolbar() {
  const searchInput = document.getElementById('books-search');
  searchInput.addEventListener('input', () => {
    setState({ search: searchInput.value });
    renderView();
  });

  document.getElementById('books-new').addEventListener('click', () => {
    openBookDialog('create', null, refreshAll);
  });

  initFilterPopover();
  initSortPopover();
  initMorePopover();
  initViewClickHandlers();
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
  const trigger = document.getElementById('books-filter-trigger');
  const panel = document.getElementById('books-filter-panel');

  function render() {
    const f = getState();
    panel.innerHTML = `
      <div class="menu__label">Status</div>
      ${BOOK_STATUSES.map((s) => filterCheckbox('status', s, f.statusFilter.has(s))).join('')}
      <div class="menu__divider"></div>
      <div class="menu__label">Genre</div>
      ${BOOK_GENRES.map((g) => filterCheckbox('genre', g, f.genreFilter.has(g), GENRE_CONFIG[g].label)).join('')}
      <div class="menu__divider"></div>
      ${filterCheckbox('favoritesOnly', '', f.favoritesOnly, 'Favorites only')}
      <div class="menu__divider"></div>
      <button type="button" class="menu__item" id="books-filter-clear">${icon('x', { size: 16 })}<span>Clear filters</span></button>
    `;
  }

  createPopover({ trigger, panel, onOpenRender: render });

  panel.addEventListener('change', (e) => {
    const input = e.target;
    const type = input.dataset.filterType;
    if (type === 'genre') toggleSetFilter('genreFilter', input.value, input.checked);
    else if (type === 'status') toggleSetFilter('statusFilter', input.value, input.checked);
    else if (type === 'favoritesOnly') setState({ favoritesOnly: input.checked });
    renderView();
    updateFilterCount();
  });

  panel.addEventListener('click', (e) => {
    if (e.target.closest('#books-filter-clear')) {
      resetFilters();
      render();
      renderView();
      updateFilterCount();
    }
  });
}

function updateFilterCount() {
  const f = getState();
  const count = f.genreFilter.size + f.statusFilter.size + (f.favoritesOnly ? 1 : 0);
  const badge = document.getElementById('books-filter-count');
  badge.hidden = count === 0;
  badge.textContent = String(count);
}

function initSortPopover() {
  const trigger = document.getElementById('books-sort-trigger');
  const panel = document.getElementById('books-sort-panel');

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
      renderView();
      popover.close();
    }
  });
}

function initMorePopover() {
  const trigger = document.getElementById('books-more-trigger');
  const panel = document.getElementById('books-more-panel');

  function render() {
    panel.innerHTML = `<button type="button" class="menu__item" id="books-more-shortcuts">${icon('search', { size: 16 })}<span>Keyboard shortcuts</span></button>`;
  }

  const popover = createPopover({ trigger, panel, onOpenRender: render });

  panel.addEventListener('click', (e) => {
    if (e.target.closest('#books-more-shortcuts')) {
      popover.close();
      document.getElementById('search-trigger').click();
    }
  });
}

// ================= DETAIL PANEL =================
let lastFocusedBeforeDetail = null;

function initDetailPanel() {
  const overlay = document.getElementById('book-detail-overlay');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDetail();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) closeDetail();
  });
}

function openDetail(bookId) {
  const b = enrichBook(books.find((x) => x.id === bookId));
  if (!b) return;
  lastFocusedBeforeDetail = document.activeElement;
  const overlay = document.getElementById('book-detail-overlay');
  const panel = document.getElementById('book-detail-panel');
  panel.innerHTML = renderDetailContent(b);
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  panel.querySelector('#book-detail-close').addEventListener('click', closeDetail);
  panel.querySelector('#book-detail-close').focus();
}

function closeDetail() {
  const overlay = document.getElementById('book-detail-overlay');
  overlay.hidden = true;
  document.body.style.overflow = '';
  lastFocusedBeforeDetail?.focus?.();
}

function refreshDetailPanel() {
  const panel = document.getElementById('book-detail-panel');
  const scrollEl = panel.querySelector('.book-detail-panel__scroll');
  const bookId = panel.querySelector('[data-book-id]')?.dataset.bookId;
  const b = enrichBook(books.find((x) => x.id === bookId));
  if (!b) return;
  const scrollTop = scrollEl?.scrollTop || 0;
  panel.innerHTML = renderDetailContent(b);
  panel.querySelector('#book-detail-close').addEventListener('click', closeDetail);
  panel.querySelector('#book-detail-close').focus();
  if (scrollEl) scrollEl.scrollTop = scrollTop;
}

function refreshAll() {
  invalidateVisibleBooksCache();
  renderStats();
  renderCharts();
  renderView();
}

function renderDetailContent(b) {
  const linkedGoals = (b.linkedGoals || []).map((id) => goals.find((g) => g.id === id)).filter(Boolean);
  const linkedHabits = (b.linkedHabits || []).map((id) => habits.find((h) => h.id === id)).filter(Boolean);
  const progressColor = b.status === 'Finished' ? 'success' : b.status === 'Reading' ? 'accent' : 'neutral';
  const remaining = pagesRemaining(b);

  return `
    <button type="button" class="icon-btn book-detail-panel__close" id="book-detail-close" aria-label="Close panel">${icon('x', { size: 18 })}</button>
    <div class="book-detail-panel__scroll" data-book-id="${b.id}">
      ${BookHeader({ book: b })}
      <div class="book-detail-panel__header-actions">
        <button type="button" class="btn btn--secondary" id="book-detail-edit">${icon('edit', { size: 15 })}<span>Edit</span></button>
        <button type="button" class="btn btn--secondary" id="book-detail-delete">${icon('trash', { size: 15 })}<span>Delete</span></button>
      </div>
      ${b.notes ? `<p class="book-detail-panel__desc">${b.notes}</p>` : ''}

      ${detailSection('Reading progress', `
        <div class="book-detail-panel__progress-row">
          ${BookProgress({ book: b, variant: 'ring', size: 56, color: progressColor })}
          <div class="book-detail-panel__progress-copy">
            <div>${b.pagesRead} of ${b.pages} pages read</div>
            <div class="book-detail-panel__muted">${remaining} pages to go</div>
          </div>
          <div class="book-pages-stepper">
            <button type="button" class="icon-btn" data-page-step="-10" aria-label="Subtract 10 pages">${icon('minus', { size: 14 })}</button>
            <button type="button" class="icon-btn" data-page-step="-1" aria-label="Subtract 1 page">${icon('chevronDown', { size: 14 })}</button>
            <span class="book-pages-stepper__value">${b.pagesRead}</span>
            <button type="button" class="icon-btn" data-page-step="1" aria-label="Add 1 page">${icon('chevronUp', { size: 14 })}</button>
            <button type="button" class="icon-btn" data-page-step="10" aria-label="Add 10 pages">${icon('plus', { size: 14 })}</button>
          </div>
        </div>
      `)}

      ${detailSection('Details', `
        <div class="settings-row"><span class="settings-row__body">Author</span><span>${b.author}</span></div>
        <div class="settings-row"><span class="settings-row__body">Format</span><span>${b.format}</span></div>
        <div class="settings-row"><span class="settings-row__body">Started</span><span>${b.startedAt ? formatDate(b.startedAt) : '\u2014'}</span></div>
        <div class="settings-row"><span class="settings-row__body">Finished</span><span>${b.finishedAt ? formatDate(b.finishedAt) : '\u2014'}</span></div>
      `)}

      ${detailSection('Links', `
        ${linkedGoals.length || linkedHabits.length
          ? `
            <div class="book-detail-panel__links">
              ${linkedGoals.map((g) => linkRow({ iconName: 'target', label: g.title, sub: `Goal \u00b7 ${g.status}`, route: 'goals' })).join('')}
              ${linkedHabits.map((h) => linkRow({ iconName: h.icon, label: h.title, sub: `Habit \u00b7 ${h.category}`, route: 'habits' })).join('')}
            </div>`
          : emptyState({ icon: 'layers', title: 'No linked items', description: 'Link goals and habits to see them here.', size: 'sm' })
        }`
      )}

      ${detailSection('Statistics', `
        <div class="book-detail-panel__stats-grid">
          ${statBlock(`${b.progress}%`, 'Read')}
          ${statBlock(`${b.pagesRead}/${b.pages}`, 'Pages')}
          ${statBlock(b.genre, 'Genre')}
          ${statBlock(typeof b.rating === 'number' ? `${b.rating} \u2605` : '\u2014', 'Rating')}
        </div>
      `)}
    </div>
  `;
}

function detailSection(title, content) {
  return `<section class="book-detail-panel__section"><h4>${title}</h4>${content}</section>`;
}

function linkRow({ iconName, label, sub, route }) {
  return `
    <button type="button" class="book-link" data-link-route="${route}">
      <span class="book-link__icon">${icon(iconName, { size: 15 })}</span>
      <span class="book-link__body">
        <span class="book-link__title">${label}</span>
        <span class="book-link__meta">${sub}</span>
      </span>
      ${icon('chevronRight', { size: 14, className: 'book-link__chevron' })}
    </button>`;
}

function statBlock(value, label) {
  return `<div class="book-detail-panel__stat"><span class="book-detail-panel__stat-value">${value}</span><span class="book-detail-panel__stat-label">${label}</span></div>`;
}

// Panel event delegation — pages stepper, edit/delete, link navigation.
function initPanelInteractions() {
  const panel = document.getElementById('book-detail-panel');
  if (panel.dataset.interactions) return;
  panel.dataset.interactions = '1';

  panel.addEventListener('click', (e) => {
    const bookEl = panel.querySelector('[data-book-id]');
    const b = books.find((x) => x.id === bookEl?.dataset.bookId);

    const stepBtn = e.target.closest('[data-page-step]');
    if (stepBtn && b) {
      const step = Number(stepBtn.dataset.pageStep);
      b.pagesRead = Math.max(0, Math.min(b.pages, (b.pagesRead || 0) + step));
      if (!b.startedAt && b.pagesRead > 0 && b.status === 'Want to Read') {
        b.startedAt = new Date().toISOString().slice(0, 10);
        b.status = 'Reading';
      }
      if (b.pages && b.pagesRead >= b.pages && b.status === 'Reading') {
        b.status = 'Finished';
        b.finishedAt = b.finishedAt || new Date().toISOString().slice(0, 10);
      }
      saveBooks();
      afterBookChange();
      return;
    }

    const edit = e.target.closest('#book-detail-edit');
    if (edit && b) {
      openBookDialog('edit', books.find((x) => x.id === b.id), () => { refreshDetailPanel(); refreshAll(); });
      return;
    }

    const remove = e.target.closest('#book-detail-delete');
    if (remove && b) {
      if (window.confirm(`Delete "${b.title}"? This can\u2019t be undone.`)) {
        const idx = books.findIndex((x) => x.id === b.id);
        if (idx !== -1) books.splice(idx, 1);
        saveBooks();
        closeDetail();
        refreshAll();
      }
      return;
    }

    const link = e.target.closest('[data-link-route]');
    if (link) {
      closeDetail();
      navigate(link.dataset.linkRoute);
    }
  });
}

function afterBookChange() {
  invalidateVisibleBooksCache();
  refreshDetailPanel();
  renderStats();
  renderCharts();
  renderView();
}

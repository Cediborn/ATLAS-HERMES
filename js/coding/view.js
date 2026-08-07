// Atlas — Coding page controller. The only file in the module that touches the
// DOM or wires events; data.js/state.js/components.js stay pure.

import { icon } from '../icons.js';
import { createPopover } from '../popover.js';
import { StatCard, SectionCard, emptyState } from '../components.js';
import { navigate } from '../router.js';
import {
  codingItems,
  CODING_STATUSES,
  DIFFICULTIES,
  CODING_LANGUAGES,
} from './data.js';
import {
  getState,
  setState,
  getVisibleItems,
  invalidateVisibleCache,
  resetFilters,
  computeCodingStats,
  computePracticeStreak,
  difficultyDistribution,
  languageDistribution,
  enrichItem,
  SORT_OPTIONS,
} from './state.js';
import {
  CodingCard,
  CodingRow,
  CodingHeader,
  CodingProgress,
  CodingDifficulty,
  CodingLanguage,
  CodingTopic,
  CodingSkeleton,
  CodingEmptyState,
} from './components.js';
import { goals } from '../goals/data.js';
import { projects } from '../projects/data.js';
import { habits } from '../habits/data.js';

export function renderCoding(container) {
  container.innerHTML = `
    <div class="coding-page">
      <div class="coding-toolbar">
        <label class="toolbar-search" for="coding-search">
          ${icon('search', { size: 16 })}
          <input type="text" id="coding-search" placeholder="Search problems and builds\u2026" autocomplete="off" />
        </label>

        <button type="button" class="btn btn--primary coding-toolbar__new" id="coding-new">
          ${icon('plus', { size: 16 })}<span>New Item</span>
        </button>

        <div class="toolbar-spacer"></div>

        <div class="view-switcher" role="tablist" aria-label="View">
          <button type="button" class="view-switcher__option is-active" role="tab" aria-selected="true" data-view="grid">${icon('grid', { size: 15 })}<span>Grid</span></button>
          <button type="button" class="view-switcher__option" role="tab" aria-selected="false" data-view="list">${icon('checklist', { size: 15 })}<span>List</span></button>
        </div>

        <div class="toolbar-popover">
          <button type="button" class="btn btn--secondary" id="coding-filter-trigger">
            ${icon('filter', { size: 15 })}<span>Filter</span><span class="badge badge--accent" id="coding-filter-count" hidden></span>
          </button>
          <div class="menu coding-filter-panel" id="coding-filter-panel" hidden></div>
        </div>

        <div class="toolbar-popover">
          <button type="button" class="btn btn--secondary" id="coding-sort-trigger">${icon('sort', { size: 15 })}<span>Sort</span></button>
          <div class="menu" id="coding-sort-panel" hidden></div>
        </div>

        <div class="toolbar-popover">
          <button type="button" class="icon-btn" id="coding-more-trigger" aria-label="More actions">${icon('moreHorizontal', { size: 18 })}</button>
          <div class="menu menu--right" id="coding-more-panel" hidden></div>
        </div>
      </div>

      <div class="coding-stats" id="coding-stats"></div>

      <div class="coding-charts" id="coding-charts"></div>

      <div class="coding-view" id="coding-view"></div>
    </div>

    <div class="overlay coding-detail-overlay" id="coding-detail-overlay" hidden>
      <aside class="coding-detail-panel" role="dialog" aria-modal="true" aria-label="Coding item details" id="coding-detail-panel"></aside>
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

export function renderCodingSkeleton(container) {
  container.innerHTML = `<div class="coding-page"><div class="coding-view">${CodingSkeleton({ count: 6 })}</div></div>`;
}

// ================= STATS + CHARTS =================
function renderStats() {
  const el = document.getElementById('coding-stats');
  const s = computeCodingStats(codingItems);
  const streak = computePracticeStreak();
  el.innerHTML = [
    StatCard({ title: 'Solved', value: String(s.solved), icon: 'check', accent: 'success' }),
    StatCard({ title: 'In progress', value: String(s.inProgress), icon: 'clock', accent: 'accent' }),
    StatCard({ title: 'Practice streak', value: `${streak} ${streak === 1 ? 'day' : 'days'}`, icon: 'flame', accent: 'warning' }),
    StatCard({ title: 'Hours logged', value: String(s.hours), icon: 'clock', accent: 'blue' }),
  ].join('');
}

function renderCharts() {
  const el = document.getElementById('coding-charts');
  const byDifficulty = difficultyDistribution(codingItems);
  const byLanguage = languageDistribution(codingItems);

  const difficultyBody = `
    <div class="coding-difficulty-chart">
      ${byDifficulty
        .map(
          (d) => `
        <div class="coding-difficulty-chart__row">
          <span class="coding-difficulty-chart__label">${CodingDifficulty({ difficulty: d.label })}</span>
          <div class="coding-difficulty-chart__track">
            <div class="coding-difficulty-chart__fill coding-difficulty-chart__fill--${d.color}" style="width:${d.pct}%"></div>
          </div>
          <span class="coding-difficulty-chart__count">${d.count}</span>
        </div>`
        )
        .join('')}
    </div>`;

  const languageBody = byLanguage.length
    ? byLanguage
        .map(
          (l) => `
          <div class="coding-chart-row">
            <span class="coding-chart-row__label">${CodingLanguage({ language: l.label })}<span class="coding-chart-row__count">${l.count}</span></span>
            <span class="coding-chart-row__time">${(l.minutes / 60).toFixed(1)}h</span>
          </div>`
        )
        .join('')
    : emptyState({ icon: 'code', title: 'No language data', description: 'Add items to see language splits.', size: 'sm' });

  el.innerHTML = `
    ${SectionCard({ title: 'Difficulty mix', description: 'Problems and builds by difficulty', content: difficultyBody })}
    ${SectionCard({ title: 'Time by language', description: 'Items and hours logged per language', content: languageBody })}
  `;
}

// ================= VIEW (grid / list) =================
function renderView() {
  const el = document.getElementById('coding-view');
  const { viewMode } = getState();
  el.className = `coding-view coding-view--${viewMode}`;

  const { list } = getVisibleItems(codingItems, getState());
  if (!list.length) {
    el.innerHTML = CodingEmptyState({ hasFilters: hasActiveFilters() });
    return;
  }

  el.innerHTML = viewMode === 'list' ? list.map((c) => CodingRow({ item: c })).join('') : list.map((c) => CodingCard({ item: c })).join('');
}

function hasActiveFilters() {
  const f = getState();
  return Boolean(f.search || f.statusFilter.size || f.difficultyFilter.size || f.languageFilter.size || f.favoritesOnly);
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
  const view = document.getElementById('coding-view');
  view.addEventListener('click', (e) => {
    const card = e.target.closest('.coding-card, .coding-row');
    if (card) openDetail(card.dataset.id);
  });
  view.addEventListener('keydown', (e) => {
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && (t.classList.contains('coding-card') || t.classList.contains('coding-row'))) {
      e.preventDefault();
      openDetail(t.dataset.id);
    }
  });
}

// ================= TOOLBAR =================
function initToolbar() {
  const searchInput = document.getElementById('coding-search');
  searchInput.addEventListener('input', () => {
    setState({ search: searchInput.value });
    renderView();
  });

  document.getElementById('coding-new').addEventListener('click', () => {
    document.getElementById('search-trigger').click();
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
  const trigger = document.getElementById('coding-filter-trigger');
  const panel = document.getElementById('coding-filter-panel');

  function render() {
    const f = getState();
    panel.innerHTML = `
      <div class="menu__label">Status</div>
      ${CODING_STATUSES.map((s) => filterCheckbox('status', s, f.statusFilter.has(s))).join('')}
      <div class="menu__divider"></div>
      <div class="menu__label">Difficulty</div>
      ${DIFFICULTIES.map((d) => filterCheckbox('difficulty', d, f.difficultyFilter.has(d))).join('')}
      <div class="menu__divider"></div>
      <div class="menu__label">Language</div>
      ${CODING_LANGUAGES.map((l) => filterCheckbox('language', l, f.languageFilter.has(l))).join('')}
      <div class="menu__divider"></div>
      ${filterCheckbox('favoritesOnly', '', f.favoritesOnly, 'Favorites only')}
      <div class="menu__divider"></div>
      <button type="button" class="menu__item" id="coding-filter-clear">${icon('x', { size: 16 })}<span>Clear filters</span></button>
    `;
  }

  createPopover({ trigger, panel, onOpenRender: render });

  panel.addEventListener('change', (e) => {
    const input = e.target;
    const type = input.dataset.filterType;
    if (type === 'status') toggleSetFilter('statusFilter', input.value, input.checked);
    else if (type === 'difficulty') toggleSetFilter('difficultyFilter', input.value, input.checked);
    else if (type === 'language') toggleSetFilter('languageFilter', input.value, input.checked);
    else if (type === 'favoritesOnly') setState({ favoritesOnly: input.checked });
    renderView();
    updateFilterCount();
  });

  panel.addEventListener('click', (e) => {
    if (e.target.closest('#coding-filter-clear')) {
      resetFilters();
      render();
      renderView();
      updateFilterCount();
    }
  });
}

function updateFilterCount() {
  const f = getState();
  const count = f.statusFilter.size + f.difficultyFilter.size + f.languageFilter.size + (f.favoritesOnly ? 1 : 0);
  const badge = document.getElementById('coding-filter-count');
  badge.hidden = count === 0;
  badge.textContent = String(count);
}

function initSortPopover() {
  const trigger = document.getElementById('coding-sort-trigger');
  const panel = document.getElementById('coding-sort-panel');

  function render() {
    const current = getState().sortBy;
    panel.innerHTML = Object.keys(SORT_OPTIONS).map(
      (key) => `
      <button type="button" class="menu__item" data-sort="${key}" aria-selected="${key === current}">
        ${key === current ? icon('check', { size: 16 }) : '<span class="menu__item-spacer"></span>'}
        <span>${key}</span>
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
  const trigger = document.getElementById('coding-more-trigger');
  const panel = document.getElementById('coding-more-panel');

  function render() {
    panel.innerHTML = `<button type="button" class="menu__item" id="coding-more-shortcuts">${icon('search', { size: 16 })}<span>Keyboard shortcuts</span></button>`;
  }

  const popover = createPopover({ trigger, panel, onOpenRender: render });

  panel.addEventListener('click', (e) => {
    if (e.target.closest('#coding-more-shortcuts')) {
      popover.close();
      document.getElementById('search-trigger').click();
    }
  });
}

// ================= DETAIL PANEL =================
let lastFocusedBeforeDetail = null;

function initDetailPanel() {
  const overlay = document.getElementById('coding-detail-overlay');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDetail();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) closeDetail();
  });
}

function openDetail(itemId) {
  const item = enrichItem(codingItems.find((x) => x.id === itemId));
  if (!item) return;
  lastFocusedBeforeDetail = document.activeElement;
  const overlay = document.getElementById('coding-detail-overlay');
  const panel = document.getElementById('coding-detail-panel');
  panel.innerHTML = renderDetailContent(item);
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  panel.querySelector('#coding-detail-close').addEventListener('click', closeDetail);
  panel.querySelector('#coding-detail-close').focus();
}

function closeDetail() {
  const overlay = document.getElementById('coding-detail-overlay');
  overlay.hidden = true;
  document.body.style.overflow = '';
  lastFocusedBeforeDetail?.focus?.();
}

function refreshDetailPanel() {
  const panel = document.getElementById('coding-detail-panel');
  const scrollEl = panel.querySelector('.coding-detail-panel__scroll');
  const itemId = panel.querySelector('[data-coding-id]')?.dataset.codingId;
  const item = enrichItem(codingItems.find((x) => x.id === itemId));
  if (!item) return;
  const scrollTop = scrollEl?.scrollTop || 0;
  panel.innerHTML = renderDetailContent(item);
  panel.querySelector('#coding-detail-close').addEventListener('click', closeDetail);
  if (scrollEl) scrollEl.scrollTop = scrollTop;
}

function renderDetailContent(item) {
  const linkedGoals = (item.linkedGoals || []).map((id) => goals.find((g) => g.id === id)).filter(Boolean);
  const linkedProjects = (item.linkedProjects || []).map((id) => projects.find((p) => p.id === id)).filter(Boolean);
  const linkedHabits = (item.linkedHabits || []).map((id) => habits.find((h) => h.id === id)).filter(Boolean);
  const progressColor = item.status === 'Solved' ? 'success' : item.status === 'In Progress' ? 'accent' : 'neutral';
  const linked = [...linkedGoals, ...linkedProjects, ...linkedHabits];

  return `
    <button type="button" class="icon-btn coding-detail-panel__close" id="coding-detail-close" aria-label="Close panel">${icon('x', { size: 18 })}</button>
    <div class="coding-detail-panel__scroll" data-coding-id="${item.id}">
      ${CodingHeader({ item })}
      ${item.notes ? `<p class="coding-detail-panel__desc">${item.notes}</p>` : ''}

      ${detailSection('Progress', `
        <div class="coding-detail-panel__progress-row">
          ${CodingProgress({ item, variant: 'ring', size: 56, color: progressColor })}
          <div class="coding-detail-panel__progress-copy">
            <div>${item.stepsTotal > 0 ? `${item.stepsDone} of ${item.stepsTotal} steps done` : (item.status === 'Solved' ? 'Solved' : 'Not started')}</div>
            <div class="coding-detail-panel__muted">${item.status === 'In Progress' ? 'Keep going' : item.status}</div>
          </div>
        </div>
        ${item.steps && item.steps.length
          ? `
          <div class="coding-steps" id="coding-steps">
            ${item.steps.map((s) => `
              <button type="button" class="coding-step${s.done ? ' is-done' : ''}" data-step-id="${s.id}">
                <span class="coding-step__check">${s.done ? icon('check', { size: 12 }) : ''}</span>
                <span class="coding-step__title">${s.title}</span>
              </button>`).join('')}
          </div>`
          : ''}
      `)}

      ${detailSection('Details', `
        <div class="settings-row"><span class="settings-row__body">Source</span><span>${item.source}</span></div>
        <div class="settings-row"><span class="settings-row__body">Difficulty</span><span>${item.difficulty}</span></div>
        <div class="settings-row"><span class="settings-row__body">Languages</span><span>${item.languages.map((l) => CodingLanguage({ language: l })).join(' ')}</span></div>
        <div class="settings-row"><span class="settings-row__body">Time spent</span><span>${item.timeSpentMin} min</span></div>
        <div class="settings-row"><span class="settings-row__body">Last practiced</span><span>${item.lastPracticed || '\u2014'}</span></div>
        <div class="settings-row"><span class="settings-row__body">Topics</span><span>${(item.topics || []).map((t) => CodingTopic({ topic: t })).join(' ')}</span></div>
      `)}

      ${detailSection('Links', `
        ${linked.length
          ? `
            <div class="coding-detail-panel__links">
              ${linkedGoals.map((g) => linkRow({ iconName: 'target', label: g.title, sub: `Goal \u00b7 ${g.status}`, route: 'goals' })).join('')}
              ${linkedProjects.map((p) => linkRow({ iconName: 'folder', label: p.title, sub: `Project \u00b7 ${p.status}`, route: 'projects' })).join('')}
              ${linkedHabits.map((h) => linkRow({ iconName: h.icon, label: h.title, sub: `Habit \u00b7 ${h.category}`, route: 'habits' })).join('')}
            </div>`
          : emptyState({ icon: 'layers', title: 'No linked items', description: 'Link goals, projects and habits to see them here.', size: 'sm' })
        }`
      )}

      ${detailSection('Statistics', `
        <div class="coding-detail-panel__stats-grid">
          ${statBlock(`${item.progress}%`, 'Progress')}
          ${statBlock(item.stepsTotal > 0 ? `${item.stepsDone}/${item.stepsTotal}` : '\u2014', 'Steps')}
          ${statBlock(`${item.hours}h`, 'Time')}
          ${statBlock(item.difficulty, 'Difficulty')}
        </div>
      `)}
    </div>
  `;
}

function detailSection(title, content) {
  return `<section class="coding-detail-panel__section"><h4>${title}</h4>${content}</section>`;
}

function linkRow({ iconName, label, sub, route }) {
  return `
    <button type="button" class="coding-link" data-link-route="${route}">
      <span class="coding-link__icon">${icon(iconName, { size: 15 })}</span>
      <span class="coding-link__body">
        <span class="coding-link__title">${label}</span>
        <span class="coding-link__meta">${sub}</span>
      </span>
      ${icon('chevronRight', { size: 14, className: 'coding-link__chevron' })}
    </button>`;
}

function statBlock(value, label) {
  return `<div class="coding-detail-panel__stat"><span class="coding-detail-panel__stat-value">${value}</span><span class="coding-detail-panel__stat-label">${label}</span></div>`;
}

// Panel event delegation — step checklist + link navigation.
function initPanelInteractions() {
  const panel = document.getElementById('coding-detail-panel');
  if (panel.dataset.interactions) return;
  panel.dataset.interactions = '1';

  panel.addEventListener('click', (e) => {
    const stepBtn = e.target.closest('[data-step-id]');
    if (stepBtn) {
      const itemEl = panel.querySelector('[data-coding-id]');
      const item = codingItems.find((x) => x.id === itemEl?.dataset.codingId);
      if (item) {
        const step = (item.steps || []).find((s) => s.id === stepBtn.dataset.stepId);
        if (step) {
          step.done = !step.done;
          item.lastPracticed = new Date().toISOString().slice(0, 10);
        }
        invalidateVisibleCache();
        refreshDetailPanel();
        renderView();
        renderStats();
        renderCharts();
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

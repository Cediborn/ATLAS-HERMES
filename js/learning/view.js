// Atlas — Learning page controller. The only file in the module that touches
// the DOM or wires events; data.js/state.js/components.js stay pure.

import { icon } from '../icons.js';
import { createPopover } from '../popover.js';
import { StatCard, SectionCard, emptyState } from '../components.js';
import { navigate } from '../router.js';
import { saveResources } from '../persistence.js';
import { resources, RESOURCE_TYPES, LEARNING_STATUSES, LEARNING_SUBJECTS, SUBJECT_CONFIG, LEARNING_STATUS_CONFIG } from './data.js';
import {
  getState,
  setState,
  getVisibleResources,
  invalidateVisibleResourcesCache,
  resetFilters,
  computeLearningStats,
  subjectProgress,
  statusDistribution,
  SORT_OPTIONS,
  minutesRemaining,
  formatDate,
  timeAgo,
  daysUntil,
} from './state.js';
import {
  ResourceCard,
  ResourceRow,
  ResourceHeader,
  ResourceProgress,
  ResourceSkeleton,
  LearningEmptyState,
  ResourceSubject,
  formatMinutes,
} from './components.js';
import { openResourceDialog } from './dialog.js';
import { goals } from '../goals/data.js';
import { projects } from '../projects/data.js';
import { habits } from '../habits/data.js';

export function renderLearning(container) {
  container.innerHTML = `
    <div class="learning-page">
      <div class="learning-toolbar">
        <label class="toolbar-search" for="learning-search">
          ${icon('search', { size: 16 })}
          <input type="text" id="learning-search" placeholder="Search resources\u2026" autocomplete="off" />
        </label>

        <button type="button" class="btn btn--primary learning-toolbar__new" id="learning-new">
          ${icon('plus', { size: 16 })}<span>Add Resource</span>
        </button>

        <div class="toolbar-spacer"></div>

        <div class="view-switcher" role="tablist" aria-label="View">
          <button type="button" class="view-switcher__option is-active" role="tab" aria-selected="true" data-view="grid">${icon('grid', { size: 15 })}<span>Grid</span></button>
          <button type="button" class="view-switcher__option" role="tab" aria-selected="false" data-view="list">${icon('checklist', { size: 15 })}<span>List</span></button>
        </div>

        <div class="toolbar-popover">
          <button type="button" class="btn btn--secondary" id="learning-filter-trigger">
            ${icon('filter', { size: 15 })}<span>Filter</span><span class="badge badge--accent" id="learning-filter-count" hidden></span>
          </button>
          <div class="menu learning-filter-panel" id="learning-filter-panel" hidden></div>
        </div>

        <div class="toolbar-popover">
          <button type="button" class="btn btn--secondary" id="learning-sort-trigger">${icon('sort', { size: 15 })}<span>Sort</span></button>
          <div class="menu" id="learning-sort-panel" hidden></div>
        </div>

        <div class="toolbar-popover">
          <button type="button" class="icon-btn" id="learning-more-trigger" aria-label="More actions">${icon('moreHorizontal', { size: 18 })}</button>
          <div class="menu menu--right" id="learning-more-panel" hidden></div>
        </div>
      </div>

      <div class="learning-stats" id="learning-stats"></div>

      <div class="learning-charts" id="learning-charts"></div>

      <div class="learning-view" id="learning-view"></div>
    </div>

    <div class="overlay resource-detail-overlay" id="resource-detail-overlay" hidden>
      <aside class="resource-detail-panel" role="dialog" aria-modal="true" aria-label="Resource details" id="resource-detail-panel"></aside>
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

export function renderLearningSkeleton(container) {
  container.innerHTML = `<div class="learning-page"><div class="learning-view">${ResourceSkeleton({ count: 6 })}</div></div>`;
}

// ================= STATS + CHARTS =================
function renderStats() {
  const el = document.getElementById('learning-stats');
  const s = computeLearningStats(resources);
  el.innerHTML = [
    StatCard({ title: 'In progress', value: String(s.inProgress), icon: 'bookOpen', accent: 'accent' }),
    StatCard({ title: 'Completed', value: String(s.completed), icon: 'check', accent: 'success' }),
    StatCard({ title: 'Avg progress', value: `${s.avgProgress}%`, icon: 'trendingUp', accent: 'warning' }),
    StatCard({ title: 'Time left', value: s.minutesLeft ? `~${formatMinutes(s.minutesLeft)}` : '\u2014', icon: 'clock', accent: 'neutral' }),
  ].join('');
}

function renderCharts() {
  const el = document.getElementById('learning-charts');
  const bySubject = subjectProgress(resources);
  const byStatus = statusDistribution(resources);

  const subjectBody = bySubject.length
    ? bySubject
        .map((s) => {
          return `
          <div class="resource-chart-row">
            <span class="resource-chart-row__label">${ResourceSubject({ subject: s.subject, compact: true })}<span class="resource-chart-row__count">${s.count}</span></span>
            ${ResourceProgress({ percentage: s.progress, variant: 'bar', color: 'accent' })}
            <span class="resource-chart-row__value">${s.progress}%</span>
          </div>`;
        })
        .join('')
    : emptyState({ icon: 'bookOpen', title: 'No subject data', description: 'Add resources to see progress by subject.', size: 'sm' });

  const statusBody = `
    <div class="resource-status-chart">
      ${byStatus
        .map(
          (s) => `
        <div class="resource-status-chart__row">
          <span class="resource-status-chart__label">${s.status}</span>
          <div class="resource-status-chart__track">
            <div class="resource-status-chart__fill resource-status-chart__fill--${(LEARNING_STATUS_CONFIG[s.status] || { color: 'neutral' }).color}" style="width:${s.pct}%"></div>
          </div>
          <span class="resource-status-chart__count">${s.count}</span>
        </div>`
        )
        .join('')}
    </div>`;

  el.innerHTML = `
    ${SectionCard({ title: 'Progress by subject', description: 'Average completion across each subject', content: subjectBody })}
    ${SectionCard({ title: 'Library status', description: 'How resources are distributed', content: statusBody })}
  `;
}

// ================= VIEW (grid / list) =================
function renderView() {
  const el = document.getElementById('learning-view');
  const { viewMode } = getState();
  el.className = `learning-view learning-view--${viewMode}`;

  const visible = getVisibleResources(resources, getState());
  if (!visible.length) {
    el.innerHTML = LearningEmptyState({ hasFilters: hasActiveFilters() });
    return;
  }

  if (viewMode === 'list') {
    el.innerHTML = visible.map((r) => ResourceRow({ resource: r })).join('');
    return;
  }

  el.innerHTML = visible.map((r) => ResourceCard({ resource: r })).join('');
}

function hasActiveFilters() {
  const f = getState();
  return Boolean(f.search || f.typeFilter || f.subjectFilter.size || f.statusFilter.size || f.favoritesOnly);
}

// ================= VIEW INTERACTIONS (delegated — survives re-render) =================
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
  const view = document.getElementById('learning-view');
  view.addEventListener('click', (e) => {
    const row = e.target.closest('.resource-card, .resource-row');
    if (row) openDetail(row.dataset.id);
  });
  view.addEventListener('keydown', (e) => {
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && (t.classList.contains('resource-card') || t.classList.contains('resource-row'))) {
      e.preventDefault();
      openDetail(t.dataset.id);
    }
  });
}

// ================= TOOLBAR =================
function initToolbar() {
  const searchInput = document.getElementById('learning-search');
  searchInput.addEventListener('input', () => {
    setState({ search: searchInput.value });
    renderView();
  });

  document.getElementById('learning-new').addEventListener('click', () => {
    openResourceDialog('create', null, refreshAll);
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

function typeRadio(value, checked, label) {
  return `
    <label class="menu__item filter-checkbox">
      <input type="radio" name="resource-type" data-filter-type="type" value="${value || ''}" ${checked ? 'checked' : ''} />
      <span>${label}</span>
    </label>`;
}

function toggleSetFilter(key, value, checked) {
  const current = new Set(getState()[key]);
  if (checked) current.add(value);
  else current.delete(value);
  setState({ [key]: current });
}

function initFilterPopover() {
  const trigger = document.getElementById('learning-filter-trigger');
  const panel = document.getElementById('learning-filter-panel');

  function render() {
    const f = getState();
    panel.innerHTML = `
      <div class="menu__label">Type</div>
      ${typeRadio('', !f.typeFilter, 'All types')}
      ${RESOURCE_TYPES.map((t) => typeRadio(t.id, f.typeFilter === t.id, t.label)).join('')}
      <div class="menu__divider"></div>
      <div class="menu__label">Subject</div>
      ${LEARNING_SUBJECTS.map((s) => filterCheckbox('subject', s, f.subjectFilter.has(s), SUBJECT_CONFIG[s].label)).join('')}
      <div class="menu__divider"></div>
      <div class="menu__label">Status</div>
      ${LEARNING_STATUSES.map((s) => filterCheckbox('status', s, f.statusFilter.has(s))).join('')}
      <div class="menu__divider"></div>
      ${filterCheckbox('favoritesOnly', '', f.favoritesOnly, 'Favorites only')}
      ${filterCheckbox('showArchived', '', f.showArchived, 'Show archived')}
      <div class="menu__divider"></div>
      <button type="button" class="menu__item" id="learning-filter-clear">${icon('x', { size: 16 })}<span>Clear filters</span></button>
    `;
  }

  createPopover({ trigger, panel, onOpenRender: render });

  panel.addEventListener('change', (e) => {
    const input = e.target;
    const type = input.dataset.filterType;
    if (type === 'type') setState({ typeFilter: input.value || null });
    else if (type === 'subject') toggleSetFilter('subjectFilter', input.value, input.checked);
    else if (type === 'status') toggleSetFilter('statusFilter', input.value, input.checked);
    else if (type === 'favoritesOnly') setState({ favoritesOnly: input.checked });
    else if (type === 'showArchived') setState({ showArchived: input.checked });
    renderView();
    updateFilterCount();
  });

  panel.addEventListener('click', (e) => {
    if (e.target.closest('#learning-filter-clear')) {
      resetFilters();
      render();
      renderView();
      updateFilterCount();
    }
  });
}

function updateFilterCount() {
  const f = getState();
  const count = f.subjectFilter.size + f.statusFilter.size + (f.typeFilter ? 1 : 0) + (f.favoritesOnly ? 1 : 0);
  const badge = document.getElementById('learning-filter-count');
  badge.hidden = count === 0;
  badge.textContent = String(count);
}

function initSortPopover() {
  const trigger = document.getElementById('learning-sort-trigger');
  const panel = document.getElementById('learning-sort-panel');

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
  const trigger = document.getElementById('learning-more-trigger');
  const panel = document.getElementById('learning-more-panel');

  function render() {
    panel.innerHTML = `<button type="button" class="menu__item" id="learning-more-shortcuts">${icon('search', { size: 16 })}<span>Keyboard shortcuts</span></button>`;
  }

  const popover = createPopover({ trigger, panel, onOpenRender: render });

  panel.addEventListener('click', (e) => {
    if (e.target.closest('#learning-more-shortcuts')) {
      popover.close();
      document.getElementById('search-trigger').click();
    }
  });
}

// ================= DETAIL PANEL =================
let lastFocusedBeforeDetail = null;

function initDetailPanel() {
  const overlay = document.getElementById('resource-detail-overlay');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDetail();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) closeDetail();
  });
}

function openDetail(resourceId) {
  const r = resources.find((x) => x.id === resourceId);
  if (!r) return;
  lastFocusedBeforeDetail = document.activeElement;
  const overlay = document.getElementById('resource-detail-overlay');
  const panel = document.getElementById('resource-detail-panel');
  panel.innerHTML = renderDetailContent(r);
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  panel.querySelector('#resource-detail-close').addEventListener('click', closeDetail);
  panel.querySelector('#resource-detail-close').focus();
}

function closeDetail() {
  const overlay = document.getElementById('resource-detail-overlay');
  overlay.hidden = true;
  document.body.style.overflow = '';
  lastFocusedBeforeDetail?.focus?.();
}

function refreshDetailPanel() {
  const panel = document.getElementById('resource-detail-panel');
  const scrollEl = panel.querySelector('.resource-detail-panel__scroll');
  const resourceId = panel.querySelector('[data-resource-id]')?.dataset.resourceId;
  const r = resources.find((x) => x.id === resourceId);
  if (!r) return;
  const scrollTop = scrollEl?.scrollTop || 0;
  panel.innerHTML = renderDetailContent(r);
  panel.querySelector('#resource-detail-close').addEventListener('click', closeDetail);
  panel.querySelector('#resource-detail-close').focus();
  if (scrollEl) scrollEl.scrollTop = scrollTop;
}

function refreshAll() {
  invalidateVisibleResourcesCache();
  renderStats();
  renderCharts();
  renderView();
}

function renderDetailContent(r) {
  const linkedGoals = r.linkedGoalIds.map((id) => goals.find((g) => g.id === id)).filter(Boolean);
  const linkedProjects = r.linkedProjectIds.map((id) => projects.find((p) => p.id === id)).filter(Boolean);
  const linkedHabits = r.linkedHabitIds.map((id) => habits.find((h) => h.id === id)).filter(Boolean);
  const nextUnit = (r.units || []).find((u) => !u.done);
  const progressColor = r.status === 'Completed' ? 'success' : r.status === 'Archived' ? 'neutral' : 'accent';

  return `
    <button type="button" class="icon-btn resource-detail-panel__close" id="resource-detail-close" aria-label="Close panel">${icon('x', { size: 18 })}</button>
    <div class="resource-detail-panel__scroll" data-resource-id="${r.id}">
      ${ResourceHeader({ resource: r })}
      <div class="resource-detail-panel__header-actions">
        <button type="button" class="btn btn--secondary" id="resource-detail-edit">${icon('edit', { size: 15 })}<span>Edit</span></button>
        <button type="button" class="btn btn--secondary" id="resource-detail-delete">${icon('trash', { size: 15 })}<span>Delete</span></button>
      </div>
      <p class="resource-detail-panel__desc">${r.description}</p>

      ${detailSection('Progress', `
        <div class="resource-detail-panel__progress-row">
          ${ResourceProgress({ percentage: r.progress, variant: 'ring', size: 56, color: progressColor })}
          <div class="resource-detail-panel__progress-copy">
            <div>${r.unitsDone} of ${r.unitsTotal} units complete</div>
            ${nextUnit ? `<div class="resource-detail-panel__muted">Next: ${nextUnit.title}</div>` : `<div class="resource-detail-panel__muted">All units done \u2014 nice work.</div>`}
            ${r.estimatedMinutes ? `<div class="resource-detail-panel__muted">Roughly ${formatMinutes(minutesRemaining(r))} of reading left</div>` : ''}
          </div>
        </div>
      `)}

      ${detailSection('Units', unitsSection(r))}

      ${detailSection('Links', `
        ${linkedGoals.length || linkedProjects.length || linkedHabits.length
          ? `
            <div class="resource-detail-panel__links">
              ${linkedGoals.map((g) => linkRow({ iconName: 'target', label: g.title, sub: `Goal \u00b7 ${g.status}`, route: 'goals' })).join('')}
              ${linkedProjects.map((p) => linkRow({ iconName: 'folder', label: p.title, sub: `Project \u00b7 ${p.status}`, route: 'projects' })).join('')}
              ${linkedHabits.map((h) => linkRow({ iconName: h.icon, label: h.title, sub: `Habit \u00b7 ${h.category}`, route: 'habits' })).join('')}
            </div>`
          : emptyState({ icon: 'layers', title: 'No linked items', description: 'Link goals, projects, and habits to see them here.', size: 'sm' })
        }`
      )}

      ${detailSection('Timeline', `
        <div class="settings-row"><span class="settings-row__body">Added</span><span>${formatDate(r.createdAt)}</span></div>
        <div class="settings-row"><span class="settings-row__body">Due</span><span>${r.dueDate ? `${formatDate(r.dueDate)} (${daysUntil(r.dueDate)}d)` : '\u2014'}</span></div>
        <div class="settings-row"><span class="settings-row__body">Last updated</span><span>${timeAgo(r.updatedAt)}</span></div>
      `)}

      ${detailSection('Details', `
        <div class="resource-detail-panel__stats-grid">
          ${statBlock(`${r.progress}%`, 'Progress')}
          ${statBlock(r.unitsTotal, 'Units')}
          ${statBlock(r.unitsDone, 'Done')}
          ${statBlock(r.estimatedMinutes ? `${formatMinutes(r.estimatedMinutes)}` : '\u2014', 'Est. reading')}
        </div>
      `)}
    </div>
  `;
}

function detailSection(title, content) {
  return `<section class="resource-detail-panel__section"><h4>${title}</h4>${content}</section>`;
}

function linkRow({ iconName, label, sub, route }) {
  return `
    <button type="button" class="resource-link" data-link-route="${route}">
      <span class="resource-link__icon">${icon(iconName, { size: 15 })}</span>
      <span class="resource-link__body">
        <span class="resource-link__title">${label}</span>
        <span class="resource-link__meta">${sub}</span>
      </span>
      ${icon('chevronRight', { size: 14, className: 'resource-link__chevron' })}
    </button>`;
}

function statBlock(value, label) {
  return `<div class="resource-detail-panel__stat"><span class="resource-detail-panel__stat-value">${value}</span><span class="resource-detail-panel__stat-label">${label}</span></div>`;
}

function unitId() {
  return `u${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function unitsSection(r) {
  const list = r.units || [];
  const done = list.filter((u) => u.done).length;
  const rows = list.length
    ? `<div class="resource-units__list">${list
        .map(
          (u) => `
        <div class="resource-unit${u.done ? ' is-done' : ''}" data-unit-id="${u.id}">
          <button type="button" class="resource-unit__check" role="checkbox" aria-checked="${u.done}" aria-label="${u.done ? 'Mark incomplete' : 'Mark complete'}: ${u.title}">${icon('check', { size: 11 })}</button>
          <span class="resource-unit__title">${u.title}</span>
          <button type="button" class="icon-btn resource-unit__delete" data-unit-delete="${u.id}" aria-label="Delete unit">${icon('trash', { size: 13 })}</button>
        </div>`
        )
        .join('')}</div>`
    : emptyState({ icon: 'checklist', title: 'No units yet', description: 'Break this resource into checkable units.', size: 'sm' });
  return `
    <div class="resource-units">
      <div class="resource-units__summary">${done} of ${list.length} unit${list.length === 1 ? '' : 's'} complete</div>
      ${rows}
      <form class="subitem-add" id="unit-add-form">
        <input id="unit-add-title" type="text" placeholder="New unit\u2026" aria-label="Unit title" />
        <button type="submit" class="btn btn--primary btn--sm">${icon('plus', { size: 14 })}<span>Add</span></button>
      </form>
    </div>`;
}

// Panel event delegation — unit toggles/add/delete, edit/delete, links.
function initPanelInteractions() {
  const panel = document.getElementById('resource-detail-panel');
  if (panel.dataset.interactions) return;
  panel.dataset.interactions = '1';

  panel.addEventListener('click', (e) => {
    const resourceEl = panel.querySelector('[data-resource-id]');
    const r = resources.find((x) => x.id === resourceEl?.dataset.resourceId);

    const check = e.target.closest('.resource-unit__check');
    if (check && r) {
      const u = r.units?.find((x) => x.id === check.closest('.resource-unit').dataset.unitId);
      if (u) {
        u.done = !u.done;
        r.updatedAt = new Date().toISOString().slice(0, 10);
        saveResources();
        afterUnitChange();
      }
      return;
    }

    const del = e.target.closest('[data-unit-delete]');
    if (del && r && r.units) {
      const idx = r.units.findIndex((u) => u.id === del.dataset.unitDelete);
      if (idx !== -1) r.units.splice(idx, 1);
      r.updatedAt = new Date().toISOString().slice(0, 10);
      saveResources();
      afterUnitChange();
      return;
    }

    const edit = e.target.closest('#resource-detail-edit');
    if (edit && r) {
      openResourceDialog('edit', r, () => { refreshDetailPanel(); refreshAll(); });
      return;
    }

    const remove = e.target.closest('#resource-detail-delete');
    if (remove && r) {
      if (window.confirm(`Delete "${r.title}"? This can\u2019t be undone.`)) {
        const idx = resources.findIndex((x) => x.id === r.id);
        if (idx !== -1) resources.splice(idx, 1);
        saveResources();
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

  panel.addEventListener('submit', (e) => {
    if (!e.target.matches('#unit-add-form')) return;
    e.preventDefault();
    const resourceEl = panel.querySelector('[data-resource-id]');
    const r = resources.find((x) => x.id === resourceEl?.dataset.resourceId);
    const title = document.getElementById('unit-add-title').value.trim();
    if (!r || !title) return;
    if (!r.units) r.units = [];
    r.units.push({ id: unitId(), title, done: false });
    r.updatedAt = new Date().toISOString().slice(0, 10);
    saveResources();
    afterUnitChange();
  });
}

function afterUnitChange() {
  invalidateVisibleResourcesCache();
  refreshDetailPanel();
  renderStats();
  renderCharts();
  renderView();
}

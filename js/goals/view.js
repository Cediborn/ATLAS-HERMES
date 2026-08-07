// Atlas — Goals page controller. The only file in the module that touches the
// DOM or wires events; data.js/state.js/components.js stay pure.

import { icon } from '../icons.js';
import { createPopover } from '../popover.js';
import { StatCard, SectionCard, Badge, emptyState } from '../components.js';
import { navigate } from '../router.js';
import { goals, GOAL_TYPES, GOAL_STATUSES, GOAL_CATEGORIES, CATEGORY_CONFIG, GOAL_STATUS_CONFIG } from './data.js';
import {
  getState,
  setState,
  getVisibleGoals,
  invalidateVisibleGoalsCache,
  resetFilters,
  computeGoalStats,
  categoryProgress,
  statusDistribution,
  buildTimeline,
  SORT_OPTIONS,
  formatDate,
  timeAgo,
  daysUntil,
} from './state.js';
import {
  GoalCard,
  GoalRow,
  GoalTimelineItem,
  GoalHeader,
  GoalProgress,
  MilestoneChecklist,
  GoalForecast,
  GoalSkeleton,
  GoalEmptyState,
  GoalCategory,
} from './components.js';
import { projects } from '../projects/data.js';
import { habits } from '../habits/data.js';

export function renderGoals(container) {
  container.innerHTML = `
    <div class="goals-page">
      <div class="goals-toolbar">
        <label class="toolbar-search" for="goals-search">
          ${icon('search', { size: 16 })}
          <input type="text" id="goals-search" placeholder="Search goals\u2026" autocomplete="off" />
        </label>

        <button type="button" class="btn btn--primary goals-toolbar__new" id="goals-new">
          ${icon('plus', { size: 16 })}<span>New Goal</span>
        </button>

        <div class="toolbar-spacer"></div>

        <div class="view-switcher" role="tablist" aria-label="View">
          <button type="button" class="view-switcher__option is-active" role="tab" aria-selected="true" data-view="grid">${icon('grid', { size: 15 })}<span>Grid</span></button>
          <button type="button" class="view-switcher__option" role="tab" aria-selected="false" data-view="list">${icon('checklist', { size: 15 })}<span>List</span></button>
          <button type="button" class="view-switcher__option" role="tab" aria-selected="false" data-view="timeline">${icon('clock', { size: 15 })}<span>Timeline</span></button>
        </div>

        <div class="toolbar-popover">
          <button type="button" class="btn btn--secondary" id="goals-filter-trigger">
            ${icon('filter', { size: 15 })}<span>Filter</span><span class="badge badge--accent" id="goals-filter-count" hidden></span>
          </button>
          <div class="menu goals-filter-panel" id="goals-filter-panel" hidden></div>
        </div>

        <div class="toolbar-popover">
          <button type="button" class="btn btn--secondary" id="goals-sort-trigger">${icon('sort', { size: 15 })}<span>Sort</span></button>
          <div class="menu" id="goals-sort-panel" hidden></div>
        </div>

        <div class="toolbar-popover">
          <button type="button" class="icon-btn" id="goals-more-trigger" aria-label="More actions">${icon('moreHorizontal', { size: 18 })}</button>
          <div class="menu menu--right" id="goals-more-panel" hidden></div>
        </div>
      </div>

      <div class="goals-stats" id="goals-stats"></div>

      <div class="goals-charts" id="goals-charts"></div>

      <div class="goals-view" id="goals-view"></div>
    </div>

    <div class="overlay goal-detail-overlay" id="goal-detail-overlay" hidden>
      <aside class="goal-detail-panel" role="dialog" aria-modal="true" aria-label="Goal details" id="goal-detail-panel"></aside>
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

export function renderGoalsSkeleton(container) {
  container.innerHTML = `<div class="goals-page"><div class="goals-view">${GoalSkeleton({ count: 6 })}</div></div>`;
}

// ================= STATS + CHARTS =================
function renderStats() {
  const el = document.getElementById('goals-stats');
  const s = computeGoalStats(goals);
  el.innerHTML = [
    StatCard({ title: 'Active goals', value: String(s.active.length), icon: 'target', accent: 'accent' }),
    StatCard({ title: 'Completed', value: String(s.completed), icon: 'check', accent: 'success' }),
    StatCard({ title: 'At risk', value: String(s.atRisk.length), icon: 'clock', accent: 'danger' }),
    StatCard({ title: 'Avg progress', value: `${s.avgProgress}%`, icon: 'trendingUp', accent: 'warning' }),
  ].join('');
}

function renderCharts() {
  const el = document.getElementById('goals-charts');
  const byCategory = categoryProgress(goals);
  const byStatus = statusDistribution(goals);

  const categoryBody = byCategory.length
    ? byCategory
        .map((c) => {
          const cfg = CATEGORY_CONFIG[c.category];
          return `
          <div class="goal-chart-row">
            <span class="goal-chart-row__label">${GoalCategory({ category: c.category, compact: true })}<span class="goal-chart-row__count">${c.count}</span></span>
            ${GoalProgress({ percentage: c.progress, variant: 'bar', color: 'accent' })}
            <span class="goal-chart-row__value">${c.progress}%</span>
          </div>`;
        })
        .join('')
    : emptyState({ icon: 'target', title: 'No category data', description: 'Add goals to see progress by category.', size: 'sm' });

  const statusBody = `
    <div class="goal-status-chart">
      ${byStatus
        .map(
          (s) => `
        <div class="goal-status-chart__row">
          <span class="goal-status-chart__label">${s.status}</span>
          <div class="goal-status-chart__track">
            <div class="goal-status-chart__fill goal-status-chart__fill--${(GOAL_STATUS_CONFIG[s.status] || { color: 'neutral' }).color}" style="width:${s.pct}%"></div>
          </div>
          <span class="goal-status-chart__count">${s.count}</span>
        </div>`
        )
        .join('')}
    </div>`;

  el.innerHTML = `
    ${SectionCard({ title: 'Progress by category', description: 'Average completion across each category', content: categoryBody })}
    ${SectionCard({ title: 'Goal status', description: 'How goals are distributed', content: statusBody })}
  `;
}

// ================= VIEW (grid / list / timeline) =================
function renderView() {
  const el = document.getElementById('goals-view');
  const { viewMode } = getState();
  el.className = `goals-view goals-view--${viewMode}`;

  const visible = getVisibleGoals(goals, getState());
  if (!visible.length) {
    el.innerHTML = GoalEmptyState({ hasFilters: hasActiveFilters() });
    return;
  }

  if (viewMode === 'list') {
    el.innerHTML = visible.map((g) => GoalRow({ goal: g })).join('');
    return;
  }

  if (viewMode === 'timeline') {
    const entries = buildTimeline(goals);
    el.innerHTML = entries.length
      ? `<ul class="goal-timeline">${entries.map((e) => GoalTimelineItem({ entry: e })).join('')}</ul>`
      : emptyState({ icon: 'clock', title: 'Nothing scheduled', description: 'Upcoming milestones and deadlines will land here.', size: 'md' });
    return;
  }

  el.innerHTML = visible.map((g) => GoalCard({ goal: g })).join('');
}

function hasActiveFilters() {
  const f = getState();
  return Boolean(f.search || f.typeFilter || f.categoryFilter.size || f.statusFilter.size);
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
  const view = document.getElementById('goals-view');
  view.addEventListener('click', (e) => {
    const row = e.target.closest('.goal-card, .goal-row');
    if (row) openDetail(row.dataset.id);
  });
  view.addEventListener('click', (e) => {
    const item = e.target.closest('.goal-timeline__item');
    if (item) openDetail(item.dataset.goalId);
  });
  view.addEventListener('keydown', (e) => {
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && (t.classList.contains('goal-card') || t.classList.contains('goal-row'))) {
      e.preventDefault();
      openDetail(t.dataset.id);
    }
  });
}

// ================= TOOLBAR =================
function initToolbar() {
  const searchInput = document.getElementById('goals-search');
  searchInput.addEventListener('input', () => {
    setState({ search: searchInput.value });
    renderView();
  });

  document.getElementById('goals-new').addEventListener('click', () => {
    // No create-goal backend yet — opens quick-capture instead of a dead button.
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

function typeRadio(value, checked, label) {
  return `
    <label class="menu__item filter-checkbox">
      <input type="radio" name="goal-type" data-filter-type="type" value="${value || ''}" ${checked ? 'checked' : ''} />
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
  const trigger = document.getElementById('goals-filter-trigger');
  const panel = document.getElementById('goals-filter-panel');

  function render() {
    const f = getState();
    panel.innerHTML = `
      <div class="menu__label">Type</div>
      ${typeRadio('', !f.typeFilter, 'All goals')}
      ${GOAL_TYPES.map((t) => typeRadio(t.id, f.typeFilter === t.id, t.label)).join('')}
      <div class="menu__divider"></div>
      <div class="menu__label">Category</div>
      ${GOAL_CATEGORIES.map((c) => filterCheckbox('category', c, f.categoryFilter.has(c), CATEGORY_CONFIG[c].label)).join('')}
      <div class="menu__divider"></div>
      <div class="menu__label">Status</div>
      ${GOAL_STATUSES.map((s) => filterCheckbox('status', s, f.statusFilter.has(s))).join('')}
      <div class="menu__divider"></div>
      ${filterCheckbox('showArchived', '', f.showArchived, 'Show archived')}
      <div class="menu__divider"></div>
      <button type="button" class="menu__item" id="goals-filter-clear">${icon('x', { size: 16 })}<span>Clear filters</span></button>
    `;
  }

  createPopover({ trigger, panel, onOpenRender: render });

  panel.addEventListener('change', (e) => {
    const input = e.target;
    const type = input.dataset.filterType;
    if (type === 'type') setState({ typeFilter: input.value || null });
    else if (type === 'category') toggleSetFilter('categoryFilter', input.value, input.checked);
    else if (type === 'status') toggleSetFilter('statusFilter', input.value, input.checked);
    else if (type === 'showArchived') setState({ showArchived: input.checked });
    renderView();
    updateFilterCount();
  });

  panel.addEventListener('click', (e) => {
    if (e.target.closest('#goals-filter-clear')) {
      resetFilters();
      render();
      renderView();
      updateFilterCount();
    }
  });
}

function updateFilterCount() {
  const f = getState();
  const count = f.categoryFilter.size + f.statusFilter.size + (f.typeFilter ? 1 : 0);
  const badge = document.getElementById('goals-filter-count');
  badge.hidden = count === 0;
  badge.textContent = String(count);
}

function initSortPopover() {
  const trigger = document.getElementById('goals-sort-trigger');
  const panel = document.getElementById('goals-sort-panel');

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
  const trigger = document.getElementById('goals-more-trigger');
  const panel = document.getElementById('goals-more-panel');

  function render() {
    panel.innerHTML = `<button type="button" class="menu__item" id="goals-more-shortcuts">${icon('search', { size: 16 })}<span>Keyboard shortcuts</span></button>`;
  }

  const popover = createPopover({ trigger, panel, onOpenRender: render });

  panel.addEventListener('click', (e) => {
    if (e.target.closest('#goals-more-shortcuts')) {
      popover.close();
      document.getElementById('search-trigger').click();
    }
  });
}

// ================= DETAIL PANEL =================
let lastFocusedBeforeDetail = null;

function initDetailPanel() {
  const overlay = document.getElementById('goal-detail-overlay');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDetail();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) closeDetail();
  });
}

function openDetail(goalId) {
  const g = goals.find((x) => x.id === goalId);
  if (!g) return;
  lastFocusedBeforeDetail = document.activeElement;
  const overlay = document.getElementById('goal-detail-overlay');
  const panel = document.getElementById('goal-detail-panel');
  panel.innerHTML = renderDetailContent(g);
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  panel.querySelector('#goal-detail-close').addEventListener('click', closeDetail);
  panel.querySelector('#goal-detail-close').focus();
}

function closeDetail() {
  const overlay = document.getElementById('goal-detail-overlay');
  overlay.hidden = true;
  document.body.style.overflow = '';
  lastFocusedBeforeDetail?.focus?.();
}

function refreshDetailPanel() {
  const panel = document.getElementById('goal-detail-panel');
  const scrollEl = panel.querySelector('.goal-detail-panel__scroll');
  const goalId = panel.querySelector('[data-goal-id]')?.dataset.goalId;
  const g = goals.find((x) => x.id === goalId);
  if (!g) return;
  const scrollTop = scrollEl?.scrollTop || 0;
  panel.innerHTML = renderDetailContent(g);
  panel.querySelector('#goal-detail-close').addEventListener('click', closeDetail);
  if (scrollEl) scrollEl.scrollTop = scrollTop;
}

function renderDetailContent(g) {
  const linkedProjects = g.linkedProjects.map((id) => projects.find((p) => p.id === id)).filter(Boolean);
  const linkedHabits = g.linkedHabits.map((id) => habits.find((h) => h.id === id)).filter(Boolean);
  const nextMilestone = (g.milestones || []).find((m) => !m.done);
  const progressColor = g.status === 'Completed' ? 'success' : g.status === 'Archived' ? 'neutral' : 'accent';

  return `
    <button type="button" class="icon-btn goal-detail-panel__close" id="goal-detail-close" aria-label="Close panel">${icon('x', { size: 18 })}</button>
    <div class="goal-detail-panel__scroll" data-goal-id="${g.id}">
      ${GoalHeader({ goal: g })}
      <p class="goal-detail-panel__desc">${g.description}</p>

      ${detailSection('Progress', `
        <div class="goal-detail-panel__progress-row">
          ${GoalProgress({ percentage: g.progress, variant: 'ring', size: 56, color: progressColor })}
          <div class="goal-detail-panel__progress-copy">
            <div>${g.milestonesDone} of ${g.milestonesTotal} milestones complete</div>
            ${nextMilestone ? `<div class="goal-detail-panel__muted">Next: ${nextMilestone.title} \u2014 ${formatDate(nextMilestone.due)}${daysUntil(nextMilestone.due) < 0 ? ' (overdue)' : ''}</div>` : ''}
          </div>
        </div>
      `)}

      ${detailSection('Completion forecast', GoalForecast({ forecast: g.forecast }))}

      ${detailSection('Milestones', MilestoneChecklist({ goal: g }))}

      ${detailSection('Links', `
        ${linkedProjects.length || linkedHabits.length
          ? `
            <div class="goal-detail-panel__links">
              ${linkedProjects.map((p) => linkRow({ iconName: 'folder', label: p.title, sub: `Project \u00b7 ${p.status}`, route: 'projects' })).join('')}
              ${linkedHabits.map((h) => linkRow({ iconName: h.icon, label: h.title, sub: `Habit \u00b7 ${h.category}`, route: 'habits' })).join('')}
            </div>`
          : emptyState({ icon: 'layers', title: 'No linked items', description: 'Link projects and habits to see them here.', size: 'sm' })
        }`
      )}

      ${detailSection('Timeline', `
        <div class="settings-row"><span class="settings-row__body">Started</span><span>${formatDate(g.startDate)}</span></div>
        <div class="settings-row"><span class="settings-row__body">Deadline</span><span>${g.deadline ? `${formatDate(g.deadline)} (${daysUntil(g.deadline)}d)` : '\u2014'}</span></div>
        <div class="settings-row"><span class="settings-row__body">Last updated</span><span>${timeAgo(g.updatedAt)}</span></div>
      `)}

      ${detailSection('Statistics', `
        <div class="goal-detail-panel__stats-grid">
          ${statBlock(`${g.progress}%`, 'Progress')}
          ${statBlock(g.milestonesTotal, 'Milestones')}
          ${statBlock(g.milestonesDone, 'Done')}
          ${statBlock(g.linkedProjects.length + g.linkedHabits.length, 'Links')}
        </div>
      `)}
    </div>
  `;
}

function detailSection(title, content) {
  return `<section class="goal-detail-panel__section"><h4>${title}</h4>${content}</section>`;
}

function linkRow({ iconName, label, sub, route }) {
  return `
    <button type="button" class="goal-link" data-link-route="${route}">
      <span class="goal-link__icon">${icon(iconName, { size: 15 })}</span>
      <span class="goal-link__body">
        <span class="goal-link__title">${label}</span>
        <span class="goal-link__meta">${sub}</span>
      </span>
      ${icon('chevronRight', { size: 14, className: 'goal-link__chevron' })}
    </button>`;
}

function statBlock(value, label) {
  return `<div class="goal-detail-panel__stat"><span class="goal-detail-panel__stat-value">${value}</span><span class="goal-detail-panel__stat-label">${label}</span></div>`;
}

// Panel event delegation — milestone toggles + link navigation.
function initPanelInteractions() {
  const panel = document.getElementById('goal-detail-panel');
  if (panel.dataset.interactions) return;
  panel.dataset.interactions = '1';

  panel.addEventListener('click', (e) => {
    const check = e.target.closest('.goal-milestone__check');
    if (check) {
      const row = check.closest('.goal-milestone');
      const goalEl = panel.querySelector('[data-goal-id]');
      const g = goals.find((x) => x.id === goalEl?.dataset.goalId);
      const m = g?.milestones?.find((x) => x.id === row.dataset.milestoneId);
      if (g && m) {
        m.done = !m.done;
        invalidateVisibleGoalsCache();
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

// Atlas — Habits page controller. Same rule as projects/view.js: this is the
// only file in the module that touches the DOM or wires events; data/state/
// components stay pure.

import { icon } from '../icons.js';
import { createPopover } from '../popover.js';
import { emptyState } from '../components.js';
import { StatCard } from '../components.js';
import { habits, isDueOn, CATEGORY_CONFIG, PRIORITIES } from './data.js';
import {
  getState, setState, resetFilters, getVisibleHabits, SORT_OPTIONS,
  computeStreak, computeSuccessRate, dayState, cycleCompletion, getStatusOn,
  computeDashboardStats, buildWeeklyOverview, buildHeatmapMonth, topStreaks, computeTrend,
  categoryStats, toggleFavorite, toggleArchived, duplicateHabit, deleteHabit,
} from './state.js';
import { HabitCard, HabitSkeleton, HabitsEmptyState, CategoryHeader, StreakCard, WeeklyOverview, HeatmapGrid } from './components.js';
import { openHabitDialog } from './habit-dialog.js';
import { todayKey, addMonths } from '../date-utils.js';

// Page-local UI state that resets on every visit (not persisted) — same
// treatment Calendar gives its own mini-calendar month, not a stored preference.
let heatmapMonth = new Date();
let collapsedCategories = new Set();
let streakTabKind = 'current';

export function renderHabits(container) {
  heatmapMonth = new Date();
  collapsedCategories = new Set();
  streakTabKind = 'current';

  container.innerHTML = `
    <div class="habits-page">
      <header class="habits-header">
        <div class="habits-header__top">
          <div>
            <h2>Habits</h2>
            <p class="habits-header__date">${new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</p>
          </div>
          <div class="habits-header__summary" id="habits-header__summary"></div>
        </div>
        <div class="habits-toolbar">
          <label class="toolbar-search" for="habits-search">
            ${icon('search', { size: 16 })}
            <input type="text" id="habits-search" placeholder="Search habits\u2026" autocomplete="off" />
          </label>
          <button type="button" class="btn btn--primary" id="habits-new">${icon('plus', { size: 16 })}<span>New habit</span></button>
          <div class="toolbar-spacer"></div>
          <div class="toolbar-popover">
            <button type="button" class="btn btn--secondary" id="habits-filter-trigger">${icon('filter', { size: 15 })}<span>Filter</span><span class="badge badge--accent" id="habits-filter-count" hidden></span></button>
            <div class="menu" id="habits-filter-panel" hidden></div>
          </div>
          <div class="toolbar-popover">
            <button type="button" class="btn btn--secondary" id="habits-sort-trigger">${icon('sort', { size: 15 })}<span>Sort</span></button>
            <div class="menu" id="habits-sort-panel" hidden></div>
          </div>
          <button type="button" class="icon-btn" disabled title="Import \u2014 coming in a later milestone" aria-label="Import">${icon('upload', { size: 16 })}</button>
          <button type="button" class="icon-btn" disabled title="Export \u2014 coming in a later milestone" aria-label="Export">${icon('download', { size: 16 })}</button>
          <button type="button" class="icon-btn" disabled title="Habit settings \u2014 coming in a later milestone" aria-label="Habit settings">${icon('settings', { size: 16 })}</button>
        </div>
      </header>

      <div class="habits-dashboard" id="habits-dashboard"></div>

      <div class="habits-layout">
        <div class="habits-main" id="habits-main"></div>
        <aside class="habits-insights" id="habits-insights"></aside>
      </div>
    </div>

    <div id="habits-live" aria-live="polite" style="position:absolute;width:1px;height:1px;overflow:hidden;"></div>
  `;

  initToolbar();
  initMainInteractions();
  refreshAll();
}

// Shown briefly by the router while the habits.js chunk is still being
// fetched — same real (if brief) loading gap Projects/Notes/Calendar cover.
export function renderHabitsSkeleton(container) {
  container.innerHTML = `<div class="habits-page"><div class="habits-main">${HabitSkeleton({ count: 5 })}</div></div>`;
}

// ================= REFRESH — mutations re-render dashboard+main+insights;
// dataset is tiny (11 mock habits) so a full recompute-and-repaint is simpler
// and cheap enough, same choice Projects makes on every card action. =================
function announce(habit, status) {
  const live = document.getElementById('habits-live');
  if (!live || !habit) return;
  const text = status === 'done' ? `${habit.title} marked complete \u2014 ${computeStreak(habit).current} day streak`
    : status === 'skipped' ? `${habit.title} skipped for today`
    : `${habit.title} marked incomplete`;
  live.textContent = text;
}

function refreshAll() {
  renderHeaderSummary();
  renderDashboardStats();
  renderMain();
  renderInsights();
}

function renderHeaderSummary() {
  const s = computeDashboardStats();
  document.getElementById('habits-header__summary').innerHTML = `
    <span class="habits-header__summary-item"><strong>${s.todayCompletionPct}%</strong> today</span>
    <span class="habits-header__summary-item"><strong>${s.currentStreak}d</strong> best streak</span>
    <span class="habits-header__summary-item"><strong>${s.consistencyScore}%</strong> consistency</span>
  `;
}

// ================= DASHBOARD (12 stat cards \u2014 see state.js for what
// each one means; a couple are deliberately different windows so they
// don't just restate each other under a different label) =================
function renderDashboardStats() {
  const s = computeDashboardStats();
  const cards = [
    { title: 'Active Habits', value: String(s.activeHabits), icon: 'flame' },
    { title: "Today's Completion", value: `${s.todayCompletionPct}%`, icon: 'target', accent: 'accent' },
    { title: 'Weekly Completion', value: `${s.weeklyCompletionPct}%`, icon: 'calendar' },
    { title: 'Monthly Completion', value: `${s.monthlyCompletionPct}%`, icon: 'calendar' },
    { title: 'Current Streak', value: `${s.currentStreak}d`, icon: 'flame', accent: 'warning' },
    { title: 'Longest Streak', value: `${s.longestStreak}d`, icon: 'trophy', accent: 'warning' },
    { title: 'Total Completions', value: String(s.totalCompletions), icon: 'check', accent: 'success' },
    { title: 'Skipped (30d)', value: String(s.skippedHabits), icon: 'arrowRight' },
    { title: 'Missed (30d)', value: String(s.missedHabits), icon: 'x', accent: 'danger' },
    { title: 'Archived Habits', value: String(s.archivedHabits), icon: 'archive' },
    { title: 'Completion %', value: `${s.completionPercentage}%`, icon: 'sparkle' },
    { title: 'Consistency Score', value: `${s.consistencyScore}%`, icon: 'target', accent: 'success' },
  ];
  document.getElementById('habits-dashboard').innerHTML = cards.map((c) => StatCard(c)).join('');
}

// ================= MAIN LIST \u2014 grouped by category (this doubles as
// the spec's separate "Habit Categories" section rather than a second,
// duplicate list \u2014 see BUILD_LOG) =================
function hasActiveFilters() {
  const f = getState();
  return Boolean(f.search || f.categoryFilter.size || f.priorityFilter.size || f.favoritesOnly || f.statusFilter !== 'active');
}

function renderMain() {
  const main = document.getElementById('habits-main');
  const f = getState();
  const visible = getVisibleHabits(habits, f);

  if (!visible.length) {
    main.innerHTML = HabitsEmptyState({ hasFilters: hasActiveFilters() });
    return;
  }

  const todayK = todayKey();
  const grouped = new Map();
  for (const h of visible) {
    if (!grouped.has(h.category)) grouped.set(h.category, []);
    grouped.get(h.category).push(h);
  }
  const orderedEntries = Object.keys(CATEGORY_CONFIG)
    .filter((catKey) => grouped.has(catKey))
    .map((catKey) => [catKey, grouped.get(catKey)]);

  main.innerHTML = orderedEntries
    .map(([catKey, list]) => {
      const stats = categoryStats(catKey, visible);
      const collapsed = collapsedCategories.has(catKey);
      const cardsHtml = list
        .map((h) => {
          const streak = computeStreak(h);
          const successRate = computeSuccessRate(h);
          const todayState = dayState(h, new Date());
          return HabitCard({ habit: h, streak, successRate, todayState, todayKeyStr: todayK });
        })
        .join('');
      return `
      <section class="habits-category" data-category="${catKey}">
        ${CategoryHeader({ categoryKey: catKey, stats, collapsed })}
        <div class="habits-category__list" ${collapsed ? 'hidden' : ''}>${cardsHtml}</div>
      </section>`;
    })
    .join('');
}

function initMainInteractions() {
  const main = document.getElementById('habits-main');

  main.addEventListener('click', (e) => {
    // Completion button
    const completeBtn = e.target.closest('.completion-btn');
    if (completeBtn && !completeBtn.disabled) {
      const next = cycleCompletion(completeBtn.dataset.habitId, completeBtn.dataset.date);
      const h = habits.find((x) => x.id === completeBtn.dataset.habitId);
      announce(h, next);
      refreshAll();
      return;
    }

    // Category collapse/expand
    const catHeader = e.target.closest('.category-header');
    if (catHeader) {
      const key = catHeader.dataset.category;
      if (collapsedCategories.has(key)) collapsedCategories.delete(key);
      else collapsedCategories.add(key);
      renderMain();
      return;
    }

    // Card action menu items
    const actionItem = e.target.closest('[data-action]');
    if (actionItem) {
      const habitId = actionItem.closest('.action-menu')?.querySelector('.action-menu__trigger')?.dataset.id;
      closeAllActionMenus();
      if (habitId) handleCardAction(habitId, actionItem.dataset.action);
      return;
    }

    // Menu trigger toggle
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

    // Card body -> edit (no separate read-only detail panel this milestone;
    // the card already surfaces the key fields \u2014 see BUILD_LOG)
    const card = e.target.closest('.habit-card');
    if (card && !card.classList.contains('habit-card--skeleton')) {
      const h = habits.find((x) => x.id === card.dataset.id);
      if (h) openHabitDialog('edit', h, refreshAll);
    }
  });

  main.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('habit-card')) {
      e.preventDefault();
      const h = habits.find((x) => x.id === e.target.dataset.id);
      if (h) openHabitDialog('edit', h, refreshAll);
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.action-menu')) closeAllActionMenus();
  });
}

function closeAllActionMenus() {
  document.querySelectorAll('.action-menu__panel').forEach((p) => {
    p.hidden = true;
  });
  document.querySelectorAll('.action-menu__trigger').forEach((b) => b.setAttribute('aria-expanded', 'false'));
}

function handleCardAction(habitId, action) {
  const h = habits.find((x) => x.id === habitId);
  if (!h) return;
  if (action === 'edit') {
    openHabitDialog('edit', h, refreshAll);
    return;
  }
  if (action === 'favorite') toggleFavorite(habitId);
  else if (action === 'archive') toggleArchived(habitId);
  else if (action === 'duplicate') duplicateHabit(habitId);
  else if (action === 'delete') {
    if (!window.confirm(`Delete "${h.title}"? This can\u2019t be undone.`)) return;
    deleteHabit(habitId);
  }
  refreshAll();
}

// ================= TOOLBAR =================
function initToolbar() {
  const searchInput = document.getElementById('habits-search');
  searchInput.addEventListener('input', () => {
    setState({ search: searchInput.value });
    renderMain();
  });

  document.getElementById('habits-new').addEventListener('click', () => {
    openHabitDialog('create', null, refreshAll);
  });

  initFilterPopover();
  initSortPopover();
}

function filterCheckbox(type, value, checked, label) {
  return `
    <label class="menu__item filter-checkbox">
      <input type="checkbox" data-filter-type="${type}" value="${value}" ${checked ? 'checked' : ''} />
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
  const trigger = document.getElementById('habits-filter-trigger');
  const panel = document.getElementById('habits-filter-panel');

  function render() {
    const f = getState();
    panel.innerHTML = `
      <div class="menu__label">Status</div>
      ${filterCheckbox('status', 'active', f.statusFilter === 'active', 'Active')}
      ${filterCheckbox('status', 'archived', f.statusFilter === 'archived', 'Archived')}
      ${filterCheckbox('status', 'all', f.statusFilter === 'all', 'All')}
      <div class="menu__divider"></div>
      <div class="menu__label">Category</div>
      ${Object.keys(CATEGORY_CONFIG).map((c) => filterCheckbox('category', c, f.categoryFilter.has(c), CATEGORY_CONFIG[c].label)).join('')}
      <div class="menu__divider"></div>
      <div class="menu__label">Priority</div>
      ${PRIORITIES.map((p) => filterCheckbox('priority', p, f.priorityFilter.has(p), p)).join('')}
      <div class="menu__divider"></div>
      ${filterCheckbox('favoritesOnly', 'on', f.favoritesOnly, 'Favorites only')}
      <div class="menu__divider"></div>
      <button type="button" class="menu__item" id="habits-filter-clear">${icon('x', { size: 16 })}<span>Clear filters</span></button>
    `;
  }

  createPopover({ trigger, panel, onOpenRender: render });

  panel.addEventListener('change', (e) => {
    const cb = e.target;
    const type = cb.dataset.filterType;
    if (type === 'status') setState({ statusFilter: cb.value });
    else if (type === 'category') toggleSetFilter('categoryFilter', cb.value, cb.checked);
    else if (type === 'priority') toggleSetFilter('priorityFilter', cb.value, cb.checked);
    else if (type === 'favoritesOnly') setState({ favoritesOnly: cb.checked });
    renderMain();
    updateFilterCount();
  });

  panel.addEventListener('click', (e) => {
    if (e.target.closest('#habits-filter-clear')) {
      resetFilters();
      render();
      renderMain();
      updateFilterCount();
    }
  });
}

function updateFilterCount() {
  const f = getState();
  const count = f.categoryFilter.size + f.priorityFilter.size + (f.favoritesOnly ? 1 : 0) + (f.statusFilter !== 'active' ? 1 : 0);
  const badge = document.getElementById('habits-filter-count');
  badge.hidden = count === 0;
  badge.textContent = String(count);
}

function initSortPopover() {
  const trigger = document.getElementById('habits-sort-trigger');
  const panel = document.getElementById('habits-sort-panel');

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
      renderMain();
      popover.close();
    }
  });
}

// ================= INSIGHTS (right panel) — weekly overview, monthly
// heatmap, streak leaderboard. See CalendarView note in BUILD_LOG for why
// this isn't a third calendar UI. =================
function renderInsights() {
  const aside = document.getElementById('habits-insights');
  const days = buildWeeklyOverview();
  const cells = buildHeatmapMonth(heatmapMonth);
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(heatmapMonth);
  const currentTop = topStreaks('current', 5);
  const longestTop = topStreaks('longest', 5);
  const activeList = streakTabKind === 'longest' ? longestTop : currentTop;

  aside.innerHTML = `
    <section class="insights-card">
      <h3 class="insights-card__title">${icon('calendar', { size: 15 })}<span>This week</span></h3>
      ${WeeklyOverview({ days })}
      <div class="weekly-overview__detail" id="weekly-overview-detail" hidden></div>
    </section>
    <section class="insights-card">
      <h3 class="insights-card__title">${icon('flame', { size: 15 })}<span>Activity</span></h3>
      ${HeatmapGrid({ cells, monthLabel })}
    </section>
    <section class="insights-card">
      <h3 class="insights-card__title">${icon('trophy', { size: 15 })}<span>Streaks</span></h3>
      <div class="streaks-tabs" role="tablist">
        <button type="button" class="streaks-tabs__option${streakTabKind === 'current' ? ' is-active' : ''}" data-streak-tab="current" role="tab" aria-selected="${streakTabKind === 'current'}">Current</button>
        <button type="button" class="streaks-tabs__option${streakTabKind === 'longest' ? ' is-active' : ''}" data-streak-tab="longest" role="tab" aria-selected="${streakTabKind === 'longest'}">Longest</button>
      </div>
      <div class="streaks-list" id="streaks-list">
        ${
          activeList.length
            ? activeList.map((x, i) => StreakCard({ habit: x.habit, streak: x.streak, trend: computeTrend(x.habit), rank: i + 1, kind: streakTabKind })).join('')
            : emptyState({ icon: 'flame', title: 'No streaks yet', description: 'Complete a habit to start one.', size: 'sm' })
        }
      </div>
    </section>
  `;

  aside.querySelectorAll('[data-heatmap-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      heatmapMonth = addMonths(heatmapMonth, btn.dataset.heatmapNav === 'next' ? 1 : -1);
      renderInsights();
    });
  });

  aside.querySelectorAll('[data-streak-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      streakTabKind = btn.dataset.streakTab;
      renderInsights();
    });
  });

  aside.querySelectorAll('.weekly-overview__day').forEach((btn) => {
    btn.addEventListener('click', () => openWeeklyDayDetail(btn));
  });
}

function openWeeklyDayDetail(btn) {
  const detail = document.getElementById('weekly-overview-detail');
  const dateKeyStr = btn.dataset.date;
  const alreadyOpenForThisDay = detail.dataset.date === dateKeyStr && !detail.hidden;

  document.querySelectorAll('.weekly-overview__day').forEach((b) => b.classList.remove('is-selected'));

  if (alreadyOpenForThisDay) {
    detail.hidden = true;
    detail.dataset.date = '';
    return;
  }

  btn.classList.add('is-selected');
  const dueList = habits.filter((h) => !h.archived && isDueOn(h, new Date(`${dateKeyStr}T00:00:00`)));
  detail.dataset.date = dateKeyStr;
  detail.hidden = false;
  detail.innerHTML = dueList.length
    ? dueList
        .map((h) => {
          const status = getStatusOn(h.id, dateKeyStr) || (dateKeyStr < todayKey() ? 'missed' : 'incomplete');
          return `
        <div class="weekly-overview__detail-row">
          <span class="weekly-overview__detail-icon weekly-overview__detail-icon--${h.color}">${icon(h.icon, { size: 13 })}</span>
          <span class="weekly-overview__detail-title">${h.title}</span>
          <span class="weekly-overview__detail-status weekly-overview__detail-status--${status}">${status}</span>
        </div>`;
        })
        .join('')
    : '<p class="weekly-overview__detail-empty">Nothing scheduled.</p>';
}

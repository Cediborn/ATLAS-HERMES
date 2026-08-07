// Atlas — Habits components. Presentation-only, same rule as
// projects/components.js: no DOM queries, no event listeners. view.js wires
// behavior on top; habit-dialog.js owns the create/edit form.

import { icon } from '../icons.js';
import { Badge, Progress, Tag, emptyState } from '../components.js';
import { CATEGORY_CONFIG } from './data.js';
import { formatFrequency, formatReminderTime, nextMilestone } from './state.js';

// ---- CompletionButton — one control, five states. Checkmark draw, ring
// fill, and the ripple are all CSS (see habits.css); the global
// prefers-reduced-motion override in base.css already zeroes every one of
// them, so nothing extra is needed here for that. ----
export function CompletionButton({ habitId, dateKeyStr, state }) {
  const disabled = state === 'locked' || state === 'missed';
  const labels = {
    done: 'Completed \u2014 mark incomplete',
    skipped: 'Skipped \u2014 clear',
    missed: 'Missed',
    locked: 'Not scheduled today',
    incomplete: 'Mark complete',
  };
  const glyph = state === 'done' ? icon('check', { size: 15 }) : state === 'skipped' ? icon('arrowRight', { size: 13 }) : '';
  return `
    <button type="button" class="completion-btn completion-btn--${state}" data-habit-id="${habitId}" data-date="${dateKeyStr}"
      role="checkbox" aria-checked="${state === 'done'}" aria-label="${labels[state] || labels.incomplete}" ${disabled ? 'disabled' : ''}>
      <span class="completion-btn__ring"></span>
      <span class="completion-btn__glyph">${glyph}</span>
    </button>`;
}

// ---- HabitActionMenu — the shared ActionMenu's item set (favorite/pin/
// archive) doesn't fit: habits aren't pinnable, and the spec asks for
// Edit/Duplicate/Delete too. Same visual pattern (.menu / .menu__item are
// shared classes), different item list. ----
export function HabitActionMenu({ id, itemLabel, favorite, archived }) {
  return `
    <div class="action-menu">
      <button type="button" class="icon-btn action-menu__trigger" data-id="${id}" aria-label="Actions for ${itemLabel}" aria-haspopup="true" aria-expanded="false">
        ${icon('moreHorizontal', { size: 16 })}
      </button>
      <div class="menu action-menu__panel" hidden>
        <button type="button" class="menu__item" data-action="edit">${icon('edit', { size: 16 })}<span>Edit</span></button>
        <button type="button" class="menu__item" data-action="duplicate">${icon('copy', { size: 16 })}<span>Duplicate</span></button>
        <button type="button" class="menu__item" data-action="favorite">${icon('star', { size: 16 })}<span>${favorite ? 'Remove from favorites' : 'Add to favorites'}</span></button>
        <div class="menu__divider"></div>
        <button type="button" class="menu__item" data-action="archive">${icon('archive', { size: 16 })}<span>${archived ? 'Unarchive' : 'Archive'}</span></button>
        <button type="button" class="menu__item menu__item--danger" data-action="delete">${icon('trash', { size: 16 })}<span>Delete</span></button>
      </div>
    </div>`;
}

// ---- HabitCard — streak/successRate/todayState are passed in rather than
// computed here, since view.js already computed them once for the whole
// list (avoids re-walking every habit's history per card). ----
export function HabitCard({ habit, streak, successRate, todayState, todayKeyStr }) {
  const cat = CATEGORY_CONFIG[habit.category];
  const milestone = nextMilestone(streak.current);
  const reminder = formatReminderTime(habit.reminderTime);
  return `
    <article class="habit-card" data-id="${habit.id}" tabindex="0">
      ${CompletionButton({ habitId: habit.id, dateKeyStr: todayKeyStr, state: todayState })}
      <div class="habit-card__body">
        <div class="habit-card__top">
          <span class="habit-card__icon habit-card__icon--${habit.color}">${icon(habit.icon, { size: 17 })}</span>
          <h3 class="habit-card__title">${habit.title}</h3>
          ${habit.favorite ? `<span class="habit-card__fav">${icon('star', { size: 14 })}</span>` : ''}
          ${Badge({ label: habit.priority })}
          ${HabitActionMenu({ id: habit.id, itemLabel: habit.title, favorite: habit.favorite, archived: habit.archived })}
        </div>
        ${habit.description ? `<p class="habit-card__desc">${habit.description}</p>` : ''}
        <div class="habit-card__meta">
          <span class="habit-card__meta-item" title="Current streak">${icon('flame', { size: 13 })}<span>${streak.current}d${milestone ? ` \u00b7 ${milestone - streak.current}d to ${milestone}` : ''}</span></span>
          <span class="habit-card__meta-item" title="Schedule">${icon('repeat', { size: 13 })}<span>${formatFrequency(habit)}</span></span>
          ${reminder ? `<span class="habit-card__meta-item" title="Reminder">${icon('clock', { size: 13 })}<span>${reminder}</span></span>` : ''}
          ${habit.goal ? `<span class="habit-card__meta-item" title="Goal">${icon('target', { size: 13 })}<span>${habit.goal.targetValue} ${habit.goal.unit}</span></span>` : ''}
        </div>
        <div class="habit-card__footer">
          ${Progress({ percentage: successRate, label: '30-day success rate', color: cat.color })}
          ${habit.tags.length ? `<div class="habit-card__tags">${habit.tags.map((t) => Tag({ label: t })).join('')}</div>` : ''}
        </div>
      </div>
    </article>`;
}

// ---- CategoryHeader — collapsible group header; also satisfies the
// spec's separate "Habit Categories" section (Today's Habits IS grouped by
// category rather than existing as two parallel lists — see BUILD_LOG). ----
export function CategoryHeader({ categoryKey, stats, collapsed }) {
  const cat = CATEGORY_CONFIG[categoryKey];
  return `
    <button type="button" class="category-header" data-category="${categoryKey}" aria-expanded="${!collapsed}">
      <span class="category-header__icon category-header__icon--${cat.color}">${icon(cat.icon, { size: 15 })}</span>
      <span class="category-header__label">${cat.label}</span>
      <span class="category-header__count">${stats.doneToday}/${stats.dueToday} today</span>
      <span class="category-header__progress">${Progress({ percentage: stats.pct, color: cat.color })}</span>
      <span class="category-header__chevron">${icon('chevronDown', { size: 16 })}</span>
    </button>`;
}

// ---- StreakCard — used by both the "Current Streaks" and "Longest
// Streaks" lists (kind decides which number is emphasized) ----
export function StreakCard({ habit, streak, trend, rank, kind = 'current' }) {
  const milestone = nextMilestone(streak.current);
  const headline = kind === 'longest' ? streak.longest : streak.current;
  const trendUp = trend >= 0;
  return `
    <div class="streak-card" data-id="${habit.id}">
      ${typeof rank === 'number' ? `<span class="streak-card__rank">#${rank}</span>` : ''}
      <span class="streak-card__icon streak-card__icon--${habit.color}">${icon(habit.icon, { size: 15 })}</span>
      <div class="streak-card__body">
        <span class="streak-card__title">${habit.title}</span>
        <span class="streak-card__meta">${streak.current}d current \u00b7 ${streak.longest}d best${milestone ? ` \u00b7 ${milestone - streak.current}d to ${milestone}` : ''}</span>
      </div>
      <span class="streak-card__headline">${headline}<small>d</small></span>
      <span class="streak-card__trend streak-card__trend--${trendUp ? 'up' : 'down'}">${trendUp ? '+' : ''}${trend}%</span>
    </div>`;
}

// ---- WeeklyOverview — rolling 7 days ending today ----
export function WeeklyOverview({ days }) {
  return `
    <div class="weekly-overview">
      ${days
        .map(
          (d) => `
        <button type="button" class="weekly-overview__day${d.isToday ? ' is-today' : ''}" data-date="${d.date}"
          aria-label="${d.label}, ${d.completionPct}% complete, ${d.completedCount} of ${d.dueCount} habits">
          <span class="weekly-overview__bar"><span class="weekly-overview__bar-fill" style="height:${Math.max(4, d.completionPct)}%"></span></span>
          <span class="weekly-overview__pct">${d.completionPct}%</span>
          <span class="weekly-overview__label">${d.label}</span>
        </button>`
        )
        .join('')}
    </div>`;
}

// ---- Monthly heatmap — GitHub-style, built on the shared monthGridDays
// grid (same helper Calendar's month view uses; see date-utils.js) ----
export function HeatmapGrid({ cells, monthLabel }) {
  const weekdayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return `
    <div class="heatmap">
      <div class="heatmap__header">
        <button type="button" class="icon-btn" data-heatmap-nav="prev" aria-label="Previous month">${icon('chevronRight', { size: 15, className: 'heatmap__chevron-left' })}</button>
        <span class="heatmap__month">${monthLabel}</span>
        <button type="button" class="icon-btn" data-heatmap-nav="next" aria-label="Next month">${icon('chevronRight', { size: 15 })}</button>
      </div>
      <div class="heatmap__weekdays" aria-hidden="true">${weekdayHeaders.map((w) => `<span>${w}</span>`).join('')}</div>
      <div class="heatmap__grid">
        ${cells
          .map((c) => {
            const showData = c.inCurrentMonth && c.completionPct !== null;
            const label = showData ? `${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(c.date)}: ${c.completionPct}% (${c.doneCount}/${c.dueCount})` : '';
            return `<span class="heatmap__cell heatmap__cell--${c.inCurrentMonth ? c.level || 'none' : 'outside'}" data-date="${c.key}" ${showData ? `tabindex="0" title="${label}" aria-label="${label}"` : 'aria-hidden="true"'}></span>`;
          })
          .join('')}
      </div>
      <div class="heatmap__legend">
        <span>Less</span>
        <span class="heatmap__cell heatmap__cell--none"></span>
        <span class="heatmap__cell heatmap__cell--low"></span>
        <span class="heatmap__cell heatmap__cell--medium"></span>
        <span class="heatmap__cell heatmap__cell--high"></span>
        <span class="heatmap__cell heatmap__cell--perfect"></span>
        <span>More</span>
      </div>
    </div>`;
}

export function HabitSkeleton({ count = 4 }) {
  return Array.from(
    { length: count },
    () => `
    <div class="habit-card habit-card--skeleton" aria-hidden="true">
      <div class="skeleton-block" style="width:40px;height:40px;border-radius:var(--radius-full);flex-shrink:0;"></div>
      <div class="habit-card__body">
        <div class="skeleton-block skeleton-block--title"></div>
        <div class="skeleton-block skeleton-block--text" style="width:80%"></div>
        <div class="skeleton-block skeleton-block--footer"></div>
      </div>
    </div>`
  ).join('');
}

export function HabitsEmptyState({ hasFilters }) {
  return hasFilters
    ? emptyState({ icon: 'search', title: 'No habits match', description: 'Try adjusting your filters or search.', size: 'md' })
    : emptyState({ icon: 'flame', title: 'No habits yet', description: 'Start your first habit to build a streak.', size: 'md' });
}

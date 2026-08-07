// Atlas — Goals components. Presentation-only functions returning markup —
// no DOM queries, no listeners, no state reads. view.js wires behavior on top.

import { icon } from '../icons.js';
import { Progress as BaseProgress, ProgressRing, emptyState, Badge } from '../components.js';
import { GOAL_STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG, GOAL_TYPES } from './data.js';
import { formatDate, daysUntil } from './state.js';

// ---- GoalStatusBadge ------------------------------------------------------
export function GoalStatusBadge({ status }) {
  const cfg = GOAL_STATUS_CONFIG[status] || { color: 'neutral' };
  return `<span class="goal-status goal-status--${cfg.color}">${status}</span>`;
}

// ---- GoalPriority — identical weight system to Projects ----
export function GoalPriority({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || { color: 'neutral', solid: false };
  const solid = cfg.solid ? ' goal-priority--solid' : '';
  return `<span class="goal-priority goal-priority--${cfg.color}${solid}"><span class="goal-priority__dot"></span>${priority}</span>`;
}

// ---- GoalType — Long-term / Short-term chip ----
export function GoalTypeChip({ type }) {
  const t = GOAL_TYPES.find((x) => x.id === type) || { label: type, icon: 'target' };
  return `<span class="goal-type-chip">${icon(t.icon, { size: 12 })}${t.label}</span>`;
}

// ---- GoalCategory — icon + label, tinted with the category's identity color ----
export function GoalCategory({ category, compact = false }) {
  const cfg = CATEGORY_CONFIG[category] || { label: category, icon: 'target', color: 'slate' };
  return `<span class="goal-category goal-category--${cfg.color}${compact ? ' goal-category--compact' : ''}">${icon(cfg.icon, { size: compact ? 12 : 13 })}<span>${cfg.label}</span></span>`;
}

// ---- GoalDeadline ---------------------------------------------------------
export function GoalDeadline({ deadline, label = 'Deadline' }) {
  if (!deadline) return `<span class="goal-deadline goal-deadline--none">${icon('calendar', { size: 13 })}<span>No ${label.toLowerCase()}</span></span>`;
  const days = daysUntil(deadline);
  const urgency = days < 0 ? 'overdue' : days <= 3 ? 'soon' : 'normal';
  const relative = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `${days}d left`;
  return `
    <span class="goal-deadline goal-deadline--${urgency}" title="${formatDate(deadline)}">
      ${icon('calendar', { size: 13 })}<span>${relative}</span>
    </span>`;
}

// ---- GoalForecast — the completion forecast line (est date + confidence) ----
const CONFIDENCE_VARIANT = { High: 'success', Medium: 'warning', Low: 'danger' };

export function GoalForecast({ forecast }) {
  const conf = forecast?.confidence || 'Low';
  return `
    <div class="goal-forecast">
      <span class="goal-forecast__label">${icon('trendingUp', { size: 13 })}Est. completion ${forecast ? formatDate(forecast.estCompletion) : '\u2014'}</span>
      ${Badge({ label: `${conf} confidence`, variant: CONFIDENCE_VARIANT[conf] })}
    </div>`;
}

// ---- GoalHeader — reused atop the card and the detail panel ----
export function GoalHeader({ goal }) {
  const cat = CATEGORY_CONFIG[goal.category] || { icon: 'target', color: 'slate' };
  return `
    <div class="goal-header">
      <span class="goal-header__icon goal-header__icon--${cat.color}">${icon(cat.icon, { size: 20 })}</span>
      <div class="goal-header__titles">
        <h3 class="goal-header__title">${goal.title}</h3>
        <div class="goal-header__badges">
          ${GoalStatusBadge({ status: goal.status })}${GoalPriority({ priority: goal.priority })}${GoalTypeChip({ type: goal.type })}
        </div>
      </div>
    </div>`;
}

// ---- GoalProgress — 'bar' reuses the shared component; 'ring' for the detail panel ----
export function GoalProgress({ percentage, variant = 'bar', color = 'accent', size = 56 }) {
  const pct = Math.max(0, Math.min(100, percentage));
  if (variant === 'bar') return BaseProgress({ percentage: pct, color });
  return ProgressRing({ percentage: pct, color, size, showValue: true });
}

// ---- Milestones — checklist unit (used in the detail panel; toggling is wired in view.js) ----
export function MilestoneChecklist({ goal }) {
  const list = goal.milestones || [];
  if (!list.length) {
    return emptyState({ icon: 'flag', title: 'No milestones yet', description: 'Milestones you add will break this goal into checkable steps.', size: 'sm' });
  }
  const done = list.filter((m) => m.done).length;
  return `
    <div class="goal-milestones">
      <div class="goal-milestones__summary">${done} of ${list.length} milestones complete</div>
      <div class="goal-milestones__list">
        ${list
          .map(
            (m) => `
        <div class="goal-milestone${m.done ? ' is-done' : ''}" data-milestone-id="${m.id}">
          <button type="button" class="goal-milestone__check" role="checkbox" aria-checked="${m.done}" aria-label="${m.done ? 'Mark ' : 'Unmark '}${m.title}">
            ${icon('check', { size: 11 })}
          </button>
          <span class="goal-milestone__body">
            <span class="goal-milestone__title">${m.title}</span>
            <span class="goal-milestone__meta">
              ${m.due ? GoalDeadline({ deadline: m.due }) : ''}
              ${m.linkedProjectId ? `<span class="goal-milestone__link">${icon('folder', { size: 13 })}Linked project</span>` : ''}
            </span>
          </span>
        </div>`
          )
          .join('')}
      </div>
    </div>`;
}

// ---- GoalCard — the Grid view's unit ----
export function GoalCard({ goal }) {
  const cat = CATEGORY_CONFIG[goal.category] || { icon: 'target', color: 'slate' };
  const progressColor = goal.status === 'Completed' ? 'success' : goal.status === 'Archived' ? 'neutral' : 'accent';
  return `
    <article class="goal-card" data-id="${goal.id}" tabindex="0" role="button" aria-label="Open ${goal.title}">
      <div class="goal-card__top">
        <span class="goal-card__icon goal-card__icon--${cat.color}">${icon(cat.icon, { size: 16 })}</span>
        <h3 class="goal-card__title">${goal.title}</h3>
        ${goal.favorite ? `<span class="goal-card__favorite">${icon('star', { size: 15 })}</span>` : ''}
      </div>
      <p class="goal-card__desc">${goal.description}</p>
      <div class="goal-card__badges">${GoalStatusBadge({ status: goal.status })}${GoalPriority({ priority: goal.priority })}${GoalTypeChip({ type: goal.type })}</div>
      <div class="goal-card__progress">
        ${GoalProgress({ percentage: goal.progress, variant: 'bar', color: progressColor })}
        <span class="goal-card__progress-value">${goal.progress}%</span>
      </div>
      <div class="goal-card__footer">
        ${GoalDeadline({ deadline: goal.deadline })}
        <span class="goal-card__milestones">${icon('flag', { size: 13 })}${goal.milestonesDone}/${goal.milestonesTotal} ms</span>
      </div>
    </article>`;
}

// ---- GoalRow — the List view's unit ----
export function GoalRow({ goal }) {
  const cat = CATEGORY_CONFIG[goal.category] || { icon: 'target', color: 'slate' };
  const progressColor = goal.status === 'Completed' ? 'success' : goal.status === 'Archived' ? 'neutral' : 'accent';
  return `
    <div class="goal-row" data-id="${goal.id}" tabindex="0" role="button" aria-label="Open ${goal.title}">
      <span class="goal-row__icon goal-row__icon--${cat.color}">${icon(cat.icon, { size: 15 })}</span>
      <div class="goal-row__body">
        <div class="goal-row__title">${goal.title}</div>
        <div class="goal-row__meta">${GoalCategory({ category: goal.category, compact: true })} · ${goal.milestonesDone}/${goal.milestonesTotal} milestones</div>
      </div>
      <div class="goal-row__progress">
        ${GoalProgress({ percentage: goal.progress, variant: 'bar', color: progressColor })}
      </div>
      <span class="goal-row__status">${GoalStatusBadge({ status: goal.status })}</span>
      ${GoalDeadline({ deadline: goal.deadline })}
      ${icon('chevronRight', { size: 16, className: 'goal-row__chevron' })}
    </div>`;
}

// ---- GoalTimelineItem — the Timeline view's unit (milestones + deadlines merged) ----
export function GoalTimelineItem({ entry }) {
  const isDeadline = entry.type === 'deadline';
  const overdue = daysUntil(entry.date) < 0;
  const stateClass = isDeadline ? 'goal-timeline__item--deadline' : entry.done ? 'goal-timeline__item--done' : overdue ? 'goal-timeline__item--overdue' : '';
  return `
    <li class="goal-timeline__item ${stateClass}" data-goal-id="${entry.goalId}">
      <div class="goal-timeline__rail" aria-hidden="true">
        <span class="goal-timeline__dot"></span>
      </div>
      <div class="goal-timeline__body">
        <div class="goal-timeline__date">${formatDate(entry.date)}${overdue && !isDeadline && !entry.done ? ' · overdue' : ''}</div>
        <div class="goal-timeline__title">${isDeadline ? icon('calendar', { size: 13 }) : icon('flag', { size: 13 })}${entry.title}</div>
        <div class="goal-timeline__meta">
          <span class="goal-timeline__goal">${entry.goalTitle}</span>
          <span class="goal-timeline__type">${isDeadline ? 'Goal deadline' : entry.done ? 'Milestone done' : 'Milestone'}</span>
          ${entry.linkedProjectId ? `<span class="goal-timeline__link">${icon('folder', { size: 12 })}Linked</span>` : ''}
        </div>
      </div>
    </li>`;
}

// ---- GoalEmptyState — thin wrapper around the app-wide emptyState() ----
export function GoalEmptyState({ hasFilters }) {
  return hasFilters
    ? emptyState({ icon: 'search', title: 'No goals match', description: 'Try adjusting your filters or search.', size: 'md' })
    : emptyState({ icon: 'target', title: 'No goals yet', description: 'Create your first goal.', size: 'md' });
}

// ---- GoalSkeleton ---------------------------------------------------------
export function GoalSkeleton({ count = 6 }) {
  return Array.from(
    { length: count },
    () => `
    <div class="goal-card goal-card--skeleton" aria-hidden="true">
      <div class="skeleton-block skeleton-block--title"></div>
      <div class="skeleton-block skeleton-block--text"></div>
      <div class="skeleton-block skeleton-block--text" style="width:60%"></div>
      <div class="skeleton-block skeleton-block--footer"></div>
    </div>`
  ).join('');
}

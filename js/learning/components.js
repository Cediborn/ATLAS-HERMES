// Atlas — Learning components. Presentation-only functions returning markup —
// no DOM queries, no listeners, no state reads. view.js wires behavior on top.

import { icon } from '../icons.js';
import { Progress as BaseProgress, ProgressRing, emptyState, Badge } from '../components.js';
import { LEARNING_STATUS_CONFIG, PRIORITY_CONFIG, SUBJECT_CONFIG, RESOURCE_TYPE_BY_ID } from './data.js';
import { formatDate, daysUntil } from './state.js';

// ---- ResourceStatusBadge --------------------------------------------------
export function ResourceStatusBadge({ status }) {
  const cfg = LEARNING_STATUS_CONFIG[status] || { color: 'neutral' };
  return `<span class="resource-status resource-status--${cfg.color}">${status}</span>`;
}

// ---- ResourcePriority — identical weight system to Projects/Goals ----
export function ResourcePriority({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || { color: 'neutral', solid: false };
  const solid = cfg.solid ? ' resource-priority--solid' : '';
  return `<span class="resource-priority resource-priority--${cfg.color}${solid}"><span class="resource-priority__dot"></span>${priority}</span>`;
}

// ---- ResourceTypeChip — Course / Book / Article ----
export function ResourceTypeChip({ type }) {
  const t = RESOURCE_TYPE_BY_ID[type] || { label: type, icon: 'bookOpen' };
  return `<span class="resource-type-chip">${icon(t.icon, { size: 12 })}${t.label}</span>`;
}

// ---- ResourceSubject — icon + label, tinted with the subject's identity color ----
export function ResourceSubject({ subject, compact = false }) {
  const cfg = SUBJECT_CONFIG[subject] || { label: subject, icon: 'target', color: 'slate' };
  return `<span class="resource-subject resource-subject--${cfg.color}${compact ? ' resource-subject--compact' : ''}">${icon(cfg.icon, { size: compact ? 12 : 13 })}<span>${cfg.label}</span></span>`;
}

// ---- ResourceDeadline — same urgency logic as Goals ----
export function ResourceDeadline({ dueDate }) {
  if (!dueDate) return `<span class="resource-deadline resource-deadline--none">${icon('calendar', { size: 13 })}<span>No due date</span></span>`;
  const days = daysUntil(dueDate);
  const urgency = days < 0 ? 'overdue' : days <= 3 ? 'soon' : 'normal';
  const relative = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `${days}d left`;
  return `
    <span class="resource-deadline resource-deadline--${urgency}" title="${formatDate(dueDate)}">
      ${icon('calendar', { size: 13 })}<span>${relative}</span>
    </span>`;
}

// ---- Estimated time remaining, as a human string ----
export function formatMinutes(minutes) {
  if (!minutes) return '';
  const mins = Math.round(minutes);
  if (mins < 60) return `${mins}m`;
  const h = Math.round(mins / 60);
  return `${h}h`;
}

// ---- ResourceHeader — reused atop the card and the detail panel ----
export function ResourceHeader({ resource }) {
  const subj = SUBJECT_CONFIG[resource.subject] || { icon: 'target', color: 'slate' };
  return `
    <div class="resource-header">
      <span class="resource-header__icon resource-header__icon--${subj.color}">${icon(subj.icon, { size: 20 })}</span>
      <div class="resource-header__titles">
        <h3 class="resource-header__title">${resource.title}</h3>
        <div class="resource-header__badges">
          ${ResourceStatusBadge({ status: resource.status })}${ResourcePriority({ priority: resource.priority })}${ResourceTypeChip({ type: resource.type })}
        </div>
        ${resource.author ? `<div class="resource-header__author">${resource.author}</div>` : ''}
      </div>
    </div>`;
}

// ---- ResourceProgress — 'bar' reuses the shared component; 'ring' for the detail panel ----
export function ResourceProgress({ percentage, variant = 'bar', color = 'accent', size = 56 }) {
  const pct = Math.max(0, Math.min(100, percentage));
  if (variant === 'bar') return BaseProgress({ percentage: pct, color });
  return ProgressRing({ percentage: pct, color, size, showValue: true });
}

// ---- UnitChecklist — tickable unit list (wired in view.js) ----
export function UnitChecklist({ resource }) {
  const list = resource.units || [];
  if (!list.length) {
    return emptyState({ icon: 'checklist', title: 'No units yet', description: 'Break this resource into checkable units.', size: 'sm' });
  }
  const done = list.filter((u) => u.done).length;
  return `
    <div class="resource-units">
      <div class="resource-units__summary">${done} of ${list.length} units complete</div>
      <div class="resource-units__list">
        ${list
          .map(
            (u) => `
        <div class="resource-unit${u.done ? ' is-done' : ''}" data-unit-id="${u.id}">
          <button type="button" class="resource-unit__check" role="checkbox" aria-checked="${u.done}" aria-label="${u.done ? 'Mark ' : 'Unmark '}${u.title}">
            ${icon('check', { size: 11 })}
          </button>
          <span class="resource-unit__title">${u.title}</span>
        </div>`
          )
          .join('')}
      </div>
    </div>`;
}

// ---- ResourceCard — the Grid view's unit ----
export function ResourceCard({ resource }) {
  const subj = SUBJECT_CONFIG[resource.subject] || { icon: 'target', color: 'slate' };
  const progressColor = resource.status === 'Completed' ? 'success' : resource.status === 'Archived' ? 'neutral' : 'accent';
  return `
    <article class="resource-card" data-id="${resource.id}" tabindex="0" role="button" aria-label="Open ${resource.title}">
      <div class="resource-card__top">
        <span class="resource-card__icon resource-card__icon--${subj.color}">${icon(subj.icon, { size: 16 })}</span>
        <h3 class="resource-card__title">${resource.title}</h3>
        ${resource.favorite ? `<span class="resource-card__favorite">${icon('star', { size: 15 })}</span>` : ''}
      </div>
      <p class="resource-card__desc">${resource.description}</p>
      <div class="resource-card__badges">${ResourceStatusBadge({ status: resource.status })}${ResourceTypeChip({ type: resource.type })}${ResourceSubject({ subject: resource.subject, compact: true })}</div>
      <div class="resource-card__progress">
        ${ResourceProgress({ percentage: resource.progress, variant: 'bar', color: progressColor })}
        <span class="resource-card__progress-value">${resource.progress}%</span>
      </div>
      <div class="resource-card__footer">
        ${resource.dueDate ? ResourceDeadline({ dueDate: resource.dueDate }) : `<span class="resource-card__estimate">${icon('clock', { size: 13 })}~${formatMinutes(resource.estimatedMinutes)} left</span>`}
        <span class="resource-card__units">${icon('checklist', { size: 13 })}${resource.unitsDone}/${resource.unitsTotal}</span>
      </div>
    </article>`;
}

// ---- ResourceRow — the List view's unit ----
export function ResourceRow({ resource }) {
  const subj = SUBJECT_CONFIG[resource.subject] || { icon: 'target', color: 'slate' };
  const progressColor = resource.status === 'Completed' ? 'success' : resource.status === 'Archived' ? 'neutral' : 'accent';
  return `
    <div class="resource-row" data-id="${resource.id}" tabindex="0" role="button" aria-label="Open ${resource.title}">
      <span class="resource-row__icon resource-row__icon--${subj.color}">${icon(subj.icon, { size: 15 })}</span>
      <div class="resource-row__body">
        <div class="resource-row__title">${resource.title}</div>
        <div class="resource-row__meta">${resource.author || ''} · ${ResourceTypeChip({ type: resource.type })} · ${resource.unitsDone}/${resource.unitsTotal} units</div>
      </div>
      <div class="resource-row__progress">
        ${ResourceProgress({ percentage: resource.progress, variant: 'bar', color: progressColor })}
      </div>
      <span class="resource-row__status">${ResourceStatusBadge({ status: resource.status })}</span>
      ${resource.dueDate ? ResourceDeadline({ dueDate: resource.dueDate }) : `<span class="resource-row__estimate">${icon('clock', { size: 13 })}~${formatMinutes(resource.estimatedMinutes)}</span>`}
      ${icon('chevronRight', { size: 16, className: 'resource-row__chevron' })}
    </div>`;
}

// ---- LearningEmptyState — thin wrapper around the app-wide emptyState() ----
export function LearningEmptyState({ hasFilters }) {
  return hasFilters
    ? emptyState({ icon: 'search', title: 'No resources match', description: 'Try adjusting your filters or search.', size: 'md' })
    : emptyState({ icon: 'bookOpen', title: 'Nothing in your library yet', description: 'Add a course, book, or article to start tracking progress.', size: 'md' });
}

// ---- ResourceSkeleton -----------------------------------------------------
export function ResourceSkeleton({ count = 6 }) {
  return Array.from(
    { length: count },
    () => `
    <div class="resource-card resource-card--skeleton" aria-hidden="true">
      <div class="skeleton-block skeleton-block--title"></div>
      <div class="skeleton-block skeleton-block--text"></div>
      <div class="skeleton-block skeleton-block--text" style="width:60%"></div>
      <div class="skeleton-block skeleton-block--footer"></div>
    </div>`
  ).join('');
}

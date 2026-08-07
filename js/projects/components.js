// Atlas — Projects components. Every function here is presentation-only —
// no DOM queries, no event listeners, no state reads. view.js wires behavior
// on top of whatever markup these return (Day 6 "separate presentation from state").

import { icon } from '../icons.js';
import { Progress as BaseProgress, ProgressRing, emptyState, Tag, ActionMenu } from '../components.js';
import { STATUS_CONFIG, PRIORITY_CONFIG, person } from './data.js';
import { daysUntil, formatDate } from './state.js';

// ---- ProjectStatusBadge --------------------------------------------------
export function ProjectStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { color: 'neutral' };
  return `<span class="project-status project-status--${cfg.color}">${status}</span>`;
}

// ---- ProjectPriority ------------------------------------------------------
export function ProjectPriority({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || { color: 'neutral', solid: false };
  const solid = cfg.solid ? ' project-priority--solid' : '';
  return `<span class="project-priority project-priority--${cfg.color}${solid}"><span class="project-priority__dot"></span>${priority}</span>`;
}

// ---- ProjectProgress — 4 variants; 'bar' reuses the dashboard's Progress
// component directly rather than reimplementing it (no duplicated logic).
export function ProjectProgress({ percentage, variant = 'bar', color = 'accent', size = 36, label }) {
  const pct = Math.max(0, Math.min(100, percentage));

  if (variant === 'bar') return BaseProgress({ percentage: pct, color, label });

  if (variant === 'percentage') {
    return `<span class="progress-percentage progress-percentage--${color}">${pct}%</span>`;
  }

  if (variant === 'milestone') {
    const total = 10;
    const done = Math.round((pct / 100) * total);
    return `<div class="progress-milestones" role="img" aria-label="${pct}% complete">
      ${Array.from({ length: total }, (_, i) => `<span class="progress-milestones__seg${i < done ? ' is-filled' : ''}"></span>`).join('')}
    </div>`;
  }

  // 'ring' — delegates to the shared component (see components.js); Habits
  // needed the identical ring, so the SVG logic itself now lives there.
  return ProgressRing({ percentage: pct, color, size, label: null, showValue: true });
}

// ---- ProjectDeadline ------------------------------------------------------
export function ProjectDeadline({ deadline }) {
  if (!deadline) {
    return `<span class="project-deadline project-deadline--none">${icon('calendar', { size: 13 })}<span>No deadline</span></span>`;
  }
  const days = daysUntil(deadline);
  const urgency = days < 0 ? 'overdue' : days <= 3 ? 'soon' : 'normal';
  const relative = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `${days}d left`;
  return `
    <span class="project-deadline project-deadline--${urgency}" title="${formatDate(deadline)}">
      ${icon('calendar', { size: 13 })}<span>${relative}</span>
    </span>`;
}

// ---- ProjectAvatarGroup ---------------------------------------------------
export function ProjectAvatarGroup({ memberIds, max = 3 }) {
  const shown = memberIds.slice(0, max);
  const overflow = memberIds.length - shown.length;
  return `
    <div class="avatar-group">
      ${shown
        .map((id) => `<span class="avatar avatar--sm avatar-group__item" title="${person(id).name}">${person(id).initials}</span>`)
        .join('')}
      ${overflow > 0 ? `<span class="avatar avatar--sm avatar-group__item avatar-group__overflow">+${overflow}</span>` : ''}
    </div>`;
}

// ---- ProjectEmptyState — thin wrapper around the app-wide emptyState() ----
export function ProjectEmptyState({ hasFilters }) {
  return hasFilters
    ? emptyState({ icon: 'search', title: 'No projects match', description: 'Try adjusting your filters or search.', size: 'md' })
    : emptyState({ icon: 'folder', title: 'No projects yet', description: 'Create your first project.', size: 'md' });
}

// ---- ProjectSkeleton --------------------------------------------------------
export function ProjectSkeleton({ count = 6 }) {
  return Array.from(
    { length: count },
    () => `
    <div class="project-card project-card--skeleton" aria-hidden="true">
      <div class="skeleton-block skeleton-block--title"></div>
      <div class="skeleton-block skeleton-block--text"></div>
      <div class="skeleton-block skeleton-block--text" style="width:60%"></div>
      <div class="skeleton-block skeleton-block--footer"></div>
    </div>`
  ).join('');
}

// ---- ProjectHeader — reusable atop both the card and the detail panel ----
export function ProjectHeader({ project, compact = false }) {
  return `
    <div class="project-header${compact ? ' project-header--compact' : ''}">
      <span class="project-header__icon project-header__icon--${project.color}">${icon(project.icon, { size: 20 })}</span>
      <div class="project-header__titles">
        <h3 class="project-header__title">${project.title}${project.pinned ? icon('pin', { size: 12, className: 'project-header__pin' }) : ''}</h3>
        ${!compact ? `<div class="project-header__badges">${ProjectStatusBadge({ status: project.status })}${ProjectPriority({ priority: project.priority })}</div>` : ''}
      </div>
    </div>`;
}

// ---- ProjectCard — the Grid view's unit, assembled from everything above ----
export function ProjectCard({ project: p }) {
  const progressColor = p.status === 'Completed' ? 'success' : p.status === 'Archived' ? 'neutral' : 'accent';
  return `
    <article class="project-card" data-id="${p.id}" tabindex="0" role="button" aria-label="Open ${p.title}">
      ${p.cover ? `<div class="project-card__cover project-card__cover--${p.color}"></div>` : ''}
      <div class="project-card__body">
        <div class="project-card__top">
          <span class="project-card__icon project-card__icon--${p.color}">${icon(p.icon, { size: 16 })}</span>
          <h3 class="project-card__title">${p.title}${p.pinned ? icon('pin', { size: 12, className: 'project-card__pin' }) : ''}</h3>
          ${p.favorite ? `<span class="project-card__favorite">${icon('star', { size: 15 })}</span>` : ''}
          ${ActionMenu({ id: p.id, itemLabel: p.title, favorite: p.favorite, pinned: p.pinned, archived: p.status === 'Archived' })}
        </div>
        <p class="project-card__desc">${p.description}</p>
        <div class="project-card__tags">${p.tags.map((t) => Tag({ label: t })).join('')}</div>
        <div class="project-card__badges">${ProjectStatusBadge({ status: p.status })}${ProjectPriority({ priority: p.priority })}</div>
        <div class="project-card__progress">${ProjectProgress({ percentage: p.progress, variant: 'bar', color: progressColor })}</div>
        <div class="project-card__footer">
          ${ProjectDeadline({ deadline: p.deadline })}
          ${ProjectAvatarGroup({ memberIds: p.members })}
        </div>
      </div>
    </article>`;
}

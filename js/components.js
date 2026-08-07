// Atlas — Reusable UI components.
// Every dashboard section is assembled from these; nothing here is a one-off.
// These are plain functions returning markup today; each becomes one React
// component (same prop shape) when Atlas moves to Next.js (Foundation §4).

import { icon } from './icons.js';

// ---- Badge --------------------------------------------------------------
// Maps common status words to a semantic color automatically; pass `variant`
// to override when a label doesn't match (e.g. a custom tag).
const BADGE_VARIANT_MAP = {
  active: 'success',
  completed: 'success',
  'in progress': 'accent',
  paused: 'neutral',
  'not started': 'neutral',
  planning: 'planning',
  archived: 'archived',
  blocked: 'danger',
  review: 'warning',
  'high priority': 'danger',
  high: 'danger',
  medium: 'warning',
  low: 'neutral',
};

export function Badge({ label, variant }) {
  const resolved = variant || BADGE_VARIANT_MAP[String(label).toLowerCase()] || 'neutral';
  return `<span class="badge badge--${resolved}">${label}</span>`;
}

// ---- Progress -------------------------------------------------------------
export function Progress({ percentage, label, color = 'accent' }) {
  const pct = Math.max(0, Math.min(100, percentage));
  return `
    <div class="progress-component">
      ${label ? `<div class="progress-component__label"><span>${label}</span><span>${pct}%</span></div>` : ''}
      <div class="progress progress--${color}"><div class="progress__fill" style="width:${pct}%"></div></div>
    </div>`;
}

// ---- ProgressRing — originally only existed as one branch of Projects'
// own ProjectProgress('ring'); promoted here once Habits needed the exact
// same ring (several, on its header) rather than a second implementation.
// Projects' ProjectProgress now delegates to this for its 'ring' variant.
export function ProgressRing({ percentage, label, color = 'accent', size = 44, showValue = true }) {
  const pct = Math.max(0, Math.min(100, percentage));
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return `
    <div class="progress-ring-component">
      <svg class="progress-ring progress-ring--${color}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label ? `${label}: ` : ''}${pct}% complete">
        <circle class="progress-ring__track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" />
        <circle class="progress-ring__fill" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none"
          stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"
          transform="rotate(-90 ${size / 2} ${size / 2})" />
        ${showValue && size >= 32 ? `<text x="50%" y="51%" text-anchor="middle" dominant-baseline="middle" class="progress-ring__label">${pct}</text>` : ''}
      </svg>
      ${label ? `<span class="progress-ring-component__label">${label}</span>` : ''}
    </div>`;
}

// ---- Empty state (one component, two sizes: full-page vs inside a card) --
export function emptyState({ icon: iconName, title, description, size = 'md', badge }) {
  const sizeClass = size === 'sm' ? ' empty-state--sm' : '';
  return `
    <div class="empty-state${sizeClass}">
      <span class="empty-state__icon">${icon(iconName, { size: size === 'sm' ? 20 : 26 })}</span>
      <h2>${title}</h2>
      ${description ? `<p>${description}</p>` : ''}
      ${badge || ''}
    </div>`;
}

// ---- StatCard ---------------------------------------------------------
export function StatCard({ title, value, icon: iconName, trend, accent }) {
  const accentClass = accent ? ` stat-card--${accent}` : '';
  return `
    <div class="stat-card${accentClass}">
      <div class="stat-card__top">
        <span class="stat-card__icon">${icon(iconName, { size: 17 })}</span>
        ${trend ? `<span class="stat-card__trend">${trend}</span>` : ''}
      </div>
      <span class="stat-card__value">${value}</span>
      <span class="stat-card__label">${title}</span>
    </div>`;
}

// ---- SectionCard — the one wrapper every dashboard section uses ---------
export function SectionCard({ title, description, action, content }) {
  return `
    <section class="section-card">
      <header class="section-card__header">
        <div class="section-card__heading">
          <h3>${title}</h3>
          ${description ? `<p class="section-card__desc">${description}</p>` : ''}
        </div>
        ${action || ''}
      </header>
      <div class="section-card__body">${content}</div>
    </section>`;
}

export function sectionAction(routeId, label = 'View all') {
  return `<a href="#/${routeId}" class="section-card__action">${label}</a>`;
}

// ---- Quick Action Button ------------------------------------------------
export function QuickActionButton({ icon: iconName, label, id }) {
  return `
    <button type="button" class="quick-action" data-action="${id}">
      <span class="quick-action__icon">${icon(iconName, { size: 18 })}</span>
      <span class="quick-action__label">${label}</span>
    </button>`;
}

// ---- Tag — a generic clickable pill, shared by Projects and Notes ----
export function Tag({ label, active = false }) {
  return `<button type="button" class="tag-chip${active ? ' is-active' : ''}" data-tag="${label}">${label}</button>`;
}

// ---- ActionMenu — favorite/pin/archive quick actions, shared by Projects
// and Notes (identical logic; the caller supplies the item's id/label/flags)
export function ActionMenu({ id, itemLabel, favorite, pinned, archived }) {
  return `
    <div class="action-menu">
      <button type="button" class="icon-btn action-menu__trigger" data-id="${id}" aria-label="Actions for ${itemLabel}" aria-haspopup="true" aria-expanded="false">
        ${icon('moreHorizontal', { size: 16 })}
      </button>
      <div class="menu action-menu__panel" hidden>
        <button type="button" class="menu__item" data-action="favorite">${icon('star', { size: 16 })}<span>${favorite ? 'Remove from favorites' : 'Add to favorites'}</span></button>
        <button type="button" class="menu__item" data-action="pin">${icon('pin', { size: 16 })}<span>${pinned ? 'Unpin' : 'Pin to top'}</span></button>
        <div class="menu__divider"></div>
        <button type="button" class="menu__item" data-action="archive">${icon('archive', { size: 16 })}<span>${archived ? 'Unarchive' : 'Archive'}</span></button>
      </div>
    </div>`;
}

// ---- List items -----------------------------------------------------------

export function TaskItem({ id, title, category, priority, dueTime, done }) {
  return `
    <div class="task-item${done ? ' is-done' : ''}" data-id="${id}" role="checkbox" aria-checked="${done}" aria-label="${title}" tabindex="0">
      <span class="task-item__check">${icon('check', { size: 11 })}</span>
      <span class="task-item__body">
        <span class="task-item__title">${title}</span>
        <span class="task-item__meta">
          ${priority ? `<span class="task-item__priority task-item__priority--${priority}" title="${priority} priority"></span>` : ''}
          <span>${category}</span>
          ${dueTime ? `<span class="task-item__due">${dueTime}</span>` : ''}
        </span>
      </span>
    </div>`;
}

export function EventItem({ id, time, title, location, color = 'accent' }) {
  return `
    <div class="event-item" data-id="${id}">
      <span class="event-item__color event-item__color--${color}" aria-hidden="true"></span>
      <span class="event-item__time">${time}</span>
      <span class="event-item__body">
        <span class="event-item__title">${title}</span>
        ${location ? `<span class="event-item__location">${location}</span>` : ''}
      </span>
    </div>`;
}

export function ProjectItem({ id, name, status, lastUpdated, progress }) {
  return `
    <div class="project-item" data-id="${id}">
      <div class="project-item__top">
        <span class="project-item__title">${name}</span>
        ${Badge({ label: status })}
      </div>
      <div class="project-item__meta">Updated ${lastUpdated}</div>
      ${typeof progress === 'number' ? Progress({ percentage: progress }) : ''}
    </div>`;
}

export function GoalItem({ id, title, progress, status, deadline }) {
  return `
    <div class="goal-item" data-id="${id}">
      <div class="goal-item__top">
        <span class="goal-item__title">${title}</span>
        ${Badge({ label: status })}
      </div>
      <div class="goal-item__meta">${deadline ? `Deadline ${deadline}` : 'No deadline set'}</div>
      ${typeof progress === 'number' ? Progress({ percentage: progress, color: 'accent' }) : ''}
    </div>`;
}

export function ResourceItem({ id, title, typeLabel, progress, status }) {
  return `
    <div class="resource-item" data-id="${id}">
      <div class="resource-item__top">
        <span class="resource-item__title">${title}</span>
        ${Badge({ label: status })}
      </div>
      <div class="resource-item__meta">${typeLabel}</div>
      ${typeof progress === 'number' ? Progress({ percentage: progress, color: 'accent' }) : ''}
    </div>`;
}

export function BookItem({ id, title, author, progress, status }) {
  return `
    <div class="book-item" data-id="${id}">
      <div class="book-item__top">
        <span class="book-item__title">${title}</span>
        ${Badge({ label: status })}
      </div>
      <div class="book-item__meta">${author}</div>
      ${typeof progress === 'number' ? Progress({ percentage: progress, color: 'accent' }) : ''}
    </div>`;
}

export function TransactionItem({ id, title, category, amount, type, icon: iconName = 'wallet', account }) {
  return `
    <div class="transaction-item" data-id="${id}">
      <span class="transaction-item__icon">${icon(iconName, { size: 17 })}</span>
      <span class="transaction-item__body">
        <span class="transaction-item__title">${title}</span>
        <span class="transaction-item__meta">${account ? `${account} · ` : ''}${category}</span>
      </span>
      <span class="transaction-item__amount transaction-item__amount--${type}">${type === 'income' ? '+' : '\u2212'}${amount}</span>
    </div>`;
}

export function NoteItem({ id, title, editedDate, tag }) {
  return `
    <div class="note-item" data-id="${id}">
      <span class="note-item__file-icon">${icon('fileText', { size: 17 })}</span>
      <span class="note-item__body">
        <span class="note-item__title">${title}</span>
        <span class="note-item__meta">${editedDate}</span>
      </span>
      ${tag ? Badge({ label: tag, variant: 'neutral' }) : ''}
    </div>`;
}

export function HabitItem({ id, name, icon: iconName = 'flame', streak, completedToday, weeklyProgress }) {
  const hasCheck = typeof completedToday === 'boolean';
  return `
    <div class="habit-item" data-id="${id}">
      <span class="habit-item__icon">${icon(iconName, { size: 17 })}</span>
      <span class="habit-item__body">
        <span class="habit-item__title">${name}</span>
        <span class="habit-item__meta">${streak}</span>
        ${typeof weeklyProgress === 'number' ? Progress({ percentage: weeklyProgress, color: 'warning' }) : ''}
      </span>
      ${
        hasCheck
          ? `<button type="button" class="habit-item__check${completedToday ? ' is-done' : ''}" role="checkbox" aria-checked="${completedToday}" aria-label="Mark ${name} done today">
              ${icon('check', { size: 12 })}
            </button>`
          : ''
      }
    </div>`;
}

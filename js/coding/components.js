// Atlas — Coding components. Presentation-only functions returning markup —
// no DOM queries, no listeners, no state reads. view.js wires behavior on top.

import { icon } from '../icons.js';
import { Progress as BaseProgress, ProgressRing, emptyState } from '../components.js';
import { CODING_STATUS_CONFIG, DIFFICULTY_CONFIG, LANGUAGE_CONFIG, SOURCE_CONFIG, TOPIC_CONFIG } from './data.js';
import { computeItemProgress } from './state.js';

// ---- CodingStatusBadge ----------------------------------------------------
export function CodingStatusBadge({ status }) {
  const cfg = CODING_STATUS_CONFIG[status] || { color: 'neutral' };
  return `<span class="coding-status coding-status--${cfg.color}">${status}</span>`;
}

// ---- CodingSource — icon + label, tinted with the source's identity color --
export function CodingSource({ source, compact = false }) {
  const cfg = SOURCE_CONFIG[source] || { icon: 'code', color: 'slate' };
  return `<span class="coding-source coding-source--${cfg.color}${compact ? ' coding-source--compact' : ''}">${icon(cfg.icon, { size: compact ? 12 : 13 })}<span>${source}</span></span>`;
}

// ---- CodingDifficulty — icon + label chip ----
export function CodingDifficulty({ difficulty }) {
  const cfg = DIFFICULTY_CONFIG[difficulty] || { icon: 'check', color: 'slate' };
  return `<span class="coding-difficulty coding-difficulty--${cfg.color}">${icon(cfg.icon, { size: 12 })}${difficulty}</span>`;
}

// ---- CodingLanguage chip ---------------------------------------------------
export function CodingLanguage({ language }) {
  const cfg = LANGUAGE_CONFIG[language] || { color: 'slate' };
  return `<span class="coding-language coding-language--${cfg.color}"><i class="coding-language__dot"></i>${language}</span>`;
}

// ---- CodingTopic chip ------------------------------------------------------
export function CodingTopic({ topic }) {
  const cfg = TOPIC_CONFIG[topic] || { label: topic, color: 'slate' };
  return `<span class="coding-topic coding-topic--${cfg.color}">${cfg.label}</span>`;
}

// ---- CodingProgress — 'bar' for cards/rows; 'ring' for the detail panel ----
export function CodingProgress({ item, variant = 'bar', color = 'accent', size = 56 }) {
  const pct = computeItemProgress(item);
  if (variant === 'bar') return BaseProgress({ percentage: pct, color });
  return ProgressRing({ percentage: pct, color, size, showValue: true });
}

// ---- CodingHeader — reused atop the card and the detail panel ----
export function CodingHeader({ item }) {
  const source = SOURCE_CONFIG[item.source] || { icon: 'code', color: 'slate' };
  return `
    <div class="coding-header">
      <span class="coding-header__icon coding-header__icon--${source.color}">${icon(source.icon, { size: 20 })}</span>
      <div class="coding-header__titles">
        <h3 class="coding-header__title">${item.title}</h3>
        <div class="coding-header__sub">${item.kind === 'build' ? 'Build' : 'Problem'} \u00b7 ${item.source}</div>
        <div class="coding-header__badges">${CodingStatusBadge({ status: item.status })}${CodingDifficulty({ difficulty: item.difficulty })}${CodingSource({ source: item.source, compact: true })}</div>
      </div>
    </div>`;
}

// ---- CodingCard — the Grid view's unit ----
export function CodingCard({ item }) {
  const source = SOURCE_CONFIG[item.source] || { icon: 'code', color: 'slate' };
  const progressColor = item.status === 'Solved' ? 'success' : item.status === 'In Progress' ? 'accent' : 'neutral';
  const timeLabel = item.timeSpentMin > 0
    ? `${item.timeSpentMin} min`
    : 'Not started';
  return `
    <article class="coding-card" data-id="${item.id}" tabindex="0" role="button" aria-label="Open ${item.title}">
      <div class="coding-card__top">
        <span class="coding-card__icon coding-card__icon--${source.color}">${icon(source.icon, { size: 16 })}</span>
        <h3 class="coding-card__title">${item.title}</h3>
        ${item.favorite ? `<span class="coding-card__favorite">${icon('star', { size: 15 })}</span>` : ''}
      </div>
      <div class="coding-card__meta">${item.kind === 'build' ? 'Build' : 'Problem'} \u00b7 ${CodingDifficulty({ difficulty: item.difficulty })}</div>
      <p class="coding-card__desc">${item.notes ? item.notes : `Solve \u201c${item.title}\u201d on ${item.source}`}</p>
      <div class="coding-card__badges">${CodingStatusBadge({ status: item.status })}${CodingSource({ source: item.source, compact: true })}</div>
      <div class="coding-card__progress">
        ${CodingProgress({ item, variant: 'bar', color: progressColor })}
        <span class="coding-card__progress-value">${item.progress}%</span>
      </div>
      <div class="coding-card__footer">
        <span class="coding-card__steps">${icon('checklist', { size: 13 })}${item.stepsTotal > 0 ? `${item.stepsDone}/${item.stepsTotal} steps` : timeLabel}</span>
        <span class="coding-card__languages">${item.languages.map((l) => CodingLanguage({ language: l })).join('')}</span>
      </div>
    </article>`;
}

// ---- CodingRow — the List view's unit ----
export function CodingRow({ item }) {
  const source = SOURCE_CONFIG[item.source] || { icon: 'code', color: 'slate' };
  const progressColor = item.status === 'Solved' ? 'success' : item.status === 'In Progress' ? 'accent' : 'neutral';
  return `
    <div class="coding-row" data-id="${item.id}" tabindex="0" role="button" aria-label="Open ${item.title}">
      <span class="coding-row__icon coding-row__icon--${source.color}">${icon(source.icon, { size: 15 })}</span>
      <div class="coding-row__body">
        <div class="coding-row__title">${item.title}</div>
        <div class="coding-row__meta">${item.source} \u00b7 ${CodingDifficulty({ difficulty: item.difficulty })} \u00b7 ${item.languages.map((l) => CodingLanguage({ language: l })).join(' ')}</div>
      </div>
      <div class="coding-row__progress">
        ${CodingProgress({ item, variant: 'bar', color: progressColor })}
        <span class="coding-row__steps">${item.stepsTotal > 0 ? `${item.stepsDone}/${item.stepsTotal}` : `${item.timeSpentMin} min`}</span>
      </div>
      <span class="coding-row__status">${CodingStatusBadge({ status: item.status })}</span>
      ${icon('chevronRight', { size: 16, className: 'coding-row__chevron' })}
    </div>`;
}

// ---- CodingEmptyState — thin wrapper around the app-wide emptyState() ----
export function CodingEmptyState({ hasFilters }) {
  return hasFilters
    ? emptyState({ icon: 'search', title: 'No items match', description: 'Try adjusting your filters or search.', size: 'md' })
    : emptyState({ icon: 'code', title: 'No coding yet', description: 'Add a problem or build to start a log.', size: 'md' });
}

// ---- CodingSkeleton --------------------------------------------------------
export function CodingSkeleton({ count = 6 }) {
  return Array.from(
    { length: count },
    () => `
    <div class="coding-card coding-card--skeleton" aria-hidden="true">
      <div class="skeleton-block skeleton-block--title"></div>
      <div class="skeleton-block skeleton-block--text" style="width:60%"></div>
      <div class="skeleton-block skeleton-block--text"></div>
      <div class="skeleton-block skeleton-block--footer"></div>
    </div>`
  ).join('');
}

// Atlas — Calendar components. Presentation-only: props in, markup out.
// isToday/isSelected are passed in rather than read from state.js here, so
// these stay pure and testable independent of any page state.

import { icon } from '../icons.js';
import { emptyState } from '../components.js';
import { EVENT_TYPE_CONFIG, calendar } from './data.js';
import { formatTime, formatDayLabel, highlightMatch } from './state.js';
import { daysUntil } from '../date-utils.js';

const RECURRENCE_LABELS = { daily: 'Daily', weekdays: 'Weekdays', weekly: 'Weekly', biweekly: 'Biweekly', monthly: 'Monthly', yearly: 'Yearly', custom: 'Custom' };

// ---- EventTypeBadge ---------------------------------------------------------
export function EventTypeBadge({ type }) {
  const cfg = EVENT_TYPE_CONFIG[type] || { icon: 'calendar' };
  return `<span class="event-type-badge">${icon(cfg.icon, { size: 13 })}<span>${type}</span></span>`;
}

// ---- DeadlineBadge — red accent, countdown, overdue styling --------------
export function DeadlineBadge({ start }) {
  const days = daysUntil(start.slice(0, 10));
  const overdue = days < 0;
  const label = overdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `${days}d left`;
  return `<span class="deadline-badge${overdue ? ' is-overdue' : ''}">${icon('calendar', { size: 12 })}<span>${label}</span></span>`;
}

// ---- RecurringBadge ---------------------------------------------------------
export function RecurringBadge({ rule }) {
  const label = RECURRENCE_LABELS[rule] || rule;
  return `<span class="recurring-badge" title="Repeats ${label}">${icon('repeat', { size: 11 })}<span>${label}</span></span>`;
}

// ---- EventChip — the compact pill shown inside a MonthCell ---------------
export function EventChip({ event: e, query = '' }) {
  const cal = calendar(e.calendarId);
  const colorKey = e.color || cal.color;
  const timeLabel = e.allDay ? '' : formatTime(e.start);
  return `
    <button type="button" class="event-chip event-chip--${colorKey}${e.deadline ? ' event-chip--deadline' : ''}${e.completed ? ' is-completed' : ''}"
      data-occurrence-key="${e.occurrenceKey}" draggable="${e.source === 'local' ? 'true' : 'false'}">
      ${timeLabel ? `<span class="event-chip__time">${timeLabel}</span>` : ''}
      <span class="event-chip__title">${highlightMatch(e.title, query)}</span>
    </button>`;
}

// ---- MonthCell --------------------------------------------------------------
export function MonthCell({ day, events: dayEvents, isToday, isSelected, query = '', maxVisible = 3 }) {
  const visible = dayEvents.slice(0, maxVisible);
  const overflow = dayEvents.length - visible.length;
  const classes = [
    'month-cell',
    day.inCurrentMonth ? '' : 'is-outside',
    day.isWeekend ? 'is-weekend' : '',
    isToday ? 'is-today' : '',
    isSelected ? 'is-selected' : '',
  ].filter(Boolean).join(' ');

  return `
    <div class="${classes}" data-date-key="${day.key}" role="gridcell" tabindex="0" aria-label="${formatDayLabel(day.date)}, ${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}" aria-selected="${isSelected}">
      <span class="month-cell__date">${day.date.getDate()}</span>
      <div class="month-cell__events">
        ${visible.map((e) => EventChip({ event: e, query })).join('')}
        ${overflow > 0 ? `<button type="button" class="month-cell__overflow" data-date-key="${day.key}">+${overflow} more</button>` : ''}
      </div>
    </div>`;
}

// ---- Empty states — one shared component, five copy variants -------------
const EMPTY_VARIANTS = {
  noEvents: { icon: 'calendar', title: 'No events', description: 'This day is clear.' },
  noResults: { icon: 'search', title: 'No matches', description: 'Try a different search or filter.' },
  noUpcoming: { icon: 'calendar', title: 'Nothing upcoming', description: 'Enjoy the open time.' },
  noDeadlines: { icon: 'calendar', title: 'No deadlines', description: 'Nothing due soon.' },
  noCalendars: { icon: 'folder', title: 'No calendars', description: 'Create one to start scheduling.' },
};

export function CalendarEmptyState({ variant = 'noEvents' }) {
  const cfg = EMPTY_VARIANTS[variant] || EMPTY_VARIANTS.noEvents;
  return emptyState({ icon: cfg.icon, title: cfg.title, description: cfg.description, size: 'sm' });
}

// ---- Skeleton — a blank 42-cell grid while the module loads ---------------
export function CalendarSkeleton() {
  return Array.from({ length: 42 }, () => '<div class="month-cell month-cell--skeleton" aria-hidden="true"></div>').join('');
}

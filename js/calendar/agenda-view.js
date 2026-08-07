// Atlas — Agenda view. "Load more" extends the fetched range rather than
// rendering everything at once — the same seam a real IntersectionObserver-
// based infinite scroll would hook into later, without building that
// complexity now for a few dozen demo events.

import { calendar } from './data.js';
import { getVisibleEvents, getState, todayDate, groupByDate, formatDayLabel, formatTime, isSameDay } from './state.js';
import { EventTypeBadge, DeadlineBadge, RecurringBadge, CalendarEmptyState } from './components.js';

let onOpenEventCb = null;
let monthsLoaded = 1;

export function initAgendaView(container, { onOpenEvent } = {}) {
  onOpenEventCb = onOpenEvent;
  monthsLoaded = 1;

  container.addEventListener('click', (e) => {
    const item = e.target.closest('.agenda-item');
    if (item) {
      onOpenEventCb?.(item.dataset.occurrenceKey);
      return;
    }
    if (e.target.closest('[data-load-more]')) {
      monthsLoaded += 1;
      renderAgendaView(container);
    }
  });

  renderAgendaView(container);
}

export function renderAgendaView(container) {
  const today = todayDate();
  const rangeEnd = new Date(today);
  rangeEnd.setMonth(rangeEnd.getMonth() + monthsLoaded);
  const visible = getVisibleEvents(today, rangeEnd);
  const groups = groupByDate(visible);

  if (!groups.length) {
    container.innerHTML = CalendarEmptyState({ variant: getState().search ? 'noResults' : 'noEvents' });
    return;
  }

  container.innerHTML = `
    <div class="agenda-view">
      ${groups.map((g) => agendaGroup(g, today)).join('')}
      <button type="button" class="btn btn--secondary agenda-view__load-more" data-load-more>Load more</button>
    </div>`;
}

function agendaGroup(group, today) {
  const date = new Date(`${group.date}T00:00`);
  const label = isSameDay(date, today) ? `Today \u2014 ${formatDayLabel(date)}` : formatDayLabel(date);
  return `
    <div class="agenda-group">
      <h3 class="agenda-group__label">${label}</h3>
      <div class="agenda-group__items">${group.items.map((e) => agendaItem(e)).join('')}</div>
    </div>`;
}

function agendaItem(e) {
  const colorKey = e.color || calendar(e.calendarId).color;
  return `
    <button type="button" class="agenda-item agenda-item--${colorKey}${e.deadline ? ' agenda-item--deadline' : ''}${e.completed ? ' is-completed' : ''}" data-occurrence-key="${e.occurrenceKey}">
      <span class="agenda-item__time">${e.allDay ? 'All day' : formatTime(e.start)}</span>
      <span class="agenda-item__body">
        <span class="agenda-item__title">${e.title}</span>
        <span class="agenda-item__meta">
          ${EventTypeBadge({ type: e.type })}
          ${e.recurring ? RecurringBadge({ rule: e.recurrenceRule }) : ''}
        </span>
      </span>
      ${e.deadline ? DeadlineBadge({ start: e.start }) : ''}
    </button>`;
}

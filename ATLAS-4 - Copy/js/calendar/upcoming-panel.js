// Atlas — Upcoming events panel. Reads the same repository as Month/Agenda —
// no separate "upcoming" dataset to keep in sync.

import { icon } from '../icons.js';
import { getEventsInRange } from './repository.js';
import { calendar } from './data.js';
import { getState, setState, startOfMonth, todayDate, dateKey, formatTime } from './state.js';
import { CalendarEmptyState, DeadlineBadge } from './components.js';

let onJumpCb = null;

export function initUpcomingPanel(container, { onJump } = {}) {
  onJumpCb = onJump;
  container.addEventListener('click', (e) => {
    if (e.target.closest('[data-upcoming-toggle]')) {
      setState({ upcomingCollapsed: !getState().upcomingCollapsed });
      renderUpcomingPanel(container);
      return;
    }
    const jumpBtn = e.target.closest('[data-jump-date]');
    if (jumpBtn) {
      const targetDate = new Date(jumpBtn.dataset.jumpDate);
      setState({ selectedDate: jumpBtn.dataset.jumpDate, visibleMonth: startOfMonth(targetDate).toISOString() });
      onJumpCb?.();
    }
  });
  renderUpcomingPanel(container);
}

function byStart(a, b) {
  return new Date(a.start) - new Date(b.start);
}

export function renderUpcomingPanel(container) {
  const collapsed = getState().upcomingCollapsed;
  const today = todayDate();
  const todayStr = dateKey(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = dateKey(tomorrow);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 8);

  const rangeStart = new Date(today);
  rangeStart.setDate(rangeStart.getDate() - 90); // reach back far enough to surface overdue deadlines
  const all = getEventsInRange(rangeStart, weekEnd);

  const todaysEvents = all.filter((e) => e.start.slice(0, 10) === todayStr).sort(byStart);
  const tomorrowsEvents = all.filter((e) => e.start.slice(0, 10) === tomorrowStr).sort(byStart);
  const next7 = all.filter((e) => e.start.slice(0, 10) > tomorrowStr && new Date(e.start) <= weekEnd).sort(byStart);
  const overdue = all.filter((e) => e.deadline && !e.completed && new Date(e.start) < today).sort(byStart);
  const nothingAtAll = !todaysEvents.length && !tomorrowsEvents.length && !next7.length && !overdue.length;

  container.innerHTML = `
    <div class="upcoming-panel${collapsed ? ' is-collapsed' : ''}">
      <button type="button" class="upcoming-panel__toggle" data-upcoming-toggle aria-expanded="${String(!collapsed)}">
        <span>Upcoming</span>
        ${icon('chevronDown', { size: 16, className: 'upcoming-panel__chevron' })}
      </button>
      ${
        collapsed
          ? ''
          : `<div class="upcoming-panel__body">
        ${overdue.length ? upcomingSection('Overdue', overdue, true) : ''}
        ${upcomingSection('Today', todaysEvents)}
        ${upcomingSection('Tomorrow', tomorrowsEvents)}
        ${upcomingSection('Next 7 days', next7)}
        ${nothingAtAll ? CalendarEmptyState({ variant: 'noUpcoming' }) : ''}
      </div>`
      }
    </div>`;
}

function upcomingSection(title, list, isOverdue = false) {
  if (!list.length) return '';
  return `
    <div class="upcoming-panel__section">
      <h4>${title}</h4>
      ${list
        .map((e) => {
          const colorKey = e.color || calendar(e.calendarId).color;
          return `
        <button type="button" class="upcoming-item${isOverdue ? ' upcoming-item--overdue' : ''}" data-jump-date="${e.start.slice(0, 10)}">
          <span class="upcoming-item__dot upcoming-item__dot--${colorKey}" aria-hidden="true"></span>
          <span class="upcoming-item__body">
            <span class="upcoming-item__title">${e.title}</span>
            <span class="upcoming-item__meta">${e.allDay ? 'All day' : formatTime(e.start)}</span>
          </span>
          ${isOverdue ? DeadlineBadge({ start: e.start }) : ''}
        </button>`;
        })
        .join('')}
    </div>`;
}

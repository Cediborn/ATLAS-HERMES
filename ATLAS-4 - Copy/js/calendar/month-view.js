// Atlas — Month view. Drag-to-reschedule is simulated (HTML5 drag events,
// no server) but genuinely functional: it mutates the real local event and
// re-renders. Recurring events and adapted events (Projects/habits) are not
// draggable here — rescheduling one occurrence of a recurring series needs
// per-occurrence exceptions, which is a real feature for a later pass, not
// something to fake.

import { events } from './data.js';
import { updateLocalEvent } from './repository.js';
import { getVisibleEvents, invalidateVisibleEventsCache, getState, setState, monthGridDays, todayDate, isSameDay } from './state.js';
import { MonthCell } from './components.js';

let onOpenEventCb = null;
let onOpenDayCb = null;
let onChangeCb = null;
let dragOccurrenceKey = null;

export function initMonthView(container, { onOpenEvent, onOpenDay, onChange } = {}) {
  onOpenEventCb = onOpenEvent;
  onOpenDayCb = onOpenDay;
  onChangeCb = onChange;

  container.addEventListener('click', (e) => {
    const overflowBtn = e.target.closest('.month-cell__overflow');
    if (overflowBtn) {
      onOpenDayCb?.(overflowBtn.dataset.dateKey);
      return;
    }
    const chip = e.target.closest('.event-chip');
    if (chip) {
      onOpenEventCb?.(chip.dataset.occurrenceKey);
      return;
    }
    const cell = e.target.closest('.month-cell');
    if (cell) {
      setState({ selectedDate: cell.dataset.dateKey });
      renderMonthView(container);
      onChangeCb?.();
    }
  });

  container.addEventListener('keydown', (e) => {
    const cell = e.target.closest('.month-cell');
    if (cell && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onOpenDayCb?.(cell.dataset.dateKey);
    }
  });

  container.addEventListener('dragstart', (e) => {
    const chip = e.target.closest('.event-chip');
    if (!chip || chip.getAttribute('draggable') !== 'true') return;
    dragOccurrenceKey = chip.dataset.occurrenceKey;
    chip.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  container.addEventListener('dragend', (e) => {
    e.target.closest('.event-chip')?.classList.remove('is-dragging');
    dragOccurrenceKey = null;
    container.querySelectorAll('.is-drop-target').forEach((c) => c.classList.remove('is-drop-target'));
  });

  container.addEventListener('dragover', (e) => {
    if (!dragOccurrenceKey) return;
    const cell = e.target.closest('.month-cell');
    if (!cell) return;
    e.preventDefault();
    container.querySelectorAll('.is-drop-target').forEach((c) => c.classList.remove('is-drop-target'));
    cell.classList.add('is-drop-target');
  });

  container.addEventListener('drop', (e) => {
    const cell = e.target.closest('.month-cell');
    if (!cell || !dragOccurrenceKey) return;
    e.preventDefault();
    handleDrop(dragOccurrenceKey, cell.dataset.dateKey, container);
    dragOccurrenceKey = null;
  });

  renderMonthView(container);
}

// Datetimes are stored as naive local strings ("2026-07-27T14:00", no
// timezone suffix) throughout Atlas — using toISOString() here would convert
// to UTC and silently shift the displayed date/time depending on the
// visitor's timezone, so the replacement string is built manually instead.
function toLocalString(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function handleDrop(occurrenceKey, targetDateKey, container) {
  const [baseId] = occurrenceKey.split('::');
  const base = events.find((ev) => ev.id === baseId);
  if (!base || base.source !== 'local' || base.recurring) return;

  const oldStart = new Date(base.start);
  const duration = new Date(base.end) - oldStart;
  const [y, m, d] = targetDateKey.split('-').map(Number);
  const newStart = new Date(oldStart);
  newStart.setFullYear(y, m - 1, d);
  const newEnd = new Date(newStart.getTime() + duration);

  updateLocalEvent(baseId, { start: toLocalString(newStart), end: toLocalString(newEnd) });
  invalidateVisibleEventsCache();
  renderMonthView(container);
  onChangeCb?.();
}

export function renderMonthView(container) {
  const monthDate = new Date(getState().visibleMonth);
  const days = monthGridDays(monthDate);
  const today = todayDate();
  const selected = getState().selectedDate;
  const query = getState().search;

  const rangeStart = days[0].date;
  const rangeEnd = new Date(days[days.length - 1].date);
  rangeEnd.setHours(23, 59, 59);
  const visible = getVisibleEvents(rangeStart, rangeEnd);

  const eventsByDay = new Map();
  for (const e of visible) {
    const key = e.start.slice(0, 10);
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key).push(e);
  }
  for (const list of eventsByDay.values()) list.sort((a, b) => new Date(a.start) - new Date(b.start));

  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  container.innerHTML = `
    <div class="month-view">
      <div class="month-view__weekdays">${weekdayLabels.map((w) => `<span>${w}</span>`).join('')}</div>
      <div class="month-view__grid" role="grid" aria-label="Month view">
        ${days
          .map((day) =>
            MonthCell({
              day,
              events: eventsByDay.get(day.key) || [],
              isToday: isSameDay(day.date, today),
              isSelected: day.key === selected,
              query,
            })
          )
          .join('')}
      </div>
    </div>`;
}

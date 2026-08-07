// Atlas — Mini calendar. Shares state.visibleMonth/selectedDate with the
// main calendar (so navigating either one keeps both in sync), and reads
// event-indicator dots from the same repository — no separate dataset.

import { icon } from '../icons.js';
import { getEventsInRange } from './repository.js';
import { getState, setState, monthGridDays, todayDate, isSameDay, formatMonthYear, addMonths } from './state.js';

let onChangeCb = null;

export function initMiniCalendar(container, { onChange } = {}) {
  onChangeCb = onChange;
  container.addEventListener('click', (e) => {
    if (e.target.closest('[data-mini-prev]')) {
      setState({ visibleMonth: addMonths(new Date(getState().visibleMonth), -1).toISOString() });
      renderMiniCalendar(container);
      onChangeCb?.();
    } else if (e.target.closest('[data-mini-next]')) {
      setState({ visibleMonth: addMonths(new Date(getState().visibleMonth), 1).toISOString() });
      renderMiniCalendar(container);
      onChangeCb?.();
    } else {
      const dayBtn = e.target.closest('[data-mini-day]');
      if (dayBtn) {
        setState({ selectedDate: dayBtn.dataset.miniDay });
        renderMiniCalendar(container);
        onChangeCb?.();
      }
    }
  });
  renderMiniCalendar(container);
}

export function renderMiniCalendar(container) {
  const monthDate = new Date(getState().visibleMonth);
  const days = monthGridDays(monthDate);
  const today = todayDate();
  const selected = getState().selectedDate;
  const eventDays = new Set(getEventsInRange(days[0].date, days[days.length - 1].date).map((e) => e.start.slice(0, 10)));
  const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  container.innerHTML = `
    <div class="mini-calendar">
      <div class="mini-calendar__header">
        <span class="mini-calendar__month">${formatMonthYear(monthDate)}</span>
        <div class="mini-calendar__nav">
          <button type="button" class="mini-calendar__nav-btn" data-mini-prev aria-label="Previous month">${icon('chevronRight', { size: 13, className: 'mini-calendar__chevron-left' })}</button>
          <button type="button" class="mini-calendar__nav-btn" data-mini-next aria-label="Next month">${icon('chevronRight', { size: 13 })}</button>
        </div>
      </div>
      <div class="mini-calendar__weekdays">${weekdayLabels.map((w) => `<span>${w}</span>`).join('')}</div>
      <div class="mini-calendar__grid">
        ${days
          .map(
            (d) => `
          <button type="button" class="mini-calendar__day${d.inCurrentMonth ? '' : ' is-outside'}${isSameDay(d.date, today) ? ' is-today' : ''}${d.key === selected ? ' is-selected' : ''}"
            data-mini-day="${d.key}" aria-label="${d.date.toDateString()}" aria-current="${isSameDay(d.date, today) ? 'date' : 'false'}">
            <span>${d.date.getDate()}</span>
            ${eventDays.has(d.key) ? '<span class="mini-calendar__dot" aria-hidden="true"></span>' : ''}
          </button>`
          )
          .join('')}
      </div>
    </div>`;
}

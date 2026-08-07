// Atlas — CalendarModule: the page controller. Same division of labor as
// Projects/Notes — this is the only file that touches the DOM directly;
// everything else (data, repository, state, components, each view) stays pure
// or self-contained.

import { icon } from '../icons.js';
import { createPopover } from '../popover.js';
import { CALENDARS, EVENT_TYPES, calendar } from './data.js';
import { getState, setState, invalidateVisibleEventsCache, resetFilters, formatMonthYear, addMonths, todayKey, todayDate, dateKey, monthGridDays } from './state.js';
import { CalendarSkeleton } from './components.js';
import { initMiniCalendar, renderMiniCalendar } from './mini-calendar.js';
import { initUpcomingPanel, renderUpcomingPanel } from './upcoming-panel.js';
import { initMonthView, renderMonthView } from './month-view.js';
import { initAgendaView, renderAgendaView } from './agenda-view.js';
import { initEventPanel, openEventPopover, openEventDialog, openDayList } from './event-panel.js';

const PRIORITIES = ['low', 'medium', 'high', 'critical'];

export function renderCalendar(container) {
  container.innerHTML = `
    <div class="calendar-page">
      <div class="calendar-toolbar">
        <button type="button" class="btn btn--secondary" id="cal-today">Today</button>
        <div class="calendar-toolbar__nav">
          <button type="button" class="icon-btn" id="cal-prev" aria-label="Previous month">${icon('chevronRight', { size: 16, className: 'calendar-toolbar__chevron-left' })}</button>
          <button type="button" class="icon-btn" id="cal-next" aria-label="Next month">${icon('chevronRight', { size: 16 })}</button>
        </div>
        <h2 class="calendar-toolbar__title" id="cal-title"></h2>

        <div class="toolbar-spacer"></div>

        <label class="toolbar-search" for="cal-search">${icon('search', { size: 16 })}<input type="text" id="cal-search" placeholder="Search events\u2026" autocomplete="off" /></label>

        <div class="view-switcher" role="tablist" aria-label="View">
          <button type="button" class="view-switcher__option is-active" data-view="month" role="tab" aria-selected="true">Month</button>
          <button type="button" class="view-switcher__option" data-view="week" role="tab" aria-selected="false" disabled title="Coming in the next milestone">Week</button>
          <button type="button" class="view-switcher__option" data-view="day" role="tab" aria-selected="false" disabled title="Coming in the next milestone">Day</button>
          <button type="button" class="view-switcher__option" data-view="agenda" role="tab" aria-selected="false">Agenda</button>
        </div>

        <div class="toolbar-popover">
          <button type="button" class="btn btn--secondary" id="cal-filter-trigger">${icon('filter', { size: 15 })}<span>Filter</span><span class="badge badge--accent" id="cal-filter-count" hidden></span></button>
          <div class="menu projects-filter-panel" id="cal-filter-panel" hidden></div>
        </div>

        <div class="toolbar-popover">
          <button type="button" class="btn btn--secondary" id="cal-calendars-trigger">${icon('folder', { size: 15 })}<span>Calendars</span></button>
          <div class="menu" id="cal-calendars-panel" hidden></div>
        </div>

        <button type="button" class="btn btn--primary" id="cal-create">${icon('calendar', { size: 16 })}<span>Create Event</span></button>
      </div>

      <div class="calendar-layout">
        <aside class="calendar-sidebar">
          <div id="cal-mini-calendar"></div>
          <div class="calendar-legend" id="cal-legend"></div>
        </aside>
        <div class="calendar-main" id="cal-main"></div>
        <aside class="calendar-upcoming" id="cal-upcoming"></aside>
      </div>
    </div>`;

  initToolbar();
  initMiniCalendar(document.getElementById('cal-mini-calendar'), { onChange: fullRerender });
  initUpcomingPanel(document.getElementById('cal-upcoming'), { onJump: fullRerender });
  initMonthView(document.getElementById('cal-main'), { onOpenEvent: openMonthEvent, onOpenDay: openDay, onChange: syncAfterMutation });
  initAgendaView(document.getElementById('cal-main'), { onOpenEvent: openAgendaEvent });
  initEventPanel(container, { onChange: fullRerender });

  renderLegend();
  updateToolbarTitle();
  updateFilterCount();
  renderActiveView();
}

export function renderCalendarSkeleton(container) {
  container.innerHTML = `<div class="calendar-page"><div class="calendar-layout"><div class="calendar-main"><div class="month-view__grid">${CalendarSkeleton()}</div></div></div></div>`;
}

// ---- view switching + master re-render ----
function currentRange() {
  const monthDate = new Date(getState().visibleMonth);
  const days = monthGridDays(monthDate);
  const end = new Date(days[days.length - 1].date);
  end.setHours(23, 59, 59);
  return [days[0].date, end];
}

function renderActiveView() {
  if (getState().currentView === 'agenda') renderAgendaView(document.getElementById('cal-main'));
  else renderMonthView(document.getElementById('cal-main'));
}

function fullRerender() {
  renderMiniCalendar(document.getElementById('cal-mini-calendar'));
  renderUpcomingPanel(document.getElementById('cal-upcoming'));
  updateToolbarTitle();
  updateFilterCount();
  renderActiveView();
}

function syncAfterMutation() {
  invalidateVisibleEventsCache();
  fullRerender();
}

function openMonthEvent(occurrenceKey) {
  const [start, end] = currentRange();
  openEventPopover(occurrenceKey, start, end);
}
function openAgendaEvent(occurrenceKey) {
  const today = todayDate();
  const future = new Date(today);
  future.setFullYear(future.getFullYear() + 1);
  openEventPopover(occurrenceKey, today, future);
}
function openDay(dateKeyStr) {
  const [start, end] = currentRange();
  openDayList(dateKeyStr, start, end, (occurrenceKey) => openEventPopover(occurrenceKey, start, end));
}

function updateToolbarTitle() {
  document.getElementById('cal-title').textContent = formatMonthYear(new Date(getState().visibleMonth));
}

// ---- Legend (calendar colors, doubles as the "no calendars" edge case) ----
function renderLegend() {
  document.getElementById('cal-legend').innerHTML = `
    <h4>Calendars</h4>
    ${CALENDARS.map((c) => `<div class="calendar-legend__item"><span class="calendar-legend__dot calendar-legend__dot--${c.color}"></span><span>${c.name}</span></div>`).join('')}`;
}

// ---- Toolbar ----
function initToolbar() {
  document.getElementById('cal-today').addEventListener('click', () => {
    setState({ visibleMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(), selectedDate: todayKey() });
    fullRerender();
  });
  document.getElementById('cal-prev').addEventListener('click', () => {
    setState({ visibleMonth: addMonths(new Date(getState().visibleMonth), -1).toISOString() });
    fullRerender();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    setState({ visibleMonth: addMonths(new Date(getState().visibleMonth), 1).toISOString() });
    fullRerender();
  });

  const searchInput = document.getElementById('cal-search');
  searchInput.addEventListener('input', () => {
    setState({ search: searchInput.value });
    invalidateVisibleEventsCache();
    fullRerender();
  });

  document.getElementById('cal-create').addEventListener('click', () => {
    openEventDialog('create', getState().selectedDate);
  });

  document.querySelectorAll('.view-switcher__option').forEach((btn) => {
    if (btn.disabled) return;
    btn.addEventListener('click', () => {
      setState({ currentView: btn.dataset.view });
      document.querySelectorAll('.view-switcher__option').forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', String(active));
      });
      renderActiveView();
    });
  });

  initCalendarsPopover();
  initFilterPopover();
}

function initCalendarsPopover() {
  const trigger = document.getElementById('cal-calendars-trigger');
  const panel = document.getElementById('cal-calendars-panel');

  function render() {
    panel.innerHTML = CALENDARS.map(
      (c) => `
      <label class="menu__item filter-checkbox">
        <input type="checkbox" data-calendar-id="${c.id}" ${c.visible ? 'checked' : ''} />
        <span class="calendar-legend__dot calendar-legend__dot--${c.color}"></span>
        <span>${c.name}</span>
      </label>`
    ).join('');
  }

  createPopover({ trigger, panel, onOpenRender: render });

  panel.addEventListener('change', (e) => {
    const cb = e.target.closest('[data-calendar-id]');
    if (!cb) return;
    const cal = calendar(cb.dataset.calendarId);
    cal.visible = cb.checked;
    syncAfterMutation();
    renderLegend();
  });
}

function filterCheckbox(type, value, checked, label) {
  return `<label class="menu__item filter-checkbox"><input type="checkbox" data-filter-type="${type}" value="${value || ''}" ${checked ? 'checked' : ''} /><span>${label || value}</span></label>`;
}
function toggleSetFilter(key, value, checked) {
  const current = new Set(getState()[key]);
  if (checked) current.add(value);
  else current.delete(value);
  setState({ [key]: current });
}

function initFilterPopover() {
  const trigger = document.getElementById('cal-filter-trigger');
  const panel = document.getElementById('cal-filter-panel');

  function render() {
    const f = getState();
    panel.innerHTML = `
      <div class="menu__label">Event type</div>
      ${EVENT_TYPES.map((t) => filterCheckbox('typeFilter', t, f.typeFilter.has(t))).join('')}
      <div class="menu__divider"></div>
      <div class="menu__label">Priority</div>
      ${PRIORITIES.map((p) => filterCheckbox('priorityFilter', p, f.priorityFilter.has(p), p[0].toUpperCase() + p.slice(1))).join('')}
      <div class="menu__divider"></div>
      <div class="menu__label">Completion</div>
      <div class="switch-group" role="group" aria-label="Completion">
        ${['all', 'completed', 'incomplete'].map((v) => `<button type="button" class="switch-group__option" data-completion="${v}" aria-pressed="${f.completionFilter === v}">${v[0].toUpperCase()}${v.slice(1)}</button>`).join('')}
      </div>
      <div class="menu__divider"></div>
      <div class="menu__label">Date range</div>
      <div class="switch-group" role="group" aria-label="Date range">
        ${[['all', 'All'], ['today', 'Today'], ['week', 'Week'], ['month', 'Month']].map(([v, l]) => `<button type="button" class="switch-group__option" data-daterange="${v}" aria-pressed="${f.dateRangeFilter === v}">${l}</button>`).join('')}
      </div>
      <div class="menu__divider"></div>
      ${filterCheckbox('hasReminderOnly', '', f.hasReminderOnly, 'Has reminder')}
      ${filterCheckbox('recurringOnly', '', f.recurringOnly, 'Recurring')}
      ${filterCheckbox('allDayOnly', '', f.allDayOnly, 'All day')}
      <div class="menu__divider"></div>
      <button type="button" class="menu__item" id="cal-filter-clear">${icon('x', { size: 16 })}<span>Clear filters</span></button>
    `;
  }

  createPopover({ trigger, panel, onOpenRender: render });

  panel.addEventListener('change', (e) => {
    const cb = e.target;
    const type = cb.dataset.filterType;
    if (type === 'typeFilter') toggleSetFilter('typeFilter', cb.value, cb.checked);
    else if (type === 'priorityFilter') toggleSetFilter('priorityFilter', cb.value, cb.checked);
    else if (type === 'hasReminderOnly') setState({ hasReminderOnly: cb.checked });
    else if (type === 'recurringOnly') setState({ recurringOnly: cb.checked });
    else if (type === 'allDayOnly') setState({ allDayOnly: cb.checked });
    invalidateVisibleEventsCache();
    fullRerender();
    updateFilterCount();
  });

  panel.addEventListener('click', (e) => {
    const completionBtn = e.target.closest('[data-completion]');
    const rangeBtn = e.target.closest('[data-daterange]');
    if (completionBtn) {
      setState({ completionFilter: completionBtn.dataset.completion });
      render();
      invalidateVisibleEventsCache();
      fullRerender();
      updateFilterCount();
    } else if (rangeBtn) {
      setState({ dateRangeFilter: rangeBtn.dataset.daterange });
      render();
      invalidateVisibleEventsCache();
      fullRerender();
      updateFilterCount();
    } else if (e.target.closest('#cal-filter-clear')) {
      resetFilters();
      render();
      invalidateVisibleEventsCache();
      fullRerender();
      updateFilterCount();
    }
  });
}

function updateFilterCount() {
  const f = getState();
  const count =
    f.typeFilter.size + f.priorityFilter.size +
    (f.completionFilter !== 'all' ? 1 : 0) + (f.dateRangeFilter !== 'all' ? 1 : 0) +
    (f.hasReminderOnly ? 1 : 0) + (f.recurringOnly ? 1 : 0) + (f.allDayOnly ? 1 : 0);
  const badge = document.getElementById('cal-filter-count');
  badge.hidden = count === 0;
  badge.textContent = String(count);
}

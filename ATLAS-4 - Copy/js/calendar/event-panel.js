// Atlas — Event popover + dialog. Two modes of the same overlay rather than
// two separate modal mechanisms, since they share focus-trap/close/backdrop
// behavior. Adapted events (Projects deadlines, habit reminders) only ever
// get the read-only popover — editing them belongs in their source module.

import { icon } from '../icons.js';
import { CALENDARS, EVENT_TYPES, calendar as getCalendar } from './data.js';
import { isEditable, createLocalEvent, updateLocalEvent, deleteLocalEvent, nextOccurrences } from './repository.js';
import { getVisibleEvents, invalidateVisibleEventsCache, formatDayLabel, formatTime, formatMonthYear } from './state.js';
import { EventTypeBadge, DeadlineBadge, RecurringBadge } from './components.js';

const IDENTITY_COLORS = ['blue', 'violet', 'teal', 'amber', 'rose', 'emerald', 'slate'];
const RECURRENCE_OPTIONS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'biweekly', label: 'Biweekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'custom', label: 'Custom\u2026 (not configurable yet)' },
];
const REMINDER_OPTIONS = [
  { value: '', label: 'No reminder' },
  { value: '0', label: 'At time of event' },
  { value: '15', label: '15 minutes before' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '1440', label: '1 day before' },
];

let els = {};
let onChangeCb = null;
let lastFocused = null;

export function initEventPanel(root, { onChange } = {}) {
  onChangeCb = onChange;
  root.insertAdjacentHTML('beforeend', '<div class="overlay event-panel-overlay" id="event-panel-overlay" hidden><div class="event-panel" id="event-panel" role="dialog" aria-modal="true"></div></div>');
  els = { overlay: document.getElementById('event-panel-overlay'), panel: document.getElementById('event-panel') };

  els.overlay.addEventListener('click', (e) => {
    if (e.target === els.overlay) closeEventPanel();
  });
  document.addEventListener('keydown', (e) => {
    if (els.overlay.hidden) return;
    if (e.key === 'Escape') closeEventPanel();
    else if (e.key === 'Tab') trapFocus(e);
  });
}

function trapFocus(e) {
  const focusable = Array.from(els.panel.querySelectorAll('button, input, select, textarea, a[href]')).filter((el) => !el.disabled && el.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

export function closeEventPanel() {
  if (els.overlay.hidden) return;
  els.overlay.hidden = true;
  document.body.style.overflow = '';
  lastFocused?.focus?.();
}

function openOverlay() {
  lastFocused = document.activeElement;
  els.overlay.hidden = false;
  document.body.style.overflow = 'hidden';
}

// ================= POPOVER (quick view) =================
export function openEventPopover(occurrenceKey, rangeStart, rangeEnd) {
  const occ = getVisibleEvents(rangeStart, rangeEnd).find((e) => e.occurrenceKey === occurrenceKey);
  if (!occ) return;
  openOverlay();
  renderPopover(occ);
}

function renderPopover(e) {
  const cal = getCalendar(e.calendarId);
  const colorKey = e.color || cal.color;
  const editable = isEditable(e);

  els.panel.className = 'event-panel event-panel--popover';
  els.panel.setAttribute('aria-label', e.title);
  els.panel.innerHTML = `
    <div class="event-panel__accent event-panel__accent--${colorKey}"></div>
    <div class="event-panel__content">
      <button type="button" class="icon-btn event-panel__close" id="ep-close" aria-label="Close">${icon('x', { size: 18 })}</button>
      <div class="event-panel__badges">
        ${EventTypeBadge({ type: e.type })}
        ${e.recurring ? RecurringBadge({ rule: e.recurrenceRule }) : ''}
        ${e.deadline ? DeadlineBadge({ start: e.start }) : ''}
      </div>
      <h2 class="event-panel__title">${e.title}</h2>
      <div class="event-panel__meta-row">${icon('calendar', { size: 14 })}<span>${e.allDay ? `${formatDayLabel(new Date(e.start))} \u00b7 All day` : `${formatDayLabel(new Date(e.start))} \u00b7 ${formatTime(e.start)}\u2013${formatTime(e.end)}`}</span></div>
      ${e.location ? `<div class="event-panel__meta-row">${icon('folder', { size: 14 })}<span>${e.location}</span></div>` : ''}
      <div class="event-panel__meta-row"><span class="event-panel__calendar-dot event-panel__calendar-dot--${colorKey}"></span><span>${cal.name}</span></div>
      ${e.description ? `<p class="event-panel__desc">${e.description}</p>` : ''}
      ${!editable ? `<p class="event-panel__readonly-note">${sourceNote(e)}</p>` : ''}
      <div class="event-panel__actions">
        ${editable ? '<button type="button" class="btn btn--secondary" id="ep-delete">Delete</button><button type="button" class="btn btn--primary" id="ep-edit">Edit</button>' : ''}
      </div>
    </div>`;

  document.getElementById('ep-close').addEventListener('click', closeEventPanel);
  if (editable) {
    document.getElementById('ep-edit').addEventListener('click', () => openEventDialog('edit', e));
    document.getElementById('ep-delete').addEventListener('click', () => {
      deleteLocalEvent(e.id);
      invalidateVisibleEventsCache();
      closeEventPanel();
      onChangeCb?.();
    });
  }
  document.getElementById('ep-close').focus();
}

function sourceNote(e) {
  if (e.source === 'projects') return 'This comes from a project deadline \u2014 edit it from Projects instead.';
  if (e.source === 'habits') return 'This comes from a daily habit \u2014 edit it from the dashboard instead.';
  return 'This event is read-only here.';
}

// ================= DAY LIST (from a MonthCell's "+N more") =================
export function openDayList(dateKeyStr, rangeStart, rangeEnd, onPickEvent) {
  const dayEvents = getVisibleEvents(rangeStart, rangeEnd)
    .filter((e) => e.start.slice(0, 10) === dateKeyStr)
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  openOverlay();
  els.panel.className = 'event-panel event-panel--daylist';
  els.panel.setAttribute('aria-label', `Events on ${dateKeyStr}`);
  els.panel.innerHTML = `
    <div class="event-panel__content">
      <button type="button" class="icon-btn event-panel__close" id="ep-close" aria-label="Close">${icon('x', { size: 18 })}</button>
      <h2 class="event-panel__title">${formatDayLabel(new Date(`${dateKeyStr}T00:00`))}</h2>
      <div class="event-panel__day-list">
        ${dayEvents
          .map((e) => {
            const colorKey = e.color || getCalendar(e.calendarId).color;
            return `
          <button type="button" class="upcoming-item" data-occurrence-key="${e.occurrenceKey}">
            <span class="upcoming-item__dot upcoming-item__dot--${colorKey}" aria-hidden="true"></span>
            <span class="upcoming-item__body">
              <span class="upcoming-item__title">${e.title}</span>
              <span class="upcoming-item__meta">${e.allDay ? 'All day' : formatTime(e.start)}</span>
            </span>
          </button>`;
          })
          .join('')}
      </div>
    </div>`;

  document.getElementById('ep-close').addEventListener('click', closeEventPanel);
  els.panel.querySelectorAll('[data-occurrence-key]').forEach((btn) => {
    btn.addEventListener('click', () => onPickEvent(btn.dataset.occurrenceKey));
  });
  document.getElementById('ep-close').focus();
}

// ================= DIALOG (create / edit) =================
export function openEventDialog(mode, existingOrDate) {
  openOverlay();
  renderDialog(mode, existingOrDate);
}

function splitDateTime(str) {
  const [date, time] = str.split('T');
  return { date, time: (time || '00:00').slice(0, 5) };
}

function renderDialog(mode, existingOrDate) {
  const isEdit = mode === 'edit';
  const base = isEdit
    ? existingOrDate
    : {
        title: '', description: '', notes: '', location: '',
        start: `${existingOrDate || new Date().toISOString().slice(0, 10)}T09:00`,
        end: `${existingOrDate || new Date().toISOString().slice(0, 10)}T09:30`,
        allDay: false, calendarId: 'personal', color: null, priority: 'medium', type: 'Normal Event',
        recurring: false, recurrenceRule: null, reminderMinutesBefore: 30, completed: false, deadline: false,
      };
  const startParts = splitDateTime(base.start);
  const endParts = splitDateTime(base.end);

  els.panel.className = 'event-panel event-panel--dialog';
  els.panel.setAttribute('aria-label', isEdit ? 'Edit event' : 'Create event');
  els.panel.innerHTML = `
    <form class="event-dialog" id="event-dialog" novalidate>
      <header class="event-dialog__header">
        <h2>${isEdit ? 'Edit event' : 'New event'}</h2>
        <button type="button" class="icon-btn" id="ed-close" aria-label="Close">${icon('x', { size: 18 })}</button>
      </header>

      <div class="event-dialog__body">
        <div class="field"><label for="ed-title">Title</label><input id="ed-title" type="text" value="${base.title}" placeholder="Untitled event" required /></div>
        <p class="event-dialog__error" id="ed-title-error" hidden>Title is required.</p>

        <div class="field"><label for="ed-description">Description</label><textarea id="ed-description" rows="2">${base.description}</textarea></div>

        <div class="event-dialog__row">
          <div class="field"><label for="ed-date">Date</label><input id="ed-date" type="date" value="${startParts.date}" /></div>
          <label class="event-dialog__allday"><input type="checkbox" id="ed-allday" ${base.allDay ? 'checked' : ''} /> All day</label>
        </div>

        <div class="event-dialog__row" id="ed-time-row" ${base.allDay ? 'hidden' : ''}>
          <div class="field"><label for="ed-start">Start time</label><input id="ed-start" type="time" value="${startParts.time}" /></div>
          <div class="field"><label for="ed-end">End time</label><input id="ed-end" type="time" value="${endParts.time}" /></div>
        </div>
        <p class="event-dialog__error" id="ed-time-error" hidden>End time must be after start time.</p>

        <div class="event-dialog__row">
          <div class="field"><label for="ed-calendar">Calendar</label>
            <select id="ed-calendar">${CALENDARS.map((c) => `<option value="${c.id}" ${c.id === base.calendarId ? 'selected' : ''}>${c.name}</option>`).join('')}</select>
          </div>
          <div class="field"><label for="ed-color">Color</label>
            <select id="ed-color">
              <option value="">Use calendar color</option>
              ${IDENTITY_COLORS.map((c) => `<option value="${c}" ${c === base.color ? 'selected' : ''}>${c[0].toUpperCase()}${c.slice(1)}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="event-dialog__row">
          <div class="field"><label for="ed-type">Type</label>
            <select id="ed-type">${EVENT_TYPES.map((t) => `<option value="${t}" ${t === base.type ? 'selected' : ''}>${t}</option>`).join('')}</select>
          </div>
          <div class="field"><label for="ed-priority">Priority</label>
            <select id="ed-priority">${['low', 'medium', 'high', 'critical'].map((p) => `<option value="${p}" ${p === base.priority ? 'selected' : ''}>${p[0].toUpperCase()}${p.slice(1)}</option>`).join('')}</select>
          </div>
        </div>

        <div class="field"><label for="ed-location">Location</label><input id="ed-location" type="text" value="${base.location}" placeholder="Optional" /></div>

        <div class="field"><label for="ed-reminder">Reminder</label>
          <select id="ed-reminder">${REMINDER_OPTIONS.map((r) => `<option value="${r.value}" ${String(base.reminderMinutesBefore ?? '') === r.value ? 'selected' : ''}>${r.label}</option>`).join('')}</select>
        </div>

        <label class="event-dialog__allday"><input type="checkbox" id="ed-recurring" ${base.recurring ? 'checked' : ''} /> Recurring</label>
        <div class="field" id="ed-recurrence-row" ${base.recurring ? '' : 'hidden'}>
          <label for="ed-recurrence-rule">Repeats</label>
          <select id="ed-recurrence-rule">${RECURRENCE_OPTIONS.map((r) => `<option value="${r.id}" ${r.id === base.recurrenceRule ? 'selected' : ''}>${r.label}</option>`).join('')}</select>
          <p class="event-dialog__preview" id="ed-recurrence-preview"></p>
        </div>

        <div class="field"><label for="ed-notes">Notes</label><textarea id="ed-notes" rows="2">${base.notes}</textarea></div>
      </div>

      <footer class="event-dialog__footer">
        <button type="button" class="btn btn--secondary" id="ed-cancel">Cancel</button>
        <button type="submit" class="btn btn--primary" id="ed-save">Save</button>
      </footer>
    </form>`;

  wireDialogEvents(isEdit, base);
  document.getElementById('ed-title').focus();
}

function wireDialogEvents(isEdit, base) {
  const form = document.getElementById('event-dialog');
  const alldayBox = document.getElementById('ed-allday');
  const timeRow = document.getElementById('ed-time-row');
  const recurringBox = document.getElementById('ed-recurring');
  const recurrenceRow = document.getElementById('ed-recurrence-row');
  const ruleSelect = document.getElementById('ed-recurrence-rule');

  document.getElementById('ed-close').addEventListener('click', closeEventPanel);
  document.getElementById('ed-cancel').addEventListener('click', closeEventPanel);

  alldayBox.addEventListener('change', () => {
    timeRow.hidden = alldayBox.checked;
  });
  recurringBox.addEventListener('change', () => {
    recurrenceRow.hidden = !recurringBox.checked;
    updateRecurrencePreview();
  });
  ruleSelect.addEventListener('change', updateRecurrencePreview);
  document.getElementById('ed-date').addEventListener('change', updateRecurrencePreview);

  function updateRecurrencePreview() {
    if (!recurringBox.checked) return;
    const date = document.getElementById('ed-date').value;
    const time = document.getElementById('ed-start').value || '09:00';
    const rule = ruleSelect.value;
    const previewEl = document.getElementById('ed-recurrence-preview');
    if (rule === 'custom') {
      previewEl.textContent = 'Custom rules aren\u2019t configurable yet \u2014 only this one occurrence will be saved.';
      return;
    }
    const preview = nextOccurrences({ start: `${date}T${time}`, end: `${date}T${time}`, recurring: true, recurrenceRule: rule }, 3);
    const dates = preview.map((o) => {
      const d = new Date(o.start);
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
    });
    previewEl.textContent = `Repeats ${rule} \u2014 next: ${dates.join(' \u00b7 ')}`;
  }
  if (base.recurring) updateRecurrencePreview();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitDialog(isEdit, base);
  });
}

function submitDialog(isEdit, base) {
  const title = document.getElementById('ed-title').value.trim();
  const titleError = document.getElementById('ed-title-error');
  titleError.hidden = Boolean(title);
  if (!title) {
    document.getElementById('ed-title').focus();
    return;
  }

  const date = document.getElementById('ed-date').value;
  const allDay = document.getElementById('ed-allday').checked;
  const startTime = document.getElementById('ed-start').value || '00:00';
  const endTime = document.getElementById('ed-end').value || '00:00';
  const timeError = document.getElementById('ed-time-error');

  if (!allDay && endTime <= startTime) {
    timeError.hidden = false;
    return;
  }
  timeError.hidden = true;

  const recurring = document.getElementById('ed-recurring').checked;
  const patch = {
    title,
    description: document.getElementById('ed-description').value.trim(),
    notes: document.getElementById('ed-notes').value.trim(),
    location: document.getElementById('ed-location').value.trim(),
    allDay,
    start: allDay ? `${date}T00:00` : `${date}T${startTime}`,
    end: allDay ? `${date}T23:59` : `${date}T${endTime}`,
    calendarId: document.getElementById('ed-calendar').value,
    color: document.getElementById('ed-color').value || null,
    type: document.getElementById('ed-type').value,
    priority: document.getElementById('ed-priority').value,
    reminderMinutesBefore: document.getElementById('ed-reminder').value ? Number(document.getElementById('ed-reminder').value) : null,
    recurring,
    recurrenceRule: recurring ? document.getElementById('ed-recurrence-rule').value : null,
    deadline: base.deadline || false,
    completed: base.completed || false,
  };

  if (isEdit) {
    updateLocalEvent(base.id, patch);
  } else {
    createLocalEvent({ ...patch, attachmentsCount: 0, projectId: null, habitId: null, goalId: null, googleEventId: null });
  }
  invalidateVisibleEventsCache();
  closeEventPanel();
  onChangeCb?.();
}

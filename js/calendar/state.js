// Atlas — Calendar page state. Same discipline as Projects/Notes: pure
// functions for anything computable, a small page-local store for anything
// that's genuinely UI state (selected date, active view, open popover/dialog —
// never mixed with the event data itself, which lives in repository.js).

import { getEventsInRange } from './repository.js';
import { dateKey, todayDate, todayKey, startOfMonth, endOfMonth, addMonths, monthGridDays } from '../date-utils.js';

// Re-exported so every file that already does `import { monthGridDays, ... }
// from './state.js'` keeps working unchanged — only the implementation moved.
export { dateKey, todayDate, todayKey, startOfMonth, endOfMonth, addMonths, monthGridDays };

const listeners = new Set();

let state = {
  selectedDate: todayKey(),
  visibleMonth: startOfMonth(new Date()).toISOString(),
  currentView: 'month', // 'month' | 'agenda' — week/day deferred
  search: '',
  calendarFilter: new Set(),
  typeFilter: new Set(),
  priorityFilter: new Set(),
  completionFilter: 'all', // 'all' | 'completed' | 'incomplete'
  dateRangeFilter: 'all', // 'all' | 'today' | 'week' | 'month'
  hasReminderOnly: false,
  recurringOnly: false,
  allDayOnly: false,
  upcomingCollapsed: false,
  activePopoverKey: null,
  dialogMode: null, // null | 'create' | 'edit'
  dialogEventId: null,
};

export function getState() {
  return state;
}
export function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn(state));
}
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function resetFilters() {
  setState({
    search: '', calendarFilter: new Set(), typeFilter: new Set(), priorityFilter: new Set(),
    completionFilter: 'all', dateRangeFilter: 'all', hasReminderOnly: false, recurringOnly: false, allDayOnly: false,
  });
}

// ---- Date helpers (pure) ----
export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
export function formatMonthYear(date) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
}
export function formatDayLabel(date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
}
export function formatTime(dateStr) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(dateStr));
}

export function groupByDate(occurrences) {
  const map = new Map();
  for (const occ of occurrences) {
    const key = dateKey(new Date(occ.start));
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(occ);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({ date, items: items.sort((a, b) => new Date(a.start) - new Date(b.start)) }));
}

// ---- Filtering (pure) ----
export function filterEvents(occurrences, f) {
  const q = f.search.trim().toLowerCase();
  const today = todayDate();
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const monthEnd = endOfMonth(today);

  return occurrences.filter((e) => {
    if (q) {
      const haystack = `${e.title} ${e.description} ${e.location} ${e.notes} ${e.type}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (f.calendarFilter.size && !f.calendarFilter.has(e.calendarId)) return false;
    if (f.typeFilter.size && !f.typeFilter.has(e.type)) return false;
    if (f.priorityFilter.size && !f.priorityFilter.has(e.priority)) return false;
    if (f.completionFilter === 'completed' && !e.completed) return false;
    if (f.completionFilter === 'incomplete' && e.completed) return false;
    if (f.hasReminderOnly && !e.reminderMinutesBefore) return false;
    if (f.recurringOnly && !e.recurring) return false;
    if (f.allDayOnly && !e.allDay) return false;
    if (f.dateRangeFilter !== 'all') {
      const start = new Date(e.start);
      if (f.dateRangeFilter === 'today' && !isSameDay(start, today)) return false;
      if (f.dateRangeFilter === 'week' && (start < today || start > weekEnd)) return false;
      if (f.dateRangeFilter === 'month' && (start < startOfMonth(today) || start > monthEnd)) return false;
    }
    return true;
  });
}

function escapeHtmlLite(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function highlightMatch(text, query) {
  const q = query.trim();
  if (!q) return escapeHtmlLite(text);
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return escapeHtmlLite(text);
  return `${escapeHtmlLite(text.slice(0, idx))}<mark class="search-highlight">${escapeHtmlLite(text.slice(idx, idx + q.length))}</mark>${escapeHtmlLite(text.slice(idx + q.length))}`;
}

// ---- Memoized selector: fetch the range from the repository, then filter.
// Invalidated explicitly wherever event data mutates (create/update/delete/
// drag-reschedule) — Projects shipped without this at first and it caused a
// real bug, so every module since builds it in from the start. ----
let lastKey = null;
let lastResult = null;

export function getVisibleEvents(rangeStart, rangeEnd) {
  const f = state;
  const key = JSON.stringify({
    start: rangeStart.toISOString(), end: rangeEnd.toISOString(),
    search: f.search, cal: [...f.calendarFilter].sort(), type: [...f.typeFilter].sort(),
    pri: [...f.priorityFilter].sort(), comp: f.completionFilter, range: f.dateRangeFilter,
    rem: f.hasReminderOnly, rec: f.recurringOnly, allDay: f.allDayOnly,
  });
  if (key === lastKey) return lastResult;
  lastKey = key;
  lastResult = filterEvents(getEventsInRange(rangeStart, rangeEnd), f);
  return lastResult;
}

export function invalidateVisibleEventsCache() {
  lastKey = null;
}

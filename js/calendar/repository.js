// Atlas — Calendar repository. THE piece that makes "scalable enough for
// Google/Outlook/AI scheduling later" true rather than asserted: every data
// source (native events, Projects deadlines, habit reminders, and someday a
// real Google adapter) implements the same { id, getEvents(start, end) }
// shape and gets merged here. Nothing is ever copied into calendar storage —
// adapted events are computed fresh from Projects'/habits' own data every call.

import { events, calendar, createEventId } from './data.js';
import { projects } from '../projects/data.js';
import { habits, isDueOn } from '../habits/data.js';

// ---- Recurrence expansion (pure) — occurrences are computed on demand for
// whatever range is being rendered, never stored as separate event copies ----
function stepCursor(date, rule) {
  const d = new Date(date);
  switch (rule) {
    case 'daily':
    case 'weekdays':
      d.setDate(d.getDate() + 1);
      return d;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      return d;
    case 'biweekly':
      d.setDate(d.getDate() + 14);
      return d;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      return d;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      return d;
    default:
      d.setDate(d.getDate() + 1);
      return d;
  }
}

function isWeekday(date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function toOccurrence(event, start, end) {
  const isBase = start.getTime() === new Date(event.start).getTime();
  return { ...event, occurrenceKey: `${event.id}::${start.toISOString()}`, start: start.toISOString(), end: end.toISOString(), isOccurrence: !isBase };
}

export function expandOccurrences(event, rangeStart, rangeEnd) {
  const originalStart = new Date(event.start);
  const originalEnd = new Date(event.end);
  const duration = originalEnd - originalStart;

  // "Custom" has no rule-builder yet (deferred, stated in the plan) — show
  // only the literal occurrence rather than faking a rule we can't configure.
  if (!event.recurring || !event.recurrenceRule || event.recurrenceRule === 'custom') {
    return originalStart <= rangeEnd && originalEnd >= rangeStart ? [toOccurrence(event, originalStart, originalEnd)] : [];
  }

  const occurrences = [];
  let cursor = new Date(originalStart);
  let iterations = 0;
  const MAX_ITERATIONS = 2000; // safety valve against a malformed rule, not a real ceiling for any range we render

  while (cursor <= rangeEnd && iterations < MAX_ITERATIONS) {
    iterations += 1;
    const applies = event.recurrenceRule !== 'weekdays' || isWeekday(cursor);
    if (applies) {
      const occStart = new Date(cursor);
      const occEnd = new Date(cursor.getTime() + duration);
      if (occEnd >= rangeStart && occStart <= rangeEnd) {
        occurrences.push(toOccurrence(event, occStart, occEnd));
      }
    }
    cursor = stepCursor(cursor, event.recurrenceRule);
  }
  return occurrences;
}

export function nextOccurrences(event, count = 3) {
  const rangeStart = new Date(event.start);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setFullYear(rangeEnd.getFullYear() + 2);
  return expandOccurrences(event, rangeStart, rangeEnd).slice(0, count);
}

// ---- Adapters — each reads a DIFFERENT module's own canonical data and
// maps it into the calendar's event shape. Nothing here is stored; calling
// this twice always reflects whatever Projects/habits currently look like. ----
function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function adaptProjectDeadlines(rangeStart, rangeEnd) {
  return projects
    .filter((p) => p.deadline && p.status !== 'Archived')
    .map((p) => ({
      id: `project-${p.id}`, occurrenceKey: `project-${p.id}`,
      title: `${p.title} \u2014 deadline`, description: p.description, notes: '',
      start: `${p.deadline}T17:00`, end: `${p.deadline}T17:30`, allDay: false,
      calendarId: 'work', color: null, location: '',
      recurring: false, recurrenceRule: null, completed: p.status === 'Completed',
      priority: p.priority.toLowerCase(), type: 'Project Deadline', deadline: true,
      reminderMinutesBefore: 1440, projectId: p.id, habitId: null, goalId: null,
      attachmentsCount: p.attachmentsCount, createdAt: p.createdAt, updatedAt: p.updatedAt,
      googleEventId: null, source: 'projects', isOccurrence: false,
    }))
    .filter((e) => {
      const s = new Date(e.start);
      return s >= rangeStart && s <= rangeEnd;
    });
}

// Habits now has real schedule/reminder data of its own (js/habits/data.js)
// — no more synthesizing a plausible time per habit here.
function habitCalendarId(category) {
  if (category === 'fitness' || category === 'health') return 'fitness';
  if (category === 'coding' || category === 'learning') return 'school';
  return 'personal'; // no dedicated "habits" calendar bucket exists yet; closest fit
}

function adaptHabitReminders(rangeStart, rangeEnd) {
  const results = [];
  for (const h of habits) {
    if (h.archived || !h.reminderTime) continue; // paused, or no reminder set — nothing to show
    const cursor = new Date(rangeStart);
    cursor.setHours(0, 0, 0, 0);
    let iterations = 0;
    while (cursor <= rangeEnd && iterations < 62) {
      iterations += 1;
      if (isDueOn(h, cursor)) {
        const dateStr = cursor.toISOString().slice(0, 10);
        results.push({
          id: `habit-${h.id}-${dateStr}`, occurrenceKey: `habit-${h.id}-${dateStr}`,
          title: h.title, description: h.description, notes: h.notes || '',
          start: `${dateStr}T${h.reminderTime}`, end: `${dateStr}T${addMinutes(h.reminderTime, 15)}`, allDay: false,
          calendarId: habitCalendarId(h.category), color: null, location: '',
          recurring: true, recurrenceRule: h.frequency === 'weekdays' ? 'weekdays' : h.frequency === 'daily' ? 'daily' : 'custom',
          completed: false, priority: h.priority.toLowerCase(), type: 'Habit Reminder', deadline: false,
          reminderMinutesBefore: 0, projectId: h.linkedProjectId, habitId: h.id, goalId: null,
          attachmentsCount: 0, createdAt: h.createdAt, updatedAt: h.updatedAt,
          googleEventId: null, source: 'habits', isOccurrence: false,
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return results;
}

// ---- Source registry — a future Google/Outlook adapter registers here with
// the exact same { id, getEvents(start, end) } shape. That's the whole seam. ----
const SOURCES = [
  { id: 'local', getEvents: (start, end) => events.flatMap((e) => expandOccurrences(e, start, end)) },
  { id: 'projects', getEvents: adaptProjectDeadlines },
  { id: 'habits', getEvents: adaptHabitReminders },
];

export function getEventsInRange(rangeStart, rangeEnd) {
  return SOURCES.flatMap((s) => s.getEvents(rangeStart, rangeEnd)).filter((e) => calendar(e.calendarId).visible);
}

// ---- CRUD — local events only; adapted events are derived and read-only by
// design (editing a project's deadline belongs in Projects, not here) ----
export function isEditable(event) {
  return event.source === 'local';
}

export function createLocalEvent(data) {
  const now = new Date().toISOString();
  const event = { ...data, id: createEventId(), source: 'local', createdAt: now, updatedAt: now };
  events.push(event);
  return event;
}

export function updateLocalEvent(id, patch) {
  const event = events.find((e) => e.id === id);
  if (!event) return null;
  Object.assign(event, patch, { updatedAt: new Date().toISOString() });
  return event;
}

export function deleteLocalEvent(id) {
  const idx = events.findIndex((e) => e.id === id);
  if (idx !== -1) events.splice(idx, 1);
}

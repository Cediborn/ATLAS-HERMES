// Atlas — Calendar canonical data: calendars, event types, and NATIVE events
// only. Deadlines/reminders sourced from Projects/Habits are never copied in
// here — see repository.js for how those get merged in at read time.

/**
 * @typedef {Object} CalendarEvent
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} notes
 * @property {string} start            ISO datetime
 * @property {string} end              ISO datetime
 * @property {boolean} allDay
 * @property {string} calendarId
 * @property {string|null} color        overrides the calendar's color if set
 * @property {string} location
 * @property {boolean} recurring
 * @property {'daily'|'weekdays'|'weekly'|'biweekly'|'monthly'|'yearly'|'custom'|null} recurrenceRule
 * @property {boolean} completed
 * @property {'low'|'medium'|'high'|'critical'} priority
 * @property {string} type              one of EVENT_TYPES
 * @property {boolean} deadline         styled with the red/countdown/overdue treatment, independent of `type`
 * @property {number|null} reminderMinutesBefore
 * @property {string|null} projectId
 * @property {string|null} habitId
 * @property {string|null} goalId
 * @property {number} attachmentsCount
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string|null} googleEventId  unpopulated placeholder for a future Google Calendar adapter
 * @property {'local'} source           adapted events carry their own source id instead ('projects' | 'habits')
 */

export const CALENDARS = [
  { id: 'personal', name: 'Personal', color: 'blue', visible: true },
  { id: 'school', name: 'School', color: 'violet', visible: true },
  { id: 'work', name: 'Work', color: 'slate', visible: true },
  { id: 'fitness', name: 'Fitness', color: 'emerald', visible: true },
  { id: 'travel', name: 'Travel', color: 'amber', visible: true }, // proves the architecture isn't hardcoded to 4 calendars
];

export function calendar(id) {
  return CALENDARS.find((c) => c.id === id) || CALENDARS[0];
}

// Which calendars are visible is a lightweight per-workspace UI preference,
// so it lives in localStorage (like theme/sidebar) rather than the data layer.
export function applyCalendarVisibility(workspaceId) {
  try {
    const raw = localStorage.getItem(`atlas:calVis:${workspaceId}`);
    if (!raw) return;
    const hidden = JSON.parse(raw);
    for (const c of CALENDARS) c.visible = !hidden.includes(c.id);
  } catch {
    // malformed pref — fall back to all visible
  }
}

export function setCalendarVisibility(workspaceId, calendarId, visible) {
  try {
    const raw = localStorage.getItem(`atlas:calVis:${workspaceId}`);
    const hidden = raw ? JSON.parse(raw) : [];
    const set = new Set(hidden);
    if (visible) set.delete(calendarId);
    else set.add(calendarId);
    localStorage.setItem(`atlas:calVis:${workspaceId}`, JSON.stringify([...set]));
  } catch {
    // storage unavailable — visibility just won't be remembered
  }
}

export const EVENT_TYPE_CONFIG = {
  'Normal Event': { icon: 'calendar' },
  Meeting: { icon: 'users' },
  'Project Deadline': { icon: 'folder' },
  'Habit Reminder': { icon: 'flame' },
  'Goal Milestone': { icon: 'target' },
  Birthday: { icon: 'gift' },
  Exam: { icon: 'clipboardCheck' },
  Assignment: { icon: 'fileText' },
  Custom: { icon: 'sparkle' },
};
export const EVENT_TYPES = Object.keys(EVENT_TYPE_CONFIG);

const base = {
  description: '', notes: '', color: null, location: '',
  recurring: false, recurrenceRule: null, completed: false,
  priority: 'medium', deadline: false, reminderMinutesBefore: 30,
  projectId: null, habitId: null, goalId: null, attachmentsCount: 0,
  googleEventId: null, source: 'local',
};

export let events = [
  { ...base, id: 'e1', title: 'Team sync', type: 'Meeting', calendarId: 'work',
    start: '2026-07-27T14:00', end: '2026-07-27T14:30', allDay: false,
    recurring: true, recurrenceRule: 'weekly',
    description: 'Weekly status check-in with the team.', createdAt: '2026-06-01', updatedAt: '2026-06-01' },

  { ...base, id: 'e2', title: 'Dentist appointment', type: 'Normal Event', calendarId: 'personal',
    start: '2026-07-27T16:30', end: '2026-07-27T17:15', allDay: false, priority: 'low',
    location: 'Downtown Dental', createdAt: '2026-07-01', updatedAt: '2026-07-01' },

  { ...base, id: 'e3', title: '1:1 with Sarah', type: 'Meeting', calendarId: 'work',
    start: '2026-07-28T10:00', end: '2026-07-28T10:30', allDay: false,
    recurring: true, recurrenceRule: 'weekly',
    createdAt: '2026-06-01', updatedAt: '2026-06-01' },

  { ...base, id: 'e4', title: 'Marketing site content review', type: 'Meeting', calendarId: 'work',
    start: '2026-07-28T13:00', end: '2026-07-28T14:00', allDay: false,
    description: 'Walk through the new landing page copy before it ships.',
    createdAt: '2026-07-20', updatedAt: '2026-07-20' },

  { ...base, id: 'e5', title: "Sarah's birthday", type: 'Birthday', calendarId: 'personal',
    start: '2026-08-03T00:00', end: '2026-08-03T23:59', allDay: true,
    recurring: true, recurrenceRule: 'yearly', priority: 'low', reminderMinutesBefore: 1440,
    createdAt: '2025-08-03', updatedAt: '2025-08-03' },

  { ...base, id: 'e6', title: 'Distributed Systems \u2014 final exam', type: 'Exam', calendarId: 'school',
    start: '2026-08-05T09:00', end: '2026-08-05T11:00', allDay: false,
    priority: 'critical', deadline: true, reminderMinutesBefore: 720,
    location: 'Hall B, Room 204', createdAt: '2026-07-01', updatedAt: '2026-07-01' },

  { ...base, id: 'e7', title: 'Problem set 6 due', type: 'Assignment', calendarId: 'school',
    start: '2026-07-31T23:59', end: '2026-07-31T23:59', allDay: false,
    priority: 'high', deadline: true,
    createdAt: '2026-07-15', updatedAt: '2026-07-15' },

  { ...base, id: 'e8', title: 'Family reunion', type: 'Normal Event', calendarId: 'personal',
    start: '2026-07-10T00:00', end: '2026-07-10T23:59', allDay: true, completed: true, priority: 'low',
    createdAt: '2026-05-20', updatedAt: '2026-07-10' },

  { ...base, id: 'e9', title: 'Marathon race day', type: 'Goal Milestone', calendarId: 'fitness',
    start: '2026-10-12T00:00', end: '2026-10-12T23:59', allDay: true, priority: 'high',
    description: 'The one the last four months of training were for.',
    createdAt: '2026-05-01', updatedAt: '2026-05-01' },

  { ...base, id: 'e10', title: 'Weekly grocery run', type: 'Normal Event', calendarId: 'personal',
    start: '2026-07-25T10:00', end: '2026-07-25T11:00', allDay: false, priority: 'low',
    recurring: true, recurrenceRule: 'weekly', reminderMinutesBefore: 15,
    createdAt: '2026-06-01', updatedAt: '2026-06-01' },

  { ...base, id: 'e11', title: 'Yoga class', type: 'Normal Event', calendarId: 'fitness',
    start: '2026-07-29T18:00', end: '2026-07-29T19:00', allDay: false,
    recurring: true, recurrenceRule: 'weekly',
    createdAt: '2026-06-15', updatedAt: '2026-06-15' },

  { ...base, id: 'e12', title: 'Flight to visit family', type: 'Custom', calendarId: 'travel',
    start: '2026-08-14T00:00', end: '2026-08-14T23:59', allDay: true,
    description: 'Direct flight, arriving evening.', reminderMinutesBefore: 180,
    createdAt: '2026-07-01', updatedAt: '2026-07-01' },

  { ...base, id: 'e13', title: 'Onboarding flow check-in', type: 'Meeting', calendarId: 'work',
    start: '2026-07-29T15:00', end: '2026-07-29T15:30', allDay: false,
    createdAt: '2026-07-22', updatedAt: '2026-07-22' },

  { ...base, id: 'e14', title: 'Pitch rehearsal', type: 'Meeting', calendarId: 'work',
    start: '2026-07-30T16:00', end: '2026-07-30T17:00', allDay: false, priority: 'high',
    description: 'Full run-through before the real thing.',
    createdAt: '2026-07-20', updatedAt: '2026-07-20' },

  { ...base, id: 'e15', title: 'Passport renewal appointment', type: 'Normal Event', calendarId: 'personal',
    start: '2026-08-06T09:00', end: '2026-08-06T09:30', allDay: false, priority: 'medium', deadline: true,
    location: 'Passport Agency', createdAt: '2026-07-10', updatedAt: '2026-07-10' },

  { ...base, id: 'e16', title: 'Thesis committee check-in', type: 'Meeting', calendarId: 'school',
    start: '2026-08-04T14:00', end: '2026-08-04T14:45', allDay: false,
    createdAt: '2026-07-18', updatedAt: '2026-07-18' },

  { ...base, id: 'e17', title: 'Weekend hike', type: 'Normal Event', calendarId: 'fitness',
    start: '2026-08-01T08:00', end: '2026-08-01T12:00', allDay: false, priority: 'low',
    createdAt: '2026-07-20', updatedAt: '2026-07-20' },

  { ...base, id: 'e18', title: 'Newsletter draft due', type: 'Assignment', calendarId: 'work',
    start: '2026-07-30T23:59', end: '2026-07-30T23:59', allDay: false, priority: 'medium', deadline: true,
    notes: 'Topic list is already in Notes \u2014 just needs a first pass.',
    createdAt: '2026-07-15', updatedAt: '2026-07-25' },

  { ...base, id: 'e19', title: 'Book club', type: 'Meeting', calendarId: 'personal',
    start: '2026-08-06T19:00', end: '2026-08-06T20:30', allDay: false,
    createdAt: '2026-07-05', updatedAt: '2026-07-05' },

  { ...base, id: 'e20', title: 'Organic Chemistry final', type: 'Exam', calendarId: 'school',
    start: '2026-02-20T09:00', end: '2026-02-20T11:00', allDay: false, completed: true, priority: 'high',
    createdAt: '2026-01-10', updatedAt: '2026-02-20' },
];

// Hydration hook — see projects/data.js for why this replaces in place.
export function setEvents(list) {
  events.splice(0, events.length, ...list);
}

let idCounter = 1000;
export function createEventId() {
  idCounter += 1;
  return `e${idCounter}-${Date.now()}`;
}

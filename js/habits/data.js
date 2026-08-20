// Atlas — Habits canonical data. Same discipline as projects/data.js: this
// file holds raw content + the minimal shape predicate (isDueOn) that
// generating that content needs. Everything DERIVED (streaks, stats,
// heatmap, filtering/sorting) lives in state.js, same layering as
// calendar/repository.js (raw+adapt) vs calendar/state.js (derive+UI state).
//
// One deliberate difference from Projects/Notes/Calendar's mock data: those
// modules hand-authored a fixed list of static-dated rows. A habit's
// completion history is a time series that should still look coherent
// whenever the app is actually opened — so instead of hardcoded dates, this
// generates ~90 days of history ending "today" (whatever today is) from a
// handful of named parameters per habit (target success rate, a forced
// current-streak tail, a skip rate). Deterministic per habit (seeded), not
// random noise on every reload.

import { dateKey, todayDate } from '../date-utils.js';

/**
 * @typedef {Object} Habit
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} category            - a CATEGORY_CONFIG key
 * @property {string} icon                - icon name from icons.js
 * @property {string} color               - identity color key (own accent, independent of category color)
 * @property {'daily'|'weekdays'|'weekends'|'custom'} frequency
 * @property {number[]|null} customDays   - 0=Sun..6=Sat; only used when frequency === 'custom'
 * @property {string|null} reminderTime   - 'HH:MM' 24h, or null for no reminder
 * @property {{targetValue:number, unit:string}|null} goal
 * @property {'Low'|'Medium'|'High'} priority
 * @property {string[]} tags
 * @property {string} notes
 * @property {boolean} favorite
 * @property {boolean} archived
 * @property {string|null} linkedProjectId - optional Projects integration (real; see repository.js)
 * @property {string|null} goalId          - reserved for a future Goals module; unused today, not faked
 * @property {string} createdAt            - 'YYYY-MM-DD'
 * @property {string} updatedAt            - 'YYYY-MM-DD'
 */

/**
 * @typedef {Object} HabitCompletion
 * @property {string} habitId
 * @property {string} date   - 'YYYY-MM-DD'
 * @property {'done'|'skipped'} status  - "missed" is never stored; it's
 *   inferred in state.js for any past due-date with no entry here. Storing
 *   an explicit row for every non-completion would just be a bigger, more
 *   error-prone version of the same information.
 */

export const CATEGORY_CONFIG = {
  morning: { label: 'Morning', icon: 'sun', color: 'amber' },
  afternoon: { label: 'Afternoon', icon: 'clock', color: 'blue' },
  evening: { label: 'Evening', icon: 'moon', color: 'violet' },
  health: { label: 'Health', icon: 'heart', color: 'rose' },
  learning: { label: 'Learning', icon: 'bookOpen', color: 'teal' },
  fitness: { label: 'Fitness', icon: 'flame', color: 'emerald' },
  reading: { label: 'Reading', icon: 'book', color: 'slate' },
  coding: { label: 'Coding', icon: 'code', color: 'blue' },
  custom: { label: 'Custom', icon: 'sparkle', color: 'violet' },
};
export const CATEGORIES = Object.keys(CATEGORY_CONFIG);

// Only 3 tiers (spec doesn't list a Critical tier for Habits the way
// Projects has one) — Low/neutral, Medium/warning, High/danger, same
// escalate-by-weight logic as Projects' priority system.
export const PRIORITY_CONFIG = {
  Low: { color: 'neutral' },
  Medium: { color: 'warning' },
  High: { color: 'danger' },
};
export const PRIORITIES = Object.keys(PRIORITY_CONFIG);

export const FREQUENCY_CONFIG = {
  daily: { label: 'Daily' },
  weekdays: { label: 'Weekdays' },
  weekends: { label: 'Weekends' },
  custom: { label: 'Custom days' },
};
export const FREQUENCIES = Object.keys(FREQUENCY_CONFIG);
export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const HABIT_COLORS = ['blue', 'violet', 'teal', 'amber', 'rose', 'emerald', 'slate'];

// Streak milestones — used to compute "next milestone" without inventing a
// stored field for something that's always derivable from the current streak.
export const STREAK_MILESTONES = [7, 14, 30, 50, 100, 180, 365];

// ---- isDueOn — the one predicate both the generator below and state.js's
// stats/heatmap/streak math need; kept here since it's really about the
// Habit shape itself, not a UI concern. ----
export function isDueOn(habit, date) {
  const day = date.getDay(); // 0 Sun .. 6 Sat
  switch (habit.frequency) {
    case 'daily':
      return true;
    case 'weekdays':
      return day >= 1 && day <= 5;
    case 'weekends':
      return day === 0 || day === 6;
    case 'custom':
      return Array.isArray(habit.customDays) && habit.customDays.includes(day);
    default:
      return true;
  }
}

function daysAgo(n) {
  const d = todayDate();
  d.setDate(d.getDate() - n);
  return dateKey(d);
}

export let habits = [
  {
    id: 'h1', title: 'Morning Run', description: '3 miles before the day gets busy.',
    category: 'morning', icon: 'flame', color: 'amber', frequency: 'daily', customDays: null,
    reminderTime: '06:30', goal: { targetValue: 3, unit: 'miles' }, priority: 'High',
    tags: ['Wellness'], notes: 'Route through the park when it\u2019s not raining.',
    favorite: true, archived: false, linkedProjectId: null, goalId: 'g3',
    createdAt: daysAgo(150), updatedAt: daysAgo(0),
  },
  {
    id: 'h2', title: 'Read Before Bed', description: '20 pages, no screens after.',
    category: 'evening', icon: 'bookOpen', color: 'violet', frequency: 'daily', customDays: null,
    reminderTime: '21:00', goal: { targetValue: 20, unit: 'pages' }, priority: 'Medium',
    tags: ['Learning'], notes: '',
    favorite: false, archived: false, linkedProjectId: null, goalId: 'g4',
    createdAt: daysAgo(120), updatedAt: daysAgo(0),
  },
  {
    id: 'h3', title: 'Drink 8 Glasses of Water', description: 'Spread through the day, not all at once.',
    category: 'health', icon: 'heart', color: 'rose', frequency: 'daily', customDays: null,
    reminderTime: null, goal: { targetValue: 8, unit: 'glasses' }, priority: 'High',
    tags: ['Wellness'], notes: '',
    favorite: false, archived: false, linkedProjectId: null, goalId: null,
    createdAt: daysAgo(160), updatedAt: daysAgo(0),
  },
  {
    id: 'h4', title: 'Meditate 10 Minutes', description: 'Breathing app, first thing.',
    category: 'morning', icon: 'sparkle', color: 'teal', frequency: 'daily', customDays: null,
    reminderTime: '07:00', goal: { targetValue: 10, unit: 'minutes' }, priority: 'Medium',
    tags: ['Wellness', 'Mindfulness'], notes: '',
    favorite: false, archived: false, linkedProjectId: null, goalId: null,
    createdAt: daysAgo(100), updatedAt: daysAgo(0),
  },
  {
    id: 'h5', title: 'Study Data Structures', description: 'One topic a day — trees this week.',
    category: 'learning', icon: 'bookOpen', color: 'blue', frequency: 'weekdays', customDays: null,
    reminderTime: '18:00', goal: { targetValue: 45, unit: 'minutes' }, priority: 'High',
    tags: ['University'], notes: 'Pairs with the thesis benchmark work.',
    favorite: false, archived: false, linkedProjectId: 'p5', goalId: 'g1',
    createdAt: daysAgo(95), updatedAt: daysAgo(0),
  },
  {
    id: 'h6', title: 'Practice Guitar', description: 'Scales, then whatever song is stuck in my head.',
    category: 'custom', icon: 'sparkle', color: 'rose', frequency: 'custom', customDays: [1, 3, 5],
    reminderTime: '19:30', goal: { targetValue: 30, unit: 'minutes' }, priority: 'Low',
    tags: ['Creative'], notes: '',
    favorite: false, archived: false, linkedProjectId: null, goalId: null,
    createdAt: daysAgo(110), updatedAt: daysAgo(0),
  },
  {
    id: 'h7', title: 'Leetcode Daily', description: 'One problem, untimed is fine.',
    category: 'coding', icon: 'code', color: 'blue', frequency: 'weekdays', customDays: null,
    reminderTime: '12:30', goal: { targetValue: 1, unit: 'problem' }, priority: 'Medium',
    tags: ['Engineering', 'Interview prep'], notes: 'Fell off after last week\u2019s deadline crunch — restarting.',
    favorite: false, archived: false, linkedProjectId: null, goalId: 'g1',
    createdAt: daysAgo(130), updatedAt: daysAgo(0),
  },
  {
    id: 'h8', title: 'Evening Walk', description: '20 minutes, no phone.',
    category: 'fitness', icon: 'flame', color: 'emerald', frequency: 'daily', customDays: null,
    reminderTime: '20:00', goal: { targetValue: 20, unit: 'minutes' }, priority: 'Low',
    tags: ['Wellness'], notes: 'Skip on rain days rather than force it indoors.',
    favorite: false, archived: false, linkedProjectId: null, goalId: 'g3',
    createdAt: daysAgo(140), updatedAt: daysAgo(0),
  },
  {
    id: 'h9', title: 'Journal', description: 'Three sentences minimum — doesn\u2019t need to be profound.',
    category: 'evening', icon: 'fileText', color: 'slate', frequency: 'daily', customDays: null,
    reminderTime: '22:00', goal: null, priority: 'Medium',
    tags: ['Reflection'], notes: '',
    favorite: true, archived: false, linkedProjectId: null, goalId: null,
    createdAt: daysAgo(180), updatedAt: daysAgo(0),
  },
  {
    id: 'h10', title: 'Stretch', description: '10 minutes, hips and shoulders.',
    category: 'health', icon: 'target', color: 'violet', frequency: 'weekdays', customDays: null,
    reminderTime: '08:00', goal: { targetValue: 10, unit: 'minutes' }, priority: 'Low',
    tags: ['Wellness'], notes: 'Keeps slipping — try attaching it to coffee.',
    favorite: false, archived: false, linkedProjectId: null, goalId: null,
    createdAt: daysAgo(90), updatedAt: daysAgo(0),
  },
  {
    id: 'h11', title: 'Budget Review', description: 'Check spending against the monthly plan.',
    category: 'custom', icon: 'wallet', color: 'amber', frequency: 'custom', customDays: [0],
    reminderTime: '10:00', goal: null, priority: 'Medium',
    tags: ['Finance'], notes: 'Paused for now.',
    favorite: false, archived: true, linkedProjectId: null, goalId: 'g5',
    createdAt: daysAgo(200), updatedAt: daysAgo(35),
  },
];

export function allHabitTags() {
  return [...new Set(habits.flatMap((h) => h.tags || []))].sort();
}

export function habitById(id) {
  return habits.find((h) => h.id === id) || null;
}

// ---- Deterministic generated history (see file header) ----
const HISTORY_DAYS = 90;

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function next() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// `tailStreakDays` forces that many of the most recent DUE days to 'done',
// guaranteeing a clean, inspectable current streak instead of hoping the
// random roll happens to produce one. Today itself is deliberately excluded
// (loop stops at i=1) so every habit starts genuinely uncompleted-today —
// there's something real to click on first load, not a pre-filled demo.
function generateHistory(habit, { seed, successRate, skipRate = 0.08, tailStreakDays = 0 }) {
  const rand = seededRandom(seed);
  const today = todayDate();
  const dueDates = [];
  for (let i = HISTORY_DAYS; i >= 1; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (isDueOn(habit, d)) dueDates.push(d);
  }
  const forcedFrom = Math.max(0, dueDates.length - tailStreakDays);
  const rows = [];
  dueDates.forEach((d, idx) => {
    const key = dateKey(d);
    if (idx >= forcedFrom) {
      rows.push({ habitId: habit.id, date: key, status: 'done' });
      return;
    }
    const roll = rand();
    if (roll < successRate) rows.push({ habitId: habit.id, date: key, status: 'done' });
    else if (roll < successRate + skipRate) rows.push({ habitId: habit.id, date: key, status: 'skipped' });
    // else: nothing logged for this due day -> inferred 'missed' in state.js
  });
  return rows;
}

const HISTORY_PROFILES = {
  h1: { seed: 101, successRate: 0.82, skipRate: 0.06, tailStreakDays: 11 },
  h2: { seed: 102, successRate: 0.68, skipRate: 0.05, tailStreakDays: 4 },
  h3: { seed: 103, successRate: 0.9, skipRate: 0.04, tailStreakDays: 23 },
  h4: { seed: 104, successRate: 0.6, skipRate: 0.1, tailStreakDays: 6 },
  h5: { seed: 105, successRate: 0.7, skipRate: 0.05, tailStreakDays: 3 },
  h6: { seed: 106, successRate: 0.55, skipRate: 0.1, tailStreakDays: 2 },
  h7: { seed: 107, successRate: 0.5, skipRate: 0.05, tailStreakDays: 0 },
  h8: { seed: 108, successRate: 0.45, skipRate: 0.35, tailStreakDays: 0 },
  h9: { seed: 109, successRate: 0.85, skipRate: 0.05, tailStreakDays: 30 },
  h10: { seed: 110, successRate: 0.3, skipRate: 0.1, tailStreakDays: 0 },
  h11: { seed: 111, successRate: 0.6, skipRate: 0.1, tailStreakDays: 0 },
};

export let completions = habits.flatMap((h) => generateHistory(h, HISTORY_PROFILES[h.id]));

// Hydration hooks — see projects/data.js for why these replace in place.
export function setHabits(list) {
  habits.splice(0, habits.length, ...list);
}

export function setCompletions(list) {
  completions.splice(0, completions.length, ...list);
}

let habitIdCounter = 1000;
export function createHabitId() {
  habitIdCounter += 1;
  return `h${habitIdCounter}-${Date.now()}`;
}

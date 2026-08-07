// Atlas — Habits page state. Same discipline as Projects/Calendar: pure
// functions for anything computable, a small page-local store for anything
// that's genuinely UI state. Streak/stats/heatmap math lives here rather
// than in data.js, mirroring calendar/repository.js (raw+adapt) vs
// calendar/state.js (derive+UI state).

import { habits, completions, isDueOn, habitById, CATEGORY_CONFIG, FREQUENCY_CONFIG, WEEKDAY_LABELS, STREAK_MILESTONES } from './data.js';
import { dateKey, todayDate, todayKey, monthGridDays } from '../date-utils.js';

// ---- Completion index — built once from data.js's flat list, then mutated
// directly (same "no separate copy" rule as calendar/repository.js's local
// events array: this Map IS the live source of truth from here on). ----
const completionIndex = new Map(); // habitId -> Map(dateKey -> 'done'|'skipped')
for (const c of completions) {
  if (!completionIndex.has(c.habitId)) completionIndex.set(c.habitId, new Map());
  completionIndex.get(c.habitId).set(c.date, c.status);
}

export function getStatusOn(habitId, dateKeyStr) {
  return completionIndex.get(habitId)?.get(dateKeyStr) || null;
}

export function setCompletionStatus(habitId, dateKeyStr, status) {
  let map = completionIndex.get(habitId);
  if (!map) {
    map = new Map();
    completionIndex.set(habitId, map);
  }
  if (status === null) map.delete(dateKeyStr);
  else map.set(dateKeyStr, status);
  invalidateVisibleHabitsCache();
}

// Three-state cycle for the CompletionButton's own click: incomplete -> done
// -> skipped -> incomplete (undo). Explicit Complete/Skip/Undo menu actions
// call setCompletionStatus directly instead, for anyone who doesn't want to
// click through the cycle to reach a specific state.
export function cycleCompletion(habitId, dateKeyStr) {
  const current = getStatusOn(habitId, dateKeyStr);
  const next = current === 'done' ? 'skipped' : current === 'skipped' ? null : 'done';
  setCompletionStatus(habitId, dateKeyStr, next);
  return next;
}

// 'locked' = not due this day at all (no actionable control shown);
// 'missed' is inferred, never stored, for any past due day with no entry.
export function dayState(habit, date) {
  if (!isDueOn(habit, date)) return 'locked';
  const key = dateKey(date);
  const status = getStatusOn(habit.id, key);
  if (status === 'done') return 'done';
  if (status === 'skipped') return 'skipped';
  return key < todayKey() ? 'missed' : 'incomplete';
}

// ---- Streaks ----
// Safety valve against an unbounded walk (same style/purpose as
// calendar/repository.js's MAX_ITERATIONS) — not a real ceiling for any
// habit's actual history.
const STREAK_WALK_SAFETY = 400;

export function computeStreak(habit) {
  const todayK = todayKey();
  const cursor = todayDate();
  if (isDueOn(habit, cursor) && getStatusOn(habit.id, todayK) !== 'done') {
    cursor.setDate(cursor.getDate() - 1); // today's still in progress — walk starts at yesterday
  }

  let current = 0;
  const walk = new Date(cursor);
  for (let steps = 0; steps < STREAK_WALK_SAFETY; steps += 1) {
    if (!isDueOn(habit, walk)) {
      walk.setDate(walk.getDate() - 1);
      continue;
    }
    const status = getStatusOn(habit.id, dateKey(walk));
    if (status === 'done') {
      current += 1;
      walk.setDate(walk.getDate() - 1);
      continue;
    }
    if (status === 'skipped') {
      walk.setDate(walk.getDate() - 1); // grace day — doesn't extend or break
      continue;
    }
    break; // missed — streak ends here
  }

  let longest = 0;
  let running = 0;
  const scanCursor = new Date(`${habit.createdAt}T00:00:00`);
  const scanEnd = todayDate();
  for (let guard = 0; scanCursor <= scanEnd && guard < STREAK_WALK_SAFETY; guard += 1) {
    if (isDueOn(habit, scanCursor)) {
      const status = getStatusOn(habit.id, dateKey(scanCursor));
      if (status === 'done') {
        running += 1;
        longest = Math.max(longest, running);
      } else if (status !== 'skipped') {
        running = 0;
      }
    }
    scanCursor.setDate(scanCursor.getDate() + 1);
  }

  return { current, longest: Math.max(longest, current) };
}

export function nextMilestone(current) {
  return STREAK_MILESTONES.find((m) => m > current) || null;
}

export function topStreaks(kind = 'current', limit = 5) {
  return habits
    .filter((h) => !h.archived)
    .map((h) => ({ habit: h, streak: computeStreak(h) }))
    .sort((a, b) => (kind === 'longest' ? b.streak.longest - a.streak.longest : b.streak.current - a.streak.current))
    .slice(0, limit);
}

// Success rate excludes 'skipped' days from the denominator entirely (a
// skip is a granted pass, not a miss) and excludes today (not "over" yet).
export function computeSuccessRate(habit, windowDays = 30) {
  const today = todayDate();
  let counted = 0;
  let done = 0;
  for (let i = 1; i <= windowDays; i += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (!isDueOn(habit, d)) continue;
    const status = getStatusOn(habit.id, dateKey(d));
    if (status === 'skipped') continue;
    counted += 1;
    if (status === 'done') done += 1;
  }
  return counted ? Math.round((done / counted) * 100) : 0;
}

// Simple week-over-week trend for a StreakCard: this 7-day rate vs the 7
// days before it. Real comparison, not a decorative arrow.
export function computeTrend(habit) {
  const thisWeek = computeSuccessRate(habit, 7);
  const today = todayDate();
  let counted = 0;
  let done = 0;
  for (let i = 8; i <= 14; i += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (!isDueOn(habit, d)) continue;
    const status = getStatusOn(habit.id, dateKey(d));
    if (status === 'skipped') continue;
    counted += 1;
    if (status === 'done') done += 1;
  }
  const lastWeek = counted ? Math.round((done / counted) * 100) : 0;
  return thisWeek - lastWeek;
}

// ---- Dashboard-level aggregate stats (the 12 metrics on the page header /
// HabitDashboard). Each is computed, not stored — definitions noted inline
// since a couple of these could otherwise look like duplicates of each other. ----
export function computeDashboardStats() {
  const active = habits.filter((h) => !h.archived);
  const today = todayDate();
  const todayK = todayKey();

  const dueToday = active.filter((h) => isDueOn(h, today));
  const doneToday = dueToday.filter((h) => getStatusOn(h.id, todayK) === 'done');
  const todayCompletionPct = dueToday.length ? Math.round((doneToday.length / dueToday.length) * 100) : 0;

  function windowPct(days) {
    let due = 0;
    let done = 0;
    for (const h of active) {
      for (let i = 1; i <= days; i += 1) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        if (!isDueOn(h, d)) continue;
        const status = getStatusOn(h.id, dateKey(d));
        if (status === 'skipped') continue;
        due += 1;
        if (status === 'done') done += 1;
      }
    }
    return due ? Math.round((done / due) * 100) : 0;
  }

  const allStreaks = habits.map((h) => ({ habit: h, streak: computeStreak(h) }));
  const activeStreaks = allStreaks.filter((x) => !x.habit.archived);
  const currentStreak = activeStreaks.reduce((max, x) => Math.max(max, x.streak.current), 0);
  const longestStreak = allStreaks.reduce((max, x) => Math.max(max, x.streak.longest), 0);
  const consistentCount = activeStreaks.filter((x) => x.streak.current >= 3).length;
  const consistencyScore = activeStreaks.length ? Math.round((consistentCount / activeStreaks.length) * 100) : 0;

  let totalCompletions = 0;
  let skippedHabits = 0;
  let missedHabits = 0;
  for (const h of habits) {
    for (let i = 1; i <= 90; i += 1) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (!isDueOn(h, d)) continue;
      const status = getStatusOn(h.id, dateKey(d));
      if (status === 'done') totalCompletions += 1;
      if (i <= 30) {
        if (status === 'skipped') skippedHabits += 1;
        else if (!status) missedHabits += 1;
      }
    }
  }

  return {
    activeHabits: active.length,
    todayCompletionPct,
    weeklyCompletionPct: windowPct(7),
    monthlyCompletionPct: windowPct(30),
    currentStreak,
    longestStreak,
    totalCompletions,
    skippedHabits, // skipped entries in the last 30 days
    missedHabits, // inferred-missed due-days in the last 30 days
    archivedHabits: habits.length - active.length,
    completionPercentage: windowPct(90), // all-time-within-generated-window rate — deliberately a wider window than "Monthly" so the two numbers aren't the same stat twice
    consistencyScore, // % of active habits currently on a streak of 3+ days
  };
}

// ---- Weekly overview — rolling 7 days ending today (not calendar Mon-Sun,
// so it's always meaningful regardless of what day "today" is) ----
export function buildWeeklyOverview() {
  const today = todayDate();
  const todayK = todayKey();
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    const due = habits.filter((h) => !h.archived && isDueOn(h, d));
    const done = due.filter((h) => getStatusOn(h.id, key) === 'done');
    const skipped = due.filter((h) => getStatusOn(h.id, key) === 'skipped');
    const missed = key < todayK ? due.filter((h) => !getStatusOn(h.id, key)) : [];
    days.push({
      date: key,
      label: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d),
      isToday: key === todayK,
      completionPct: due.length ? Math.round((done.length / due.length) * 100) : 0,
      completedCount: done.length,
      missedCount: missed.length,
      skippedCount: skipped.length,
      dueCount: due.length,
    });
  }
  return days;
}

// ---- Monthly heatmap ----
export function buildHeatmapMonth(monthDate) {
  const grid = monthGridDays(monthDate); // shared with Calendar — see date-utils.js
  const todayK = todayKey();
  return grid.map((cell) => {
    if (!cell.inCurrentMonth || cell.key > todayK) {
      return { ...cell, level: null, completionPct: null, dueCount: 0, doneCount: 0 };
    }
    const due = habits.filter((h) => !h.archived && isDueOn(h, cell.date));
    const done = due.filter((h) => getStatusOn(h.id, cell.key) === 'done');
    const pct = due.length ? Math.round((done.length / due.length) * 100) : null;
    let level = 'none';
    if (pct === null || pct === 0) level = 'none';
    else if (pct >= 100) level = 'perfect';
    else if (pct >= 50) level = 'high';
    else if (pct >= 25) level = 'medium';
    else level = 'low';
    return { ...cell, level, completionPct: pct, dueCount: due.length, doneCount: done.length };
  });
}

export function categoryStats(categoryKey, list) {
  const inCat = list.filter((h) => h.category === categoryKey);
  const today = todayDate();
  const todayK = todayKey();
  const due = inCat.filter((h) => isDueOn(h, today));
  const done = due.filter((h) => getStatusOn(h.id, todayK) === 'done');
  return { count: inCat.length, dueToday: due.length, doneToday: done.length, pct: due.length ? Math.round((done.length / due.length) * 100) : 0 };
}

// ---- Formatting helpers ----
export function formatFrequency(habit) {
  if (habit.frequency === 'custom') {
    return (habit.customDays || []).slice().sort().map((d) => WEEKDAY_LABELS[d]).join(', ') || 'Custom';
  }
  return FREQUENCY_CONFIG[habit.frequency]?.label || habit.frequency;
}

export function formatReminderTime(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

// ---- Page UI state (search/filter/sort — view state, not app state) ----
let state = {
  search: '',
  categoryFilter: new Set(),
  priorityFilter: new Set(),
  statusFilter: 'active', // 'active' | 'archived' | 'all'
  favoritesOnly: false,
  sortBy: 'currentStreak',
};
const listeners = new Set();

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
  setState({ search: '', categoryFilter: new Set(), priorityFilter: new Set(), favoritesOnly: false });
}

export function filterHabits(list, f) {
  const q = f.search.trim().toLowerCase();
  return list.filter((h) => {
    if (f.statusFilter === 'active' && h.archived) return false;
    if (f.statusFilter === 'archived' && !h.archived) return false;
    if (q && !h.title.toLowerCase().includes(q) && !h.description.toLowerCase().includes(q) && !h.tags.some((t) => t.toLowerCase().includes(q))) return false;
    if (f.categoryFilter.size && !f.categoryFilter.has(h.category)) return false;
    if (f.priorityFilter.size && !f.priorityFilter.has(h.priority)) return false;
    if (f.favoritesOnly && !h.favorite) return false;
    return true;
  });
}

const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };

export function sortHabits(list, sortBy) {
  const arr = [...list];
  switch (sortBy) {
    case 'alphabetical':
      return arr.sort((a, b) => a.title.localeCompare(b.title));
    case 'completionRate':
      return arr.sort((a, b) => computeSuccessRate(b) - computeSuccessRate(a));
    case 'longestStreak':
      return arr.sort((a, b) => computeStreak(b).longest - computeStreak(a).longest);
    case 'createdAt':
      return arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case 'updatedAt':
      return arr.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    case 'priority':
      return arr.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    case 'category':
      return arr.sort((a, b) => a.category.localeCompare(b.category));
    case 'currentStreak':
    default:
      return arr.sort((a, b) => computeStreak(b).current - computeStreak(a).current);
  }
}

export const SORT_OPTIONS = [
  { id: 'currentStreak', label: 'Current streak' },
  { id: 'longestStreak', label: 'Longest streak' },
  { id: 'completionRate', label: 'Completion %' },
  { id: 'alphabetical', label: 'Alphabetical' },
  { id: 'priority', label: 'Priority' },
  { id: 'category', label: 'Category' },
  { id: 'createdAt', label: 'Newest' },
  { id: 'updatedAt', label: 'Recently updated' },
];

// Memoized filter+sort — invalidated explicitly wherever habit data mutates
// (Projects shipped without this at first and it caused a real stale-cache
// bug, so every module since builds it in from the start).
let lastKey = null;
let lastResult = null;

export function getVisibleHabits(allHabits, f) {
  const key = JSON.stringify({
    search: f.search, cat: [...f.categoryFilter].sort(), pri: [...f.priorityFilter].sort(),
    status: f.statusFilter, fav: f.favoritesOnly, sort: f.sortBy, n: allHabits.length,
  });
  if (key === lastKey) return lastResult;
  lastKey = key;
  lastResult = sortHabits(filterHabits(allHabits, f), f.sortBy);
  return lastResult;
}

export function invalidateVisibleHabitsCache() {
  lastKey = null;
}

// ---- CRUD — mutates data.js's own arrays directly, same pattern as
// calendar/repository.js's createLocalEvent/deleteLocalEvent ----
export function createHabit(data) {
  const now = todayKey();
  const habit = {
    customDays: null, goal: null, tags: [], notes: '', favorite: false, archived: false,
    linkedProjectId: null, goalId: null,
    ...data,
    id: `h${Date.now()}`, createdAt: now, updatedAt: now,
  };
  habits.push(habit);
  invalidateVisibleHabitsCache();
  return habit;
}

export function updateHabit(id, patch) {
  const h = habitById(id);
  if (!h) return null;
  Object.assign(h, patch, { updatedAt: todayKey() });
  invalidateVisibleHabitsCache();
  return h;
}

export function deleteHabit(id) {
  const idx = habits.findIndex((h) => h.id === id);
  if (idx !== -1) habits.splice(idx, 1);
  invalidateVisibleHabitsCache();
}

export function duplicateHabit(id) {
  const h = habitById(id);
  if (!h) return null;
  const now = todayKey();
  const copy = { ...h, id: `h${Date.now()}`, title: `${h.title} (copy)`, favorite: false, createdAt: now, updatedAt: now };
  habits.push(copy);
  invalidateVisibleHabitsCache();
  return copy;
}

export function toggleFavorite(id) {
  const h = habitById(id);
  if (h) {
    h.favorite = !h.favorite;
    invalidateVisibleHabitsCache();
  }
  return h;
}

export function toggleArchived(id) {
  const h = habitById(id);
  if (h) {
    h.archived = !h.archived;
    invalidateVisibleHabitsCache();
  }
  return h;
}

export { CATEGORY_CONFIG };

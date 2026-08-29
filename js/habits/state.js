// Atlas — Habits page state.
// Uses shared list-state.js for filtering/sorting/memoization.
// This file only defines Habits-specific config and enrichments.

import { dateKey, todayDate, todayKey, monthGridDays } from '../date-utils.js';
import { createListState, createFilterFn, createSortFn } from '../list-state.js';
import { CATEGORY_CONFIG, FREQUENCY_CONFIG, WEEKDAY_LABELS, STREAK_MILESTONES } from './data.js';
import { saveHabits, saveCompletions } from '../persistence.js';

// ---- Completion index — built from data.js's flat list, then mutated
// directly (same "no separate copy" rule as calendar/repository.js's local
// events array: this Map IS the live source of truth from here on).
// Rebuilt whenever persistence hydrates the arrays from IndexedDB.
const completionIndex = new Map(); // habitId -> Map(dateKey -> 'done'|'skipped')

export function rebuildCompletionIndex() {
  completionIndex.clear();
  for (const c of completions) {
    if (!completionIndex.has(c.habitId)) completionIndex.set(c.habitId, new Map());
    completionIndex.get(c.habitId).set(c.date, c.status);
  }
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
  // Keep the flat `completions` array (the persisted representation) in sync
  // with the Map so js/persistence.js's saveCompletions() captures reality.
  const existingIdx = completions.findIndex((c) => c.habitId === habitId && c.date === dateKeyStr);
  if (status === null) {
    map.delete(dateKeyStr);
    if (existingIdx !== -1) completions.splice(existingIdx, 1);
  } else {
    map.set(dateKeyStr, status);
    if (existingIdx !== -1) completions[existingIdx].status = status;
    else completions.push({ habitId, date: dateKeyStr, status });
  }
  invalidateCache(); // invalidate visible habits cache
  saveCompletions();
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

import { habits, completions, isDueOn, habitById, createHabitId } from './data.js';

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

// ---- Dashboard-level aggregate stats ----
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
    skippedHabits,
    missedHabits,
    archivedHabits: habits.length - active.length,
    completionPercentage: windowPct(90),
    consistencyScore,
  };
}

// ---- Weekly overview ----
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
  const grid = monthGridDays(monthDate);
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

// ---- Page-scoped state ----
const initialState = {
  search: '',
  categoryFilter: new Set(),
  priorityFilter: new Set(),
  statusFilter: 'active', // 'active' | 'archived' | 'all'
  favoritesOnly: false,
  sortBy: 'currentStreak',
};

const SORT_OPTIONS = [
  { id: 'currentStreak', label: 'Current streak' },
  { id: 'longestStreak', label: 'Longest streak' },
  { id: 'completionRate', label: 'Completion %' },
  { id: 'alphabetical', label: 'Alphabetical' },
  { id: 'priority', label: 'Priority' },
  { id: 'category', label: 'Category' },
  { id: 'createdAt', label: 'Newest' },
  { id: 'updatedAt', label: 'Recently updated' },
];

// ---- Filtering (pure) ----
function matchesHabit(h, f) {
  const q = f.search.trim().toLowerCase();
  if (f.statusFilter === 'active' && h.archived) return false;
  if (f.statusFilter === 'archived' && !h.archived) return false;
  if (q && !h.title.toLowerCase().includes(q) && !h.description.toLowerCase().includes(q) && !h.tags.some((t) => t.toLowerCase().includes(q))) return false;
  if (f.categoryFilter.size && !f.categoryFilter.has(h.category)) return false;
  if (f.priorityFilter.size && !f.priorityFilter.has(h.priority)) return false;
  if (f.favoritesOnly && !h.favorite) return false;
  return true;
}

// ---- Sorting (pure) ----
const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };

const comparators = {
  alphabetical: (a, b) => a.title.localeCompare(b.title),
  completionRate: (a, b) => computeSuccessRate(b) - computeSuccessRate(a),
  longestStreak: (a, b) => computeStreak(b).longest - computeStreak(a).longest,
  createdAt: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  updatedAt: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
  priority: (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  category: (a, b) => a.category.localeCompare(b.category),
  currentStreak: (a, b) => computeStreak(b).current - computeStreak(a).current,
};

// ---- Build cache key ----
function buildKey(f, n) {
  return {
    search: f.search,
    cat: [...f.categoryFilter].sort(),
    pri: [...f.priorityFilter].sort(),
    status: f.statusFilter,
    fav: f.favoritesOnly,
    sort: f.sortBy,
    n,
  };
}

// ---- Create the shared list state ----
const listState = createListState({
  moduleName: 'habits',
  initialState,
  sortOptions: SORT_OPTIONS,
  filterFn: createFilterFn(matchesHabit),
  sortFn: createSortFn(comparators, 'currentStreak'),
  buildKey,
  resetKeys: ['search', 'categoryFilter', 'priorityFilter', 'favoritesOnly', 'statusFilter'],
});

// ---- Re-export standard API ----
export const {
  getState,
  setState,
  subscribe,
  resetFilters,
  filter: filterHabits,
  sort: sortHabits,
  getVisible: getVisibleHabits,
  invalidateCache: invalidateVisibleHabitsCache,
} = listState;

export { SORT_OPTIONS };

// ---- Re-export date utils and streak helpers for view.js ----
export { dateKey, todayDate, todayKey, monthGridDays };
export { CATEGORY_CONFIG, FREQUENCY_CONFIG, WEEKDAY_LABELS, STREAK_MILESTONES };

// ---- CRUD — mutates data.js's own arrays directly ----
export function createHabit(data) {
  const now = todayKey();
  const habit = {
    customDays: null, goal: null, tags: [], notes: '', favorite: false, archived: false,
    linkedProjectId: null, goalId: null,
    ...data,
    id: createHabitId(), createdAt: now, updatedAt: now,
  };
  habits.push(habit);
  invalidateCache();
  saveHabits();
  return habit;
}

export function updateHabit(id, patch) {
  const h = habitById(id);
  if (!h) return null;
  Object.assign(h, patch, { updatedAt: todayKey() });
  invalidateCache();
  saveHabits();
  return h;
}

export function deleteHabit(id) {
  const idx = habits.findIndex((h) => h.id === id);
  if (idx !== -1) habits.splice(idx, 1);
  completionIndex.delete(id);
  for (let i = completions.length - 1; i >= 0; i -= 1) {
    if (completions[i].habitId === id) completions.splice(i, 1);
  }
  invalidateCache();
  saveHabits();
  saveCompletions();
}

export function duplicateHabit(id) {
  const h = habitById(id);
  if (!h) return null;
  const now = todayKey();
  const copy = { ...h, id: createHabitId(), title: `${h.title} (copy)`, favorite: false, createdAt: now, updatedAt: now };
  habits.push(copy);
  invalidateCache();
  saveHabits();
  return copy;
}

export function toggleFavorite(id) {
  const h = habitById(id);
  if (h) {
    h.favorite = !h.favorite;
    invalidateCache();
    saveHabits();
  }
  return h;
}

export function toggleArchived(id) {
  const h = habitById(id);
  if (h) {
    h.archived = !h.archived;
    invalidateCache();
    saveHabits();
  }
  return h;
}
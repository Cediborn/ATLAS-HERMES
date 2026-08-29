// Atlas — Goals page state.
// Uses shared list-state.js for filtering/sorting/memoization.
// This file only defines Goals-specific config and enrichments.

import { formatDate, timeAgo, daysUntil, dateKey, todayKey } from '../date-utils.js';
import { createListState, createFilterFn, createSortFn } from '../list-state.js';
import { PRIORITY_ORDER } from './data.js';

// ---- Page-scoped state ----
const initialState = {
  search: '',
  typeFilter: null, // 'long' | 'short' | null
  categoryFilter: new Set(),
  statusFilter: new Set(),
  showArchived: false,
  sortBy: 'deadline',
  viewMode: 'grid', // 'grid' | 'list' | 'timeline'
};

// ---- Filtering (pure) ----
function matchesGoal(g, f) {
  const q = f.search.trim().toLowerCase();
  if (!f.showArchived && g.archived) return false;
  if (q && !g.title.toLowerCase().includes(q) && !g.description.toLowerCase().includes(q)) return false;
  if (f.typeFilter && g.type !== f.typeFilter) return false;
  if (f.categoryFilter.size && !f.categoryFilter.has(g.category)) return false;
  if (f.statusFilter.size && !f.statusFilter.has(g.status)) return false;
  return true;
}

// ---- Sorting (pure) ----
const comparators = {
  progress: (a, b) => b.progress - a.progress,
  priority: (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  alphabetical: (a, b) => a.title.localeCompare(b.title),
  recentlyCreated: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  recentlyUpdated: (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0),
  deadline: (a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  },
};

const SORT_OPTIONS = [
  { id: 'deadline', label: 'Deadline' },
  { id: 'progress', label: 'Progress' },
  { id: 'priority', label: 'Priority' },
  { id: 'alphabetical', label: 'Alphabetical' },
  { id: 'recentlyCreated', label: 'Recently created' },
  { id: 'recentlyUpdated', label: 'Recently updated' },
];

// ---- Enrichment ----
function computeGoalProgress(goal) {
  const ms = goal.milestones || [];
  if (!ms.length) {
    return typeof goal.progress === 'number' ? goal.progress : 0;
  }
  const done = ms.filter((m) => m.done).length;
  return Math.round((done / ms.length) * 100);
}

function forecastGoal(goal) {
  const progress = computeGoalProgress(goal);
  if (goal.status === 'Completed') {
    return { estCompletion: goal.deadline, confidence: 'High', daysLeft: 0, onSchedule: true };
  }
  const DAY_MS = 86400000;
  const today = new Date(`${todayKey()}T00:00:00`);
  const start = new Date(`${goal.startDate}T00:00:00`);
  const deadline = new Date(`${goal.deadline}T00:00:00`);
  const elapsedDays = Math.max(0, Math.round((today - start) / DAY_MS));
  const remainingDays = Math.max(0, Math.round((deadline - today) / DAY_MS));
  const velocity = elapsedDays > 0 ? progress / elapsedDays : 0;
  const estDays = velocity > 0 ? Math.ceil((100 - progress) / velocity) : remainingDays;
  const est = new Date(today);
  est.setDate(est.getDate() + estDays);
  const buffer = deadline - est;
  const onSchedule = buffer >= 0;
  const confidence = goal.status === 'Blocked' ? 'Low' : buffer >= 14 * DAY_MS ? 'High' : buffer >= 0 ? 'Medium' : 'Low';
  return {
    estCompletion: dateKey(est),
    confidence,
    daysLeft: estDays,
    onSchedule,
  };
}

function enrichGoal(goal) {
  return {
    ...goal,
    progress: computeGoalProgress(goal),
    milestonesDone: (goal.milestones || []).filter((m) => m.done).length,
    milestonesTotal: (goal.milestones || []).length,
    forecast: forecastGoal(goal),
  };
}

// ---- Build cache key ----
function buildKey(f, n) {
  return {
    search: f.search,
    type: f.typeFilter,
    cat: [...f.categoryFilter].sort(),
    status: [...f.statusFilter].sort(),
    arch: f.showArchived,
    sort: f.sortBy,
    n,
  };
}

// ---- Create the shared list state ----
const listState = createListState({
  moduleName: 'goals',
  initialState,
  sortOptions: SORT_OPTIONS,
  filterFn: createFilterFn(matchesGoal),
  sortFn: createSortFn(comparators, 'deadline'),
  enrichFn: enrichGoal,
  buildKey,
  resetKeys: ['search', 'typeFilter', 'categoryFilter', 'statusFilter', 'showArchived'],
});

// ---- Re-export standard API ----
export const {
  getState,
  setState,
  subscribe,
  resetFilters,
  filter: filterGoals,
  sort: sortGoals,
  getVisible: getVisibleGoals,
  invalidateCache: invalidateVisibleGoalsCache,
} = listState;

// ---- Export SORT_OPTIONS for toolbar ----
export { SORT_OPTIONS };

// ---- Re-export date utils and enrichments for view.js ----
export { formatDate, timeAgo, daysUntil, dateKey, todayKey };
export { computeGoalProgress, forecastGoal, enrichGoal };

// ---- Statistics ----
export function computeGoalStats(allGoals) {
  const active = allGoals.filter((g) => g.status !== 'Completed' && g.status !== 'Archived');
  const completed = allGoals.filter((g) => g.status === 'Completed').length;
  const archived = allGoals.filter((g) => g.archived).length;
  const atRisk = allGoals.filter((g) => g.status === 'At Risk' || g.status === 'Blocked');
  const onTrack = allGoals.filter((g) => g.status === 'On Track' || g.status === 'In Progress');
  const avgProgress = active.length ? Math.round(active.reduce((sum, g) => sum + computeGoalProgress(g), 0) / active.length) : 0;
  const upcoming = allGoals
    .filter((g) => {
      if (g.status === 'Completed' || g.status === 'Archived' || !g.deadline) return false;
      const d = daysUntil(g.deadline);
      return d !== null && d >= 0 && d <= 30;
    })
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  const longTerm = allGoals.filter((g) => g.type === 'long').length;
  const shortTerm = allGoals.filter((g) => g.type === 'short').length;
  return { total: allGoals.length, active, completed, archived, atRisk, onTrack, avgProgress, upcoming, longTerm, shortTerm };
}

// ---- Chart data (pure) ----
export function categoryProgress(allGoals) {
  const order = [];
  const map = new Map();
  allGoals.forEach((g) => {
    if (g.archived) return;
    if (!map.has(g.category)) {
      map.set(g.category, { category: g.category, sum: 0, count: 0 });
      order.push(g.category);
    }
    const entry = map.get(g.category);
    entry.sum += computeGoalProgress(g);
    entry.count += 1;
  });
  return order.map((c) => {
    const e = map.get(c);
    return { category: c, count: e.count, progress: Math.round(e.sum / e.count) };
  });
}

export function statusDistribution(allGoals) {
  const order = ['Not Started', 'Planning', 'In Progress', 'On Track', 'At Risk', 'Blocked', 'Completed', 'Archived'];
  const counts = order.map((s) => ({ status: s, count: allGoals.filter((g) => g.status === s).length }));
  const max = Math.max(1, ...counts.map((c) => c.count));
  return counts.map((c) => ({ ...c, pct: Math.round((c.count / max) * 100) }));
}

// ---- Timeline ----
export function buildTimeline(allGoals, { windowStart = 7, windowEnd = 180, limit = 14 } = {}) {
  const today = new Date(`${todayKey()}T00:00:00`);
  const start = new Date(today);
  start.setDate(start.getDate() - windowStart);
  const end = new Date(today);
  end.setDate(end.getDate() + windowEnd);

  const entries = [];
  allGoals.forEach((g) => {
    (g.milestones || []).forEach((m) => {
      const d = new Date(`${m.due}T00:00:00`);
      if (d >= start && d <= end) {
        entries.push({ date: m.due, title: m.title, type: 'milestone', goalId: g.id, goalTitle: g.title, done: m.done, linkedProjectId: m.linkedProjectId });
      }
    });
    if (g.deadline && g.status !== 'Completed' && g.status !== 'Archived') {
      const d = new Date(`${g.deadline}T00:00:00`);
      if (d >= start && d <= end) {
        entries.push({ date: g.deadline, title: g.title, type: 'deadline', goalId: g.id, goalTitle: g.title, done: false });
      }
    }
  });

  return entries
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, limit);
}
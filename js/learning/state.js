// Atlas — Learning page state.
// Uses shared list-state.js for filtering/sorting/memoization.
// This file only defines Learning-specific config and enrichments.

import { formatDate, timeAgo, daysUntil, todayKey } from '../date-utils.js';
import { createListState, createFilterFn, createSortFn } from '../list-state.js';
import { PRIORITY_ORDER } from './data.js';

// ---- Page-scoped state ----
const initialState = {
  search: '',
  typeFilter: null, // 'course' | 'book' | 'article' | null
  subjectFilter: new Set(),
  statusFilter: new Set(),
  favoritesOnly: false,
  showArchived: false,
  sortBy: 'recentlyUpdated',
  viewMode: 'grid', // 'grid' | 'list'
};

// ---- Filtering (pure) ----
function matchesResource(r, f) {
  const q = f.search.trim().toLowerCase();
  if (!f.showArchived && r.archived) return false;
  if (f.favoritesOnly && !r.favorite) return false;
  if (q && !r.title.toLowerCase().includes(q) && !r.author.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q)) return false;
  if (f.typeFilter && r.type !== f.typeFilter) return false;
  if (f.subjectFilter.size && !f.subjectFilter.has(r.subject)) return false;
  if (f.statusFilter.size && !f.statusFilter.has(r.status)) return false;
  return true;
}

// ---- Sorting (pure) ----
const comparators = {
  progress: (a, b) => b.progress - a.progress,
  priority: (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  alphabetical: (a, b) => a.title.localeCompare(b.title),
  recentlyCreated: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  dueDate: (a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  },
  recentlyUpdated: (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0),
};

const SORT_OPTIONS = [
  { id: 'recentlyUpdated', label: 'Recently updated' },
  { id: 'progress', label: 'Progress' },
  { id: 'dueDate', label: 'Due date' },
  { id: 'priority', label: 'Priority' },
  { id: 'alphabetical', label: 'Alphabetical' },
  { id: 'recentlyCreated', label: 'Recently created' },
];

// ---- Progress — derived from completed units, never stored ----
function computeResourceProgress(resource) {
  const units = resource.units || [];
  if (!units.length) {
    return typeof resource.progress === 'number' ? resource.progress : 0;
  }
  const done = units.filter((u) => u.done).length;
  return Math.round((done / units.length) * 100);
}

function minutesRemaining(resource) {
  const total = resource.estimatedMinutes || 0;
  if (!total) return 0;
  return Math.round(total * (1 - computeResourceProgress(resource) / 100));
}

function enrichResource(resource) {
  return {
    ...resource,
    progress: computeResourceProgress(resource),
    unitsDone: (resource.units || []).filter((u) => u.done).length,
    unitsTotal: (resource.units || []).length,
  };
}

// ---- Build cache key ----
function buildKey(f, n) {
  return {
    search: f.search,
    type: f.typeFilter,
    subject: [...f.subjectFilter].sort(),
    status: [...f.statusFilter].sort(),
    fav: f.favoritesOnly,
    arch: f.showArchived,
    sort: f.sortBy,
    n,
  };
}

// ---- Create the shared list state ----
const listState = createListState({
  moduleName: 'learning',
  initialState,
  sortOptions: SORT_OPTIONS,
  filterFn: createFilterFn(matchesResource),
  sortFn: createSortFn(comparators, 'recentlyUpdated'),
  enrichFn: enrichResource,
  buildKey,
  resetKeys: ['search', 'typeFilter', 'subjectFilter', 'statusFilter', 'favoritesOnly', 'showArchived'],
});

// ---- Re-export standard API ----
export const {
  getState,
  setState,
  subscribe,
  resetFilters,
  filter: filterResources,
  sort: sortResources,
  getVisible: getVisibleResources,
  invalidateCache: invalidateVisibleResourcesCache,
} = listState;

export { SORT_OPTIONS };

// ---- Re-export date utils and enrichments for view.js ----
export { formatDate, timeAgo, daysUntil, todayKey };
export { computeResourceProgress, minutesRemaining, enrichResource };

// ---- Statistics ----
export function computeLearningStats(allResources) {
  const active = allResources.filter((r) => r.status !== 'Completed' && r.status !== 'Archived');
  const completed = allResources.filter((r) => r.status === 'Completed').length;
  const archived = allResources.filter((r) => r.archived).length;
  const notStarted = allResources.filter((r) => r.status === 'Not Started').length;
  const inProgress = allResources.filter((r) => r.status === 'In Progress').length;
  const avgProgress = active.length ? Math.round(active.reduce((sum, r) => sum + computeResourceProgress(r), 0) / active.length) : 0;
  const minutesLeft = active.reduce((sum, r) => sum + minutesRemaining(r), 0);
  return {
    total: allResources.length,
    active,
    completed,
    archived,
    notStarted,
    inProgress,
    avgProgress,
    minutesLeft,
  };
}

// ---- Chart data (pure) ----
export function subjectProgress(allResources) {
  const order = [];
  const map = new Map();
  allResources.forEach((r) => {
    if (r.archived) return;
    if (!map.has(r.subject)) {
      map.set(r.subject, { subject: r.subject, sum: 0, count: 0 });
      order.push(r.subject);
    }
    const entry = map.get(r.subject);
    entry.sum += computeResourceProgress(r);
    entry.count += 1;
  });
  return order.map((s) => {
    const e = map.get(s);
    return { subject: s, count: e.count, progress: Math.round(e.sum / e.count) };
  });
}

export function statusDistribution(allResources) {
  const order = ['Not Started', 'In Progress', 'On Hold', 'Completed', 'Archived'];
  const counts = order.map((s) => ({ status: s, count: allResources.filter((r) => r.status === s).length }));
  const max = Math.max(1, ...counts.map((c) => c.count));
  return counts.map((c) => ({ ...c, pct: Math.round((c.count / max) * 100) }));
}

export function typeDistribution(allResources) {
  const order = ['course', 'book', 'article'];
  const counts = order.map((t) => ({ type: t, count: allResources.filter((r) => r.type === t).length }));
  const max = Math.max(1, ...counts.map((c) => c.count));
  return counts.map((c) => ({ ...c, pct: Math.round((c.count / max) * 100) }));
}
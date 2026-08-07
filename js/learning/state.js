// Atlas — Learning page state. Page-scoped (not the global store), same shape
// as projects/goals state: filtering/sorting/progress/stats are pure functions,
// nothing here touches the DOM.

import { formatDate, timeAgo, daysUntil, todayKey } from '../date-utils.js';

const listeners = new Set();

let state = {
  search: '',
  typeFilter: null, // 'course' | 'book' | 'article' | null
  subjectFilter: new Set(),
  statusFilter: new Set(),
  favoritesOnly: false,
  showArchived: false,
  sortBy: 'recentlyUpdated',
  viewMode: 'grid', // 'grid' | 'list'
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
  setState({ search: '', typeFilter: null, subjectFilter: new Set(), statusFilter: new Set(), favoritesOnly: false, showArchived: false });
}

export { formatDate, timeAgo, daysUntil, todayKey };

// ---- Progress — derived from completed units, never stored ----
export function computeResourceProgress(resource) {
  const units = resource.units || [];
  if (!units.length) {
    return typeof resource.progress === 'number' ? resource.progress : 0;
  }
  const done = units.filter((u) => u.done).length;
  return Math.round((done / units.length) * 100);
}

// ---- Estimated reading time left (pure) — rough %-of-total-times-left ----
export function minutesRemaining(resource) {
  const total = resource.estimatedMinutes || 0;
  if (!total) return 0;
  return Math.round(total * (1 - computeResourceProgress(resource) / 100));
}

// ---- Enriched resource: progress + unit counts attached for presentation ----
export function enrichResource(resource) {
  return {
    ...resource,
    progress: computeResourceProgress(resource),
    unitsDone: (resource.units || []).filter((u) => u.done).length,
    unitsTotal: (resource.units || []).length,
  };
}

// ---- Filtering (pure) ----
export function filterResources(list, f) {
  const q = f.search.trim().toLowerCase();
  return list.filter((r) => {
    if (!f.showArchived && r.archived) return false;
    if (f.favoritesOnly && !r.favorite) return false;
    if (q && !r.title.toLowerCase().includes(q) && !r.author.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q)) return false;
    if (f.typeFilter && r.type !== f.typeFilter) return false;
    if (f.subjectFilter.size && !f.subjectFilter.has(r.subject)) return false;
    if (f.statusFilter.size && !f.statusFilter.has(r.status)) return false;
    return true;
  });
}

// ---- Sorting (pure) ----
const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export function sortResources(list, sortBy) {
  const arr = [...list];
  const byDateDesc = (key) => (a, b) => new Date(b[key] || 0) - new Date(a[key] || 0);
  switch (sortBy) {
    case 'progress':
      return arr.sort((a, b) => b.progress - a.progress);
    case 'priority':
      return arr.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    case 'alphabetical':
      return arr.sort((a, b) => a.title.localeCompare(b.title));
    case 'recentlyCreated':
      return arr.sort(byDateDesc('createdAt'));
    case 'dueDate':
      return arr.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
    case 'recentlyUpdated':
    default:
      return arr.sort(byDateDesc('updatedAt'));
  }
}

export const SORT_OPTIONS = [
  { id: 'recentlyUpdated', label: 'Recently updated' },
  { id: 'progress', label: 'Progress' },
  { id: 'dueDate', label: 'Due date' },
  { id: 'priority', label: 'Priority' },
  { id: 'alphabetical', label: 'Alphabetical' },
  { id: 'recentlyCreated', label: 'Recently created' },
];

// ---- Memoized filter+sort+enrich (real memoization, same approach as goals) ----
let lastKey = null;
let lastResult = null;

export function getVisibleResources(allResources, f) {
  const key = JSON.stringify({
    search: f.search,
    type: f.typeFilter,
    subject: [...f.subjectFilter].sort(),
    status: [...f.statusFilter].sort(),
    fav: f.favoritesOnly,
    arch: f.showArchived,
    sort: f.sortBy,
    n: allResources.length,
  });
  if (key === lastKey) return lastResult;
  lastKey = key;
  lastResult = sortResources(filterResources(allResources, f), f.sortBy).map(enrichResource);
  return lastResult;
}

export function invalidateVisibleResourcesCache() {
  lastKey = null;
}

// ---- Statistics — the numbers the stats strip and charts are built from ----
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

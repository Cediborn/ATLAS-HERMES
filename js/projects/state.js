// Atlas — Projects page state. Deliberately page-scoped (not the global
// store in store.js) — "which filter is active" is view state, not app state.
// Filtering/sorting are pure functions taking data in and returning data out;
// nothing in this file touches the DOM (Day 6 "separate presentation from state").

const listeners = new Set();

let state = {
  search: '',
  statusFilter: new Set(),
  priorityFilter: new Set(),
  tagFilter: new Set(),
  favoritesOnly: false,
  showArchived: false,
  sortBy: 'recentlyUpdated',
  viewMode: 'grid', // 'grid' is the only one built this milestone; 'list'/'kanban' are wired but inert
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
  setState({ search: '', statusFilter: new Set(), priorityFilter: new Set(), tagFilter: new Set(), favoritesOnly: false });
}

import { daysUntil, formatDate, timeAgo } from '../date-utils.js';

export { daysUntil, formatDate, timeAgo };

// ---- Filtering (pure) ----
export function filterProjects(list, f) {
  const q = f.search.trim().toLowerCase();
  return list.filter((p) => {
    if (!f.showArchived && p.status === 'Archived') return false;
    if (q && !p.title.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) return false;
    if (f.statusFilter.size && !f.statusFilter.has(p.status)) return false;
    if (f.priorityFilter.size && !f.priorityFilter.has(p.priority)) return false;
    if (f.tagFilter.size && !p.tags.some((t) => f.tagFilter.has(t))) return false;
    if (f.favoritesOnly && !p.favorite) return false;
    return true;
  });
}

// ---- Sorting (pure) ----
const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export function sortProjects(list, sortBy) {
  const arr = [...list];
  const byDateDesc = (key) => (a, b) => new Date(b[key] || 0) - new Date(a[key] || 0);
  switch (sortBy) {
    case 'newest':
    case 'recentlyCreated':
      return arr.sort(byDateDesc('createdAt'));
    case 'oldest':
      return arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    case 'deadline':
      return arr.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      });
    case 'alphabetical':
      return arr.sort((a, b) => a.title.localeCompare(b.title));
    case 'progress':
      return arr.sort((a, b) => b.progress - a.progress);
    case 'priority':
      return arr.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    case 'mostActive':
      return arr.sort(byDateDesc('lastActivity'));
    case 'recentlyUpdated':
    default:
      return arr.sort(byDateDesc('updatedAt'));
  }
}

export const SORT_OPTIONS = [
  { id: 'recentlyUpdated', label: 'Recently updated' },
  { id: 'recentlyCreated', label: 'Recently created' },
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'deadline', label: 'Deadline' },
  { id: 'alphabetical', label: 'Alphabetical' },
  { id: 'progress', label: 'Progress' },
  { id: 'priority', label: 'Priority' },
  { id: 'mostActive', label: 'Most active' },
];

// ---- Memoized filter+sort combination — real memoization, not a claim ----
let lastKey = null;
let lastResult = null;

export function getVisibleProjects(allProjects, f) {
  const key = JSON.stringify({
    search: f.search,
    status: [...f.statusFilter].sort(),
    priority: [...f.priorityFilter].sort(),
    tags: [...f.tagFilter].sort(),
    fav: f.favoritesOnly,
    arch: f.showArchived,
    sort: f.sortBy,
    n: allProjects.length,
  });
  if (key === lastKey) return lastResult;
  lastKey = key;
  lastResult = sortProjects(filterProjects(allProjects, f), f.sortBy);
  return lastResult;
}

// The cache key above can't see mutations to individual project fields
// (favorite/pinned/status toggled from the action menu) — call this right
// after such a mutation so a stale filtered list isn't served back.
export function invalidateVisibleProjectsCache() {
  lastKey = null;
}

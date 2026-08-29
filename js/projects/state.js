// Atlas — Projects page state.
// Uses shared list-state.js for filtering/sorting/memoization.
// This file only defines Projects-specific config and enrichments.

import { daysUntil, formatDate, timeAgo } from '../date-utils.js';
import { createListState, createFilterFn, createSortFn } from '../list-state.js';
import { PRIORITY_ORDER } from './data.js';

// ---- Page-scoped state ----
const initialState = {
  search: '',
  statusFilter: new Set(),
  priorityFilter: new Set(),
  tagFilter: new Set(),
  favoritesOnly: false,
  showArchived: false,
  sortBy: 'recentlyUpdated',
  viewMode: 'grid', // 'grid' is the only one built this milestone; 'list'/'kanban' are wired but inert
};

// ---- Filtering (pure) ----
function matchesProject(p, f) {
  const q = f.search.trim().toLowerCase();
  if (!f.showArchived && p.status === 'Archived') return false;
  if (q && !p.title.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) return false;
  if (f.statusFilter.size && !f.statusFilter.has(p.status)) return false;
  if (f.priorityFilter.size && !f.priorityFilter.has(p.priority)) return false;
  if (f.tagFilter.size && !p.tags.some((t) => f.tagFilter.has(t))) return false;
  if (f.favoritesOnly && !p.favorite) return false;
  return true;
}

// ---- Sorting (pure) ----
const comparators = {
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  deadline: (a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  },
  alphabetical: (a, b) => a.title.localeCompare(b.title),
  progress: (a, b) => b.progress - a.progress,
  priority: (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  mostActive: (a, b) => new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0),
  recentlyUpdated: (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0),
  recentlyCreated: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
};

// ---- Build cache key ----
function buildKey(f, n) {
  return {
    search: f.search,
    status: [...f.statusFilter].sort(),
    priority: [...f.priorityFilter].sort(),
    tags: [...f.tagFilter].sort(),
    fav: f.favoritesOnly,
    arch: f.showArchived,
    sort: f.sortBy,
    n,
  };
}

// ---- Create the shared list state ----
const listState = createListState({
  moduleName: 'projects',
  initialState,
  sortOptions: [
    { id: 'recentlyUpdated', label: 'Recently updated' },
    { id: 'recentlyCreated', label: 'Recently created' },
    { id: 'newest', label: 'Newest' },
    { id: 'oldest', label: 'Oldest' },
    { id: 'deadline', label: 'Deadline' },
    { id: 'alphabetical', label: 'Alphabetical' },
    { id: 'progress', label: 'Progress' },
    { id: 'priority', label: 'Priority' },
    { id: 'mostActive', label: 'Most active' },
  ],
  filterFn: createFilterFn(matchesProject),
  sortFn: createSortFn(comparators, 'recentlyUpdated'),
  buildKey,
  resetKeys: ['search', 'statusFilter', 'priorityFilter', 'tagFilter', 'favoritesOnly', 'showArchived'],
});

// ---- Re-export standard API ----
export const {
  getState,
  setState,
  subscribe,
  resetFilters,
  filter: filterProjects,
  sort: sortProjects,
  getVisible: getVisibleProjects,
  invalidateCache: invalidateVisibleProjectsCache,
  SORT_OPTIONS,
} = listState;

// ---- Re-export date utils for view.js ----
export { daysUntil, formatDate, timeAgo };
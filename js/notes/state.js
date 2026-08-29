// Atlas — Notes page state.
// Uses shared list-state.js for filtering/sorting/memoization.
// This file only defines Notes-specific config and enrichments.

import { formatDate, timeAgo } from '../date-utils.js';
import { createListState, createFilterFn, createSortFn } from '../list-state.js';

// ---- Page-scoped state ----
const initialState = {
  search: '',
  categoryFilter: new Set(),
  tagFilter: new Set(),
  favoritesOnly: false,
  pinnedOnly: false,
  showArchived: false,
  sortBy: 'recentlyUpdated',
  viewMode: 'grid', // 'grid' | 'list' — both fully built this time
};

// ---- Content metrics (pure — used by both the editor footer and, if ever
// needed, a card) ----
export function wordCount(text) {
  const trimmed = (text || '').trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function charCount(text) {
  return (text || '').length;
}

export function readingTime(text) {
  return Math.max(1, Math.round(wordCount(text) / 200));
}

// ---- Filtering (pure) ----
function matchesNote(n, f) {
  const q = f.search.trim().toLowerCase();
  if (!f.showArchived && n.archived) return false;
  if (q && !n.title.toLowerCase().includes(q) && !n.content.toLowerCase().includes(q)) return false;
  if (f.categoryFilter.size && !f.categoryFilter.has(n.category)) return false;
  if (f.tagFilter.size && !n.tags.some((t) => f.tagFilter.has(t))) return false;
  if (f.favoritesOnly && !n.favorite) return false;
  if (f.pinnedOnly && !n.pinned) return false;
  return true;
}

// ---- Sorting (pure) — pinned notes always float to the top as a group,
// then the chosen order applies within each group ----
function getComparator(sortBy) {
  switch (sortBy) {
    case 'recentlyCreated':
      return (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
    case 'oldest':
      return (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
    case 'alphabetical':
      return (a, b) => a.title.localeCompare(b.title);
    case 'category':
      return (a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title);
    case 'recentlyUpdated':
    default:
      return (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt);
  }
}

const SORT_OPTIONS = [
  { id: 'recentlyUpdated', label: 'Recently updated' },
  { id: 'recentlyCreated', label: 'Recently created' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'alphabetical', label: 'Alphabetical' },
  { id: 'category', label: 'Category' },
];

// ---- Build cache key ----
function buildKey(f, n) {
  return {
    search: f.search,
    cat: [...f.categoryFilter].sort(),
    tags: [...f.tagFilter].sort(),
    fav: f.favoritesOnly,
    pin: f.pinnedOnly,
    arch: f.showArchived,
    sort: f.sortBy,
    n,
  };
}

// ---- Create the shared list state ----
const listState = createListState({
  moduleName: 'notes',
  initialState,
  sortOptions: SORT_OPTIONS,
  filterFn: createFilterFn(matchesNote),
  sortFn: (list, sortBy) => {
    const compare = getComparator(sortBy);
    const pinned = list.filter((n) => n.pinned).sort(compare);
    const rest = list.filter((n) => !n.pinned).sort(compare);
    return [...pinned, ...rest];
  },
  buildKey,
  resetKeys: ['search', 'categoryFilter', 'tagFilter', 'favoritesOnly', 'pinnedOnly', 'showArchived'],
});

// ---- Re-export standard API ----
export const {
  getState,
  setState,
  subscribe,
  resetFilters,
  filter: filterNotes,
  sort: sortNotes,
  getVisible: getVisibleNotes,
  invalidateCache: invalidateVisibleNotesCache,
} = listState;

export { SORT_OPTIONS };

// ---- Re-export date utils for view.js ----
export { formatDate, timeAgo };
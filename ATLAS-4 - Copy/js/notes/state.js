// Atlas — Notes page state. Same shape as projects/state.js on purpose
// (filter/sort as pure functions, page-scoped state, a memoized selector) —
// that pattern already works, so Notes reuses it instead of inventing a new one.

import { formatDate, timeAgo } from '../date-utils.js';

export { formatDate, timeAgo };

const listeners = new Set();

let state = {
  search: '',
  categoryFilter: new Set(),
  tagFilter: new Set(),
  favoritesOnly: false,
  pinnedOnly: false,
  showArchived: false,
  sortBy: 'recentlyUpdated',
  viewMode: 'grid', // 'grid' | 'list' — both fully built this time
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
  setState({ search: '', categoryFilter: new Set(), tagFilter: new Set(), favoritesOnly: false, pinnedOnly: false });
}

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
export function filterNotes(list, f) {
  const q = f.search.trim().toLowerCase();
  return list.filter((n) => {
    if (!f.showArchived && n.archived) return false;
    if (q && !n.title.toLowerCase().includes(q) && !n.content.toLowerCase().includes(q)) return false;
    if (f.categoryFilter.size && !f.categoryFilter.has(n.category)) return false;
    if (f.tagFilter.size && !n.tags.some((t) => f.tagFilter.has(t))) return false;
    if (f.favoritesOnly && !n.favorite) return false;
    if (f.pinnedOnly && !n.pinned) return false;
    return true;
  });
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

export function sortNotes(list, sortBy) {
  const compare = getComparator(sortBy);
  const pinned = list.filter((n) => n.pinned).sort(compare);
  const rest = list.filter((n) => !n.pinned).sort(compare);
  return [...pinned, ...rest];
}

export const SORT_OPTIONS = [
  { id: 'recentlyUpdated', label: 'Recently updated' },
  { id: 'recentlyCreated', label: 'Recently created' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'alphabetical', label: 'Alphabetical' },
  { id: 'category', label: 'Category' },
];

// ---- Memoized filter+sort combination, with an explicit invalidation hook
// for when a note's own fields mutate (pin/favorite/archive toggle,
// autosave) — Projects shipped without this at first and it caused a real
// stale-list bug, so it's built in from the start here. ----
let lastKey = null;
let lastResult = null;

export function getVisibleNotes(allNotes, f) {
  const key = JSON.stringify({
    search: f.search,
    cat: [...f.categoryFilter].sort(),
    tags: [...f.tagFilter].sort(),
    fav: f.favoritesOnly,
    pin: f.pinnedOnly,
    arch: f.showArchived,
    sort: f.sortBy,
    n: allNotes.length,
  });
  if (key === lastKey) return lastResult;
  lastKey = key;
  lastResult = sortNotes(filterNotes(allNotes, f), f.sortBy);
  return lastResult;
}

export function invalidateVisibleNotesCache() {
  lastKey = null;
}

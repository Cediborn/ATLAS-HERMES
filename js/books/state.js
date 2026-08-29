// Atlas — Books page state.
// Uses shared list-state.js for filtering/sorting/memoization.
// This file only defines Books-specific config and enrichments.

import { formatDate, timeAgo, daysUntil } from '../date-utils.js';
import { createListState, createFilterFn, createSortFn } from '../list-state.js';

// ---- Page-scoped state ----
const initialState = {
  search: '',
  genreFilter: new Set(),
  statusFilter: new Set(),
  favoritesOnly: false,
  sortBy: 'recentlyStarted',
  viewMode: 'grid', // 'grid' | 'list'
};

// ---- Progress — derived from pages read, never stored ----
function computeBookProgress(book) {
  if (!book.pages) return 0;
  return Math.round((Math.min(book.pagesRead, book.pages) / book.pages) * 100);
}

function pagesRemaining(book) {
  return Math.max(0, book.pages - (book.pagesRead || 0));
}

// ---- Enriched book: progress attached for presentation ----
export function enrichBook(book) {
  return {
    ...book,
    progress: computeBookProgress(book),
    pagesLeft: pagesRemaining(book),
  };
}

// ---- Filtering (pure) ----
function matchesBook(b, f) {
  const q = f.search.trim().toLowerCase();
  if (q && !b.title.toLowerCase().includes(q) && !b.author.toLowerCase().includes(q)) return false;
  if (f.favoritesOnly && !b.favorite) return false;
  if (f.genreFilter.size && !f.genreFilter.has(b.genre)) return false;
  if (f.statusFilter.size && !f.statusFilter.has(b.status)) return false;
  return true;
}

// ---- Sorting (pure) ----
const comparators = {
  title: (a, b) => a.title.localeCompare(b.title),
  author: (a, b) => a.author.localeCompare(b.author),
  progress: (a, b) => b.progress - a.progress,
  pages: (a, b) => b.pages - a.pages,
  rating: (a, b) => (b.rating || 0) - (a.rating || 0),
  recentlyFinished: (a, b) => new Date(b.finishedAt || 0) - new Date(a.finishedAt || 0),
  recentlyStarted: (a, b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0),
};

const SORT_OPTIONS = [
  { id: 'recentlyStarted', label: 'Recently started' },
  { id: 'title', label: 'Title' },
  { id: 'author', label: 'Author' },
  { id: 'progress', label: 'Progress' },
  { id: 'pages', label: 'Page count' },
  { id: 'rating', label: 'Rating' },
  { id: 'recentlyFinished', label: 'Recently finished' },
];

// ---- Build cache key ----
function buildKey(f, n) {
  return {
    search: f.search,
    genre: [...f.genreFilter].sort(),
    status: [...f.statusFilter].sort(),
    fav: f.favoritesOnly,
    sort: f.sortBy,
    n,
  };
}

// ---- Create the shared list state ----
const listState = createListState({
  moduleName: 'books',
  initialState,
  sortOptions: SORT_OPTIONS,
  filterFn: createFilterFn(matchesBook),
  sortFn: createSortFn(comparators, 'recentlyStarted'),
  enrichFn: enrichBook,
  buildKey,
  resetKeys: ['search', 'genreFilter', 'statusFilter', 'favoritesOnly'],
});

// ---- Re-export standard API ----
export const {
  getState,
  setState,
  subscribe,
  resetFilters,
  filter: filterBooks,
  sort: sortBooks,
  getVisible: getVisibleBooks,
  invalidateCache: invalidateVisibleBooksCache,
} = listState;

export { SORT_OPTIONS };

// ---- Re-export date utils and enrichments for view.js ----
export { formatDate, timeAgo, daysUntil };
export { computeBookProgress, pagesRemaining };

// ---- Statistics ----
export function computeBookStats(allBooks) {
  const reading = allBooks.filter((b) => b.status === 'Reading');
  const finished = allBooks.filter((b) => b.status === 'Finished');
  const wantToRead = allBooks.filter((b) => b.status === 'Want to Read');
  const pagesRead = allBooks.reduce((sum, b) => sum + Math.min(b.pagesRead, b.pages || 0), 0);
  const rated = finished.filter((b) => typeof b.rating === 'number');
  const avgRating = rated.length ? Math.round((rated.reduce((sum, b) => sum + b.rating, 0) / rated.length) * 10) / 10 : 0;
  return { total: allBooks.length, reading, finished, wantToRead, pagesRead, avgRating };
}

// ---- Chart data (pure) ----
export function statusDistribution(allBooks) {
  const order = ['Reading', 'Want to Read', 'Finished', 'DNF'];
  const counts = order.map((s) => ({ status: s, count: allBooks.filter((b) => b.status === s).length }));
  const max = Math.max(1, ...counts.map((c) => c.count));
  return counts.map((c) => ({ ...c, pct: Math.round((c.count / max) * 100) }));
}

export function genreDistribution(allBooks) {
  const order = [];
  const map = new Map();
  allBooks.forEach((b) => {
    if (!map.has(b.genre)) {
      map.set(b.genre, { genre: b.genre, count: 0, pagesRead: 0 });
      order.push(b.genre);
    }
    const entry = map.get(b.genre);
    entry.count += 1;
    entry.pagesRead += Math.min(b.pagesRead, b.pages || 0);
  });
  return order.map((g) => ({ genre: g, ...map.get(g) }));
}
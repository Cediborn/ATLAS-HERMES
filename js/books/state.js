// Atlas — Books page state. Page-scoped (not the global store), same shape as
// goals/state.js: progress/filtering/sorting/stats are pure functions, nothing
// here touches the DOM.

import { formatDate, timeAgo, daysUntil } from '../date-utils.js';

const listeners = new Set();

let state = {
  search: '',
  genreFilter: new Set(),
  statusFilter: new Set(),
  favoritesOnly: false,
  sortBy: 'recentlyStarted',
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
  setState({ search: '', genreFilter: new Set(), statusFilter: new Set(), favoritesOnly: false });
}

export { formatDate, timeAgo, daysUntil };

// ---- Progress — derived from pages read, never stored ----
export function computeBookProgress(book) {
  if (!book.pages) return 0;
  return Math.round((Math.min(book.pagesRead, book.pages) / book.pages) * 100);
}

export function pagesRemaining(book) {
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
export function filterBooks(list, f) {
  const q = f.search.trim().toLowerCase();
  return list.filter((b) => {
    if (q && !b.title.toLowerCase().includes(q) && !b.author.toLowerCase().includes(q)) return false;
    if (f.favoritesOnly && !b.favorite) return false;
    if (f.genreFilter.size && !f.genreFilter.has(b.genre)) return false;
    if (f.statusFilter.size && !f.statusFilter.has(b.status)) return false;
    return true;
  });
}

// ---- Sorting (pure) ----
export function sortBooks(list, sortBy) {
  const arr = [...list];
  const byDateDesc = (key) => (a, b) => new Date(b[key] || 0) - new Date(a[key] || 0);
  switch (sortBy) {
    case 'title':
      return arr.sort((a, b) => a.title.localeCompare(b.title));
    case 'author':
      return arr.sort((a, b) => a.author.localeCompare(b.author));
    case 'progress':
      return arr.sort((a, b) => b.progress - a.progress);
    case 'pages':
      return arr.sort((a, b) => b.pages - a.pages);
    case 'rating':
      return arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case 'recentlyFinished':
      return arr.sort(byDateDesc('finishedAt'));
    case 'recentlyStarted':
    default:
      return arr.sort(byDateDesc('startedAt'));
  }
}

export const SORT_OPTIONS = [
  { id: 'recentlyStarted', label: 'Recently started' },
  { id: 'title', label: 'Title' },
  { id: 'author', label: 'Author' },
  { id: 'progress', label: 'Progress' },
  { id: 'pages', label: 'Page count' },
  { id: 'rating', label: 'Rating' },
  { id: 'recentlyFinished', label: 'Recently finished' },
];

// ---- Memoized filter+sort+enrich (real memoization, same approach as goals) ----
let lastKey = null;
let lastResult = null;

export function getVisibleBooks(allBooks, f) {
  const key = JSON.stringify({
    search: f.search,
    genre: [...f.genreFilter].sort(),
    status: [...f.statusFilter].sort(),
    fav: f.favoritesOnly,
    sort: f.sortBy,
    n: allBooks.length,
  });
  if (key === lastKey) return lastResult;
  lastKey = key;
  lastResult = sortBooks(filterBooks(allBooks, f), f.sortBy).map(enrichBook);
  return lastResult;
}

export function invalidateVisibleBooksCache() {
  lastKey = null;
}

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

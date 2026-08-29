// Atlas — Coding derived state.
// Uses shared list-state.js for filtering/sorting/memoization.
// This file only defines Coding-specific config and enrichments.

import { codingItems, practiceSessions, DIFFICULTY_CONFIG, LANGUAGE_CONFIG } from './data.js';
import { createListState, createFilterFn, createSortFn } from '../list-state.js';

// ---- Page-scoped state ----
const initialState = {
  search: '',
  statusFilter: new Set(),
  difficultyFilter: new Set(),
  languageFilter: new Set(),
  favoritesOnly: false,
  sortBy: 'Recently practiced',
  viewMode: 'grid', // 'grid' | 'list'
};

const SORT_OPTIONS = {
  'Recently practiced': { key: 'lastPracticed', dir: 'desc', nulls: 'last' },
  'Most time spent': { key: 'timeSpentMin', dir: 'desc', nulls: 'last' },
  'Title A→Z': { key: 'title', dir: 'asc' },
  'Newest first': { key: 'id', dir: 'desc' },
};

const FILTER_OPTIONS = {
  status: Object.keys({ Backlog: 1, 'In Progress': 1, Solved: 1, 'On Hold': 1 }),
  difficulty: Object.keys(DIFFICULTY_CONFIG),
  language: Object.keys(LANGUAGE_CONFIG),
};

export function computeItemProgress(c) {
  if (c.status === 'Solved') return 100;
  if (c.status === 'Backlog' || c.status === 'On Hold') return 0;
  if (!c.steps || c.steps.length === 0) return 0;
  const done = c.steps.filter((s) => s.done).length;
  return Math.round((done / c.steps.length) * 100);
}

export function enrichItem(c) {
  const progress = computeItemProgress(c);
  return {
    ...c,
    progress,
    stepsTotal: c.steps ? c.steps.length : 0,
    stepsDone: c.steps ? c.steps.filter((s) => s.done).length : 0,
    hours: +(c.timeSpentMin / 60).toFixed(1),
  };
}

// ---- Practice streak ----
export function computePracticeStreak(sessions = practiceSessions) {
  const days = [...new Set(sessions.map((s) => s.date))].sort();
  if (days.length === 0) return 0;
  const today = new Date();
  const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const shift = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return keyOf(x);
  };
  const anchor = keyOf(today);
  const last = days[days.length - 1];
  if (last === shift(today, -1)) return 1;
  if (last !== anchor && last !== shift(today, -1)) return 0;
  let streak = 1;
  let cursor = last;
  for (let i = days.length - 2; i >= 0; i--) {
    if (days[i] === shift(cursor, -1)) {
      streak += 1;
      cursor = days[i];
    } else {
      break;
    }
  }
  return streak;
}

// ---- Filtering (pure) ----
function matchesCoding(c, f) {
  const q = f.search.trim().toLowerCase();
  if (q && !c.title.toLowerCase().includes(q) && !c.source.toLowerCase().includes(q)) return false;
  if (f.statusFilter.size && !f.statusFilter.has(c.status)) return false;
  if (f.difficultyFilter.size && !f.difficultyFilter.has(c.difficulty)) return false;
  if (f.languageFilter.size && !c.languages.some((l) => f.languageFilter.has(l))) return false;
  if (f.favoritesOnly && !c.favorite) return false;
  return true;
}

// ---- Sorting (pure) ----
function sortFn(list, sortKey) {
  const opt = SORT_OPTIONS[sortKey];
  if (!opt) return list;
  return [...list].sort((a, b) => {
    const va = a[opt.key];
    const vb = b[opt.key];
    if (va == null && vb == null) return 0;
    if (va == null) return opt.nulls === 'last' ? 1 : -1;
    if (vb == null) return opt.nulls === 'last' ? -1 : 1;
    const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
    return opt.dir === 'asc' ? cmp : -cmp;
  });
}

// ---- Build cache key ----
function buildKey(f) {
  return {
    filters: {
      status: f.statusFilter.size ? [...f.statusFilter].sort() : null,
      difficulty: f.difficultyFilter.size ? [...f.difficultyFilter].sort() : null,
      language: f.languageFilter.size ? [...f.languageFilter].sort() : null,
      favoritesOnly: f.favoritesOnly || false,
    },
    sortKey: f.sortBy || 'Recently practiced',
    search: f.search || '',
  };
}

// ---- Create the shared list state ----
const listState = createListState({
  moduleName: 'coding',
  initialState,
  sortOptions: Object.entries(SORT_OPTIONS).map(([id]) => ({ id, label: id })),
  filterFn: createFilterFn(matchesCoding),
  sortFn,
  enrichFn: enrichItem,
  buildKey,
  resetKeys: ['search', 'statusFilter', 'difficultyFilter', 'languageFilter', 'favoritesOnly'],
});

// ---- Re-export standard API ----
export const {
  getState,
  setState,
  subscribe,
  resetFilters,
  filter: filterCodingItems,
  sort: sortCodingItems,
  getVisible: getVisibleItems,
  invalidateCache: invalidateVisibleCache,
} = listState;

export { SORT_OPTIONS, FILTER_OPTIONS };

// ---- Stats ----
export function computeCodingStats(items = codingItems) {
  const solved = items.filter((c) => c.status === 'Solved').length;
  const inProgress = items.filter((c) => c.status === 'In Progress').length;
  const backlog = items.filter((c) => c.status === 'Backlog').length;
  const timeSpentMin = items.reduce((sum, c) => sum + (c.timeSpentMin || 0), 0);
  const hours = +(timeSpentMin / 60).toFixed(1);
  return {
    solved,
    inProgress,
    backlog,
    hours,
    total: items.length,
    favorites: items.filter((c) => c.favorite).length,
  };
}

// ---- Distributions (for the chart strips) ----
export function difficultyDistribution(items = codingItems) {
  const total = items.length || 1;
  return Object.keys(DIFFICULTY_CONFIG).map((d) => ({
    label: d,
    count: items.filter((c) => c.difficulty === d).length,
    pct: Math.round((items.filter((c) => c.difficulty === d).length / total) * 100),
    color: DIFFICULTY_CONFIG[d].color,
    icon: DIFFICULTY_CONFIG[d].icon,
  }));
}

export function languageDistribution(items = codingItems) {
  return Object.keys(LANGUAGE_CONFIG)
    .map((lang) => ({
      label: lang,
      count: items.filter((c) => c.languages.includes(lang)).length,
      minutes: items.filter((c) => c.languages.includes(lang)).reduce((s, c) => s + (c.timeSpentMin || 0), 0),
      color: LANGUAGE_CONFIG[lang].color,
    }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);
}
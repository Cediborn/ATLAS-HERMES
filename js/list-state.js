// Atlas — Shared list state utility.
// Eliminates ~1,200 lines of duplicated filter/sort/memoization code across
// Projects, Goals, Learning, Finance, Habits, Notes, Books, Coding, Calendar.
// Each module's state.js now only defines its config (filter keys, sort options,
// enrich function) and calls createListState() to get the standard exports.

import { dateKey, todayDate, todayKey, startOfMonth, endOfMonth } from './date-utils.js';

/**
 * Creates a complete list state machine for a module.
 *
 * @param {Object} config
 * @param {string} config.moduleName - For debugging
 * @param {Object} config.initialState - Default state shape (search, *Filter Sets, sortBy, etc.)
 * @param {Array<Object>} config.sortOptions - [{id, label}, ...]
 * @param {Function} config.filterFn - (list, state) => filteredList
 * @param {Function} config.sortFn - (list, sortBy) => sortedList
 * @param {Function} [config.enrichFn] - (item) => enrichedItem
 * @param {Function} [config.buildKey] - (state, listLength) => cache key object
 * @param {Function} [config.resetKeys] - Keys to reset in resetFilters()
 * @returns {Object} Standard exports: getState, setState, subscribe, resetFilters, filterFn, sortFn, getVisible, invalidateCache, SORT_OPTIONS
 */
export function createListState(config) {
  const {
    moduleName,
    initialState,
    sortOptions,
    filterFn,
    sortFn,
    enrichFn,
    buildKey,
    resetKeys = ['search'],
  } = config;

  const listeners = new Set();
  let state = { ...initialState };

  // ---- Cache ----
  let lastKey = null;
  let lastResult = null;

  // ---- State management ----
  function getState() {
    return state;
  }

  function setState(patch) {
    state = { ...state, ...patch };
    listeners.forEach((fn) => fn(state));
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function resetFilters() {
    const patch = {};
    for (const key of resetKeys) {
      const val = initialState[key];
      // Sets need new instances
      patch[key] = val instanceof Set ? new Set(val) : val;
    }
    setState(patch);
  }

  // ---- Memoized selector ----
  function getVisible(allItems) {
    const f = state;
    const keyObj = buildKey ? buildKey(f, allItems.length) : {
      search: f.search,
      sort: f.sortBy,
      n: allItems.length,
    };
    const key = JSON.stringify(keyObj);
    if (key === lastKey) return lastResult;

    lastKey = key;
    let result = filterFn(allItems, f);
    result = sortFn(result, f.sortBy);
    if (enrichFn) result = result.map(enrichFn);
    lastResult = result;
    return lastResult;
  }

  function invalidateCache() {
    lastKey = null;
    lastResult = null;
  }

  return {
    getState,
    setState,
    subscribe,
    resetFilters,
    filter: filterFn,
    sort: sortFn,
    getVisible,
    invalidateCache,
    SORT_OPTIONS: sortOptions,
  };
}

/**
 * Specialized version for Calendar that fetches occurrences from repository first.
 * The filter function receives (occurrences, state) instead of (allItems, state).
 */
export function createCalendarState(config) {
  const { initialState, sortOptions, filterFn, buildKey, resetKeys } = config;

  const listeners = new Set();
  let state = { ...initialState };

  let lastKey = null;
  let lastResult = null;

  function getState() { return state; }
  function setState(patch) { state = { ...state, ...patch }; listeners.forEach(fn => fn(state)); }
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function resetFilters() {
    const patch = {};
    for (const key of resetKeys) {
      const val = initialState[key];
      patch[key] = val instanceof Set ? new Set(val) : val;
    }
    setState(patch);
  }

  function getVisible(rangeStart, rangeEnd) {
    const f = state;
    const keyObj = buildKey ? buildKey(f, rangeStart, rangeEnd) : {
      start: rangeStart.toISOString(), end: rangeEnd.toISOString(),
      search: f.search, sort: f.sortBy,
    };
    const key = JSON.stringify(keyObj);
    if (key === lastKey) return lastResult;

    lastKey = key;
    const occurrences = getEventsInRange(rangeStart, rangeEnd);
    lastResult = filterFn(occurrences, f);
    return lastResult;
  }

  function invalidateCache() { lastKey = null; lastResult = null; }

  return {
    getState, setState, subscribe, resetFilters,
    filter: filterFn,
    getVisible, invalidateCache,
    SORT_OPTIONS: sortOptions,
  };
}

/**
 * Helper: default buildKey for standard list modules.
 * Automatically includes all Set fields (sorted), plus search, sortBy, and list length.
 * Override in config if you need custom key composition.
 */
export function defaultBuildKey(state, listLength) {
  const key = { search: state.search, sort: state.sortBy, n: listLength };
  for (const [k, v] of Object.entries(state)) {
    if (v instanceof Set && v.size > 0) {
      key[k] = [...v].sort();
    } else if (!(v instanceof Set) && k !== 'search' && k !== 'sortBy' && k !== 'viewMode') {
      key[k] = v;
    }
  }
  return key;
}

/**
 * Helper: default filter function template.
 * Provide a `matches` function that returns true for items to keep.
 */
export function createFilterFn(matches) {
  return (list, state) => list.filter(item => matches(item, state));
}

/**
 * Helper: default sort function template.
 * Provide a `comparators` object mapping sortBy id to comparator functions.
 */
export function createSortFn(comparators, defaultSortBy) {
  return (list, sortBy) => {
    const compare = comparators[sortBy] || comparators[defaultSortBy];
    return [...list].sort(compare);
  };
}
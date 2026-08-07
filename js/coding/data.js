// Atlas — Coding canonical data. Same discipline as books/data.js: raw content
// and config maps live here; everything DERIVED (progress from steps, practice
// streak, stats, filtering/sorting) lives in state.js. The dashboard preview
// reads from here too.

import { dateKey } from '../date-utils.js';

// Practice sessions are dated relative to the real current date (same reasoning
// as finance transactions): the practice streak should stay coherent whenever
// the app is actually opened, not just on the day this file was authored.
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateKey(d);
}

export const CODING_STATUS_CONFIG = {
  Backlog: { color: 'neutral' },
  'In Progress': { color: 'accent' },
  Solved: { color: 'success' },
  'On Hold': { color: 'archived' },
};
export const CODING_STATUSES = Object.keys(CODING_STATUS_CONFIG);

export const DIFFICULTY_CONFIG = {
  Easy: { color: 'success', icon: 'check' },
  Medium: { color: 'warning', icon: 'clock' },
  Hard: { color: 'danger', icon: 'flag' },
};
export const DIFFICULTIES = Object.keys(DIFFICULTY_CONFIG);

export const LANGUAGE_CONFIG = {
  JavaScript: { color: 'amber' },
  TypeScript: { color: 'blue' },
  Python: { color: 'emerald' },
  Rust: { color: 'slate' },
  Go: { color: 'teal' },
  SQL: { color: 'rose' },
};
export const CODING_LANGUAGES = Object.keys(LANGUAGE_CONFIG);

export const SOURCE_CONFIG = {
  LeetCode: { icon: 'target', color: 'amber' },
  HackerRank: { icon: 'code', color: 'emerald' },
  'Advent of Code': { icon: 'sparkle', color: 'violet' },
  Codewars: { icon: 'code', color: 'rose' },
  GitHub: { icon: 'folder', color: 'slate' },
};
export const CODING_SOURCES = Object.keys(SOURCE_CONFIG);

export const TOPIC_CONFIG = {
  algorithms: { label: 'Algorithms', color: 'blue' },
  'data-structures': { label: 'Data structures', color: 'violet' },
  systems: { label: 'Systems', color: 'teal' },
  sql: { label: 'SQL', color: 'rose' },
  web: { label: 'Web', color: 'amber' },
  automation: { label: 'Automation', color: 'emerald' },
};
export const CODING_TOPICS = Object.keys(TOPIC_CONFIG);

// ---- Item shape ----
// { id, title, kind: 'problem'|'build', source, difficulty, languages: [], topics: [],
//   status, timeSpentMin, lastPracticed?, favorite, notes?, steps?: [{ id, title, done }],
//   linkedGoals?: [], linkedProjects?: [], linkedHabits?: [] }
// Progress is DERIVED from step completion in state.js — never stored.

export const codingItems = [
  {
    id: 'c1', title: 'Two Sum', kind: 'problem', source: 'LeetCode', difficulty: 'Easy',
    languages: ['JavaScript', 'Python'], topics: ['algorithms'], status: 'Solved',
    timeSpentMin: 45, lastPracticed: '2026-08-02', favorite: true,
    notes: 'Hash-map pass. The brute-force is worth skipping entirely.',
    steps: [], linkedGoals: [], linkedProjects: [], linkedHabits: ['h5'],
  },
  {
    id: 'c2', title: 'LRU Cache', kind: 'problem', source: 'LeetCode', difficulty: 'Medium',
    languages: ['TypeScript'], topics: ['data-structures'], status: 'In Progress',
    timeSpentMin: 140, lastPracticed: '2026-08-05', favorite: true,
    notes: 'HashMap + doubly-linked list. The eviction bookkeeping is the trap.',
    steps: [
      { id: 'c2s1', title: 'Brute-force with array', done: true },
      { id: 'c2s2', title: 'Hash map + linked list design', done: true },
      { id: 'c2s3', title: 'Implement get/put with eviction', done: false },
      { id: 'c2s4', title: 'Write the test suite', done: false },
    ],
    linkedGoals: ['g1'], linkedProjects: [], linkedHabits: ['h5'],
  },
  {
    id: 'c3', title: 'Valid Parentheses', kind: 'problem', source: 'LeetCode', difficulty: 'Easy',
    languages: ['JavaScript'], topics: ['algorithms'], status: 'Solved',
    timeSpentMin: 30, lastPracticed: '2026-07-28',
    steps: [], linkedGoals: [], linkedProjects: [], linkedHabits: [],
  },
  {
    id: 'c4', title: 'Implement a Redis clone', kind: 'build', source: 'GitHub', difficulty: 'Hard',
    languages: ['Rust'], topics: ['systems'], status: 'In Progress',
    timeSpentMin: 480, lastPracticed: '2026-08-06', favorite: true,
    notes: 'RESP parser, command dispatch, then persistence. The replication pass is still ahead.',
    steps: [
      { id: 'c4s1', title: 'RESP protocol parser', done: true },
      { id: 'c4s2', title: 'Command dispatch table', done: true },
      { id: 'c4s3', title: 'AOF persistence', done: false },
      { id: 'c4s4', title: 'Replica sync', done: false },
    ],
    linkedGoals: ['g1'], linkedProjects: ['p10'], linkedHabits: ['h5'],
  },
  {
    id: 'c5', title: 'Top K Frequent Words', kind: 'problem', source: 'LeetCode', difficulty: 'Medium',
    languages: ['Python'], topics: ['algorithms'], status: 'Backlog',
    timeSpentMin: 0, lastPracticed: null, favorite: false,
    steps: [], linkedGoals: [], linkedProjects: [], linkedHabits: [],
  },
  {
    id: 'c6', title: 'Patient admissions joins', kind: 'problem', source: 'HackerRank', difficulty: 'Easy',
    languages: ['SQL'], topics: ['sql'], status: 'Solved',
    timeSpentMin: 55, lastPracticed: '2026-07-25', favorite: true,
    steps: [], linkedGoals: ['g8'], linkedProjects: [], linkedHabits: [],
  },
  {
    id: 'c7', title: 'Advent of Code — Day 6, 2025', kind: 'problem', source: 'Advent of Code', difficulty: 'Medium',
    languages: ['Python'], topics: ['algorithms', 'automation'], status: 'Solved',
    timeSpentMin: 90, lastPracticed: '2026-08-01',
    steps: [], linkedGoals: [], linkedProjects: [], linkedHabits: [],
  },
  {
    id: 'c8', title: 'Weather CLI', kind: 'build', source: 'GitHub', difficulty: 'Medium',
    languages: ['Go'], topics: ['automation', 'web'], status: 'On Hold',
    timeSpentMin: 210, lastPracticed: '2026-07-18',
    notes: 'API wrapper works; the terminal table renderer stalled it.',
    steps: [
      { id: 'c8s1', title: 'Fetch + parse forecast', done: true },
      { id: 'c8s2', title: 'Render terminal table', done: false },
    ],
    linkedGoals: [], linkedProjects: [], linkedHabits: [],
  },
  {
    id: 'c9', title: 'Maximum Subarray', kind: 'problem', source: 'LeetCode', difficulty: 'Easy',
    languages: ['JavaScript'], topics: ['algorithms'], status: 'Solved',
    timeSpentMin: 25, lastPracticed: '2026-07-22',
    steps: [], linkedGoals: [], linkedProjects: [], linkedHabits: ['h5'],
  },
  {
    id: 'c10', title: 'Rate limiter middleware', kind: 'build', source: 'GitHub', difficulty: 'Medium',
    languages: ['TypeScript'], topics: ['systems', 'web'], status: 'Backlog',
    timeSpentMin: 0, lastPracticed: null, favorite: true,
    steps: [], linkedGoals: ['g1'], linkedProjects: [], linkedHabits: [],
  },
  {
    id: 'c11', title: 'Merge k Sorted Lists', kind: 'problem', source: 'LeetCode', difficulty: 'Hard',
    languages: ['Python'], topics: ['data-structures'], status: 'In Progress',
    timeSpentMin: 95, lastPracticed: '2026-08-04',
    steps: [
      { id: 'c11s1', title: 'Naive merge-all', done: true },
      { id: 'c11s2', title: 'Min-heap approach', done: false },
    ],
    linkedGoals: [], linkedProjects: [], linkedHabits: ['h5'],
  },
  {
    id: 'c12', title: 'Static site deploy script', kind: 'build', source: 'GitHub', difficulty: 'Easy',
    languages: ['JavaScript'], topics: ['automation'], status: 'Solved',
    timeSpentMin: 120, lastPracticed: '2026-07-30', favorite: true,
    notes: 'rsync + hash invalidation. Salvaged from the photo-site launch.',
    steps: [], linkedGoals: [], linkedProjects: ['p9'], linkedHabits: [],
  },
];

export const practiceSessions = [
  { id: 's1', date: daysAgo(0), minutes: 65 },
  { id: 's2', date: daysAgo(1), minutes: 40 },
  { id: 's3', date: daysAgo(2), minutes: 90 },
  { id: 's4', date: daysAgo(4), minutes: 55 },
  { id: 's5', date: daysAgo(5), minutes: 30 },
  { id: 's6', date: daysAgo(6), minutes: 75 },
];

export function codingItemById(id) {
  return codingItems.find((c) => c.id === id) || null;
}

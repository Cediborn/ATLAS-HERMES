// Atlas — Learning canonical data. Same discipline as projects/goals: this file
// holds raw content and config maps; everything DERIVED (progress from units,
// stats, filtering/sorting) lives in state.js. The dashboard preview reads from
// here too.

// ---- Resource types — the Foundation pillar spec: courses, books, articles ----
export const RESOURCE_TYPES = [
  { id: 'course', label: 'Course', icon: 'bookOpen', color: 'blue' },
  { id: 'book', label: 'Book', icon: 'book', color: 'teal' },
  { id: 'article', label: 'Article', icon: 'fileText', color: 'violet' },
];
export const RESOURCE_TYPE_BY_ID = Object.fromEntries(RESOURCE_TYPES.map((t) => [t.id, t]));

export const LEARNING_STATUS_CONFIG = {
  'Not Started': { color: 'neutral' },
  'In Progress': { color: 'accent' },
  'On Hold': { color: 'warning' },
  Completed: { color: 'success' },
  Archived: { color: 'archived' },
};
export const LEARNING_STATUSES = Object.keys(LEARNING_STATUS_CONFIG);

// Same escalate-by-weight system as Projects/Goals priorities.
export const PRIORITY_CONFIG = {
  Low: { color: 'neutral', solid: false },
  Medium: { color: 'warning', solid: false },
  High: { color: 'danger', solid: false },
  Critical: { color: 'danger', solid: true },
};
export const PRIORITIES = Object.keys(PRIORITY_CONFIG);

export const SUBJECT_CONFIG = {
  programming: { label: 'Programming', icon: 'code', color: 'blue' },
  design: { label: 'Design', icon: 'sparkle', color: 'violet' },
  writing: { label: 'Writing', icon: 'fileText', color: 'teal' },
  productivity: { label: 'Productivity', icon: 'lightbulb', color: 'amber' },
  business: { label: 'Business', icon: 'briefcase', color: 'rose' },
  science: { label: 'Science', icon: 'target', color: 'emerald' },
  language: { label: 'Language', icon: 'users', color: 'slate' },
};
export const LEARNING_SUBJECTS = Object.keys(SUBJECT_CONFIG);

export const RESOURCE_COLORS = ['blue', 'violet', 'teal', 'amber', 'rose', 'emerald', 'slate'];

// ---- Unit shape ----
// { id, title, done: boolean }
// Progress is DERIVED from completed units in state.js — never stored
// separately — so ticking a unit off actually moves the resource.

export let resources = [
  {
    id: 'r1', title: 'Deep Work', author: 'Cal Newport',
    description: 'Rules for focused success in a distracted world — deep vs. shallow work, scheduling, and digital minimalism.',
    type: 'book', subject: 'productivity', status: 'In Progress', priority: 'High',
    dueDate: '2026-08-31', estimatedMinutes: 720,
    units: [
      { id: 'r1u1', title: 'The Deep Work Hypothesis', done: true },
      { id: 'r1u2', title: 'Deep Work Is Rare', done: true },
      { id: 'r1u3', title: 'Deep Work Is Meaningful', done: true },
      { id: 'r1u4', title: 'Deep Work Is Real', done: true },
      { id: 'r1u5', title: 'Work Deeply', done: true },
      { id: 'r1u6', title: 'Embrace Boredom', done: false },
      { id: 'r1u7', title: 'Quit Social Media', done: false },
      { id: 'r1u8', title: 'Drain the Shallows', done: false },
      { id: 'r1u9', title: 'Discipline #1–4', done: false },
    ],
    tags: ['focus', 'habits'], favorite: true, archived: false,
    linkedGoalIds: ['g1'], linkedProjectIds: [], linkedHabitIds: ['h2'],
    createdAt: '2026-04-02', updatedAt: '2026-08-04',
  },
  {
    id: 'r2', title: 'PostgreSQL Internals', author: 'Egon Meyer',
    description: 'MVCC, indexing, and the query planner — the internals course to reason about the migration instead of just running it.',
    type: 'course', subject: 'programming', status: 'In Progress', priority: 'Medium',
    dueDate: '2026-08-30', estimatedMinutes: 540,
    units: [
      { id: 'r2u1', title: 'Architecture overview', done: true },
      { id: 'r2u2', title: 'MVCC implementation', done: true },
      { id: 'r2u3', title: 'Index types', done: false },
      { id: 'r2u4', title: 'Query planner labs', done: false },
      { id: 'r2u5', title: 'Replication', done: false },
    ],
    tags: ['database', 'backend'], favorite: false, archived: false,
    linkedGoalIds: ['g8'], linkedProjectIds: ['p10'], linkedHabitIds: ['h5'],
    createdAt: '2026-06-15', updatedAt: '2026-07-26',
  },
  {
    id: 'r3', title: 'Distributed Systems: Design Patterns', author: 'Mira Patel',
    description: 'The patterns that actually show up in production systems — consensus, replication, and failure handling.',
    type: 'course', subject: 'programming', status: 'On Hold', priority: 'Low',
    dueDate: null, estimatedMinutes: 480,
    units: [
      { id: 'r3u1', title: 'Basics & clocks', done: true },
      { id: 'r3u2', title: 'Raft consensus', done: true },
      { id: 'r3u3', title: 'Failure detection', done: false },
      { id: 'r3u4', title: 'Consistent hashing', done: false },
    ],
    tags: ['distributed', 'thesis'], favorite: false, archived: false,
    linkedGoalIds: ['g2'], linkedProjectIds: ['p5'], linkedHabitIds: ['h5'],
    createdAt: '2026-03-01', updatedAt: '2026-07-01',
  },
  {
    id: 'r4', title: 'TypeScript in 50 Lessons', author: 'Stefan Baumgartner',
    description: 'Practical TypeScript for real codebases — from the type system basics to advanced generics.',
    type: 'course', subject: 'programming', status: 'Not Started', priority: 'Medium',
    dueDate: '2026-09-15', estimatedMinutes: 600,
    units: [
      { id: 'r4u1', title: 'The type system', done: false },
      { id: 'r4u2', title: 'Generics', done: false },
      { id: 'r4u3', title: 'Utility types', done: false },
      { id: 'r4u4', title: 'Conditional types', done: false },
    ],
    tags: ['typescript'], favorite: true, archived: false,
    linkedGoalIds: [], linkedProjectIds: [], linkedHabitIds: ['h5'],
    createdAt: '2026-07-20', updatedAt: '2026-07-21',
  },
  {
    id: 'r5', title: 'The Pragmatic Programmer', author: 'Hunt & Thomas',
    description: 'The classic — pragmatic thinking, learning, and the craft of shipping software.',
    type: 'book', subject: 'programming', status: 'Not Started', priority: 'Low',
    dueDate: null, estimatedMinutes: 840,
    units: [
      { id: 'r5u1', title: 'A Pragmatic Philosophy', done: false },
      { id: 'r5u2', title: 'A Pragmatic Approach', done: false },
      { id: 'r5u3', title: 'The Basic Tools', done: false },
      { id: 'r5u4', title: 'Pragmatic Paranoia', done: false },
    ],
    tags: ['craft'], favorite: false, archived: false,
    linkedGoalIds: [], linkedProjectIds: [], linkedHabitIds: ['h2'],
    createdAt: '2026-07-15', updatedAt: '2026-07-15',
  },
  {
    id: 'r6', title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann',
    description: 'The foundations of scalable, reliable systems — storage, replication, partitioning, and consistency.',
    type: 'book', subject: 'science', status: 'In Progress', priority: 'Critical',
    dueDate: '2026-12-15', estimatedMinutes: 1200,
    units: [
      { id: 'r6u1', title: 'Reliable, scalable systems', done: true },
      { id: 'r6u2', title: 'Replication', done: true },
      { id: 'r6u3', title: 'Partitioning', done: false },
      { id: 'r6u4', title: 'Transactions', done: false },
      { id: 'r6u5', title: 'Consistency', done: false },
    ],
    tags: ['systems', 'thesis'], favorite: true, archived: false,
    linkedGoalIds: ['g2'], linkedProjectIds: ['p5'], linkedHabitIds: ['h5'],
    createdAt: '2026-02-10', updatedAt: '2026-08-02',
  },
  {
    id: 'r7', title: 'Atomic Habits', author: 'James Clear',
    description: 'Tiny changes, remarkable results — the four laws of behavior change.',
    type: 'book', subject: 'productivity', status: 'Completed', priority: 'Low',
    dueDate: '2026-06-01', estimatedMinutes: 540,
    units: [
      { id: 'r7u1', title: 'The fundamentals', done: true },
      { id: 'r7u2', title: 'Make it obvious', done: true },
      { id: 'r7u3', title: 'Make it attractive', done: true },
      { id: 'r7u4', title: 'Make it easy', done: true },
      { id: 'r7u5', title: 'Make it satisfying', done: true },
    ],
    tags: ['habits'], favorite: false, archived: false,
    linkedGoalIds: [], linkedProjectIds: [], linkedHabitIds: ['h2'],
    createdAt: '2026-03-20', updatedAt: '2026-06-01',
  },
  {
    id: 'r8', title: 'SQL Window Functions, Explained', author: 'ModernSQL Blog',
    description: 'A practical walkthrough of window functions with real query examples — the mental model, not just syntax.',
    type: 'article', subject: 'programming', status: 'Completed', priority: 'Low',
    dueDate: null, estimatedMinutes: 45,
    units: [
      { id: 'r8u1', title: 'Rows vs. groups', done: true },
      { id: 'r8u2', title: 'PARTITION BY and ORDER BY', done: true },
      { id: 'r8u3', title: 'Framing', done: true },
    ],
    tags: ['sql'], favorite: false, archived: false,
    linkedGoalIds: ['g8'], linkedProjectIds: ['p10'], linkedHabitIds: [],
    createdAt: '2026-05-11', updatedAt: '2026-05-12',
  },
  {
    id: 'r9', title: 'Designing for Calm', author: 'Interaction Design Review',
    description: 'How calm interfaces differ from merely minimal ones — attention, pacing, and the periphery.',
    type: 'article', subject: 'design', status: 'In Progress', priority: 'Medium',
    dueDate: '2026-08-12', estimatedMinutes: 30,
    units: [
      { id: 'r9u1', title: 'The calm computing principles', done: true },
      { id: 'r9u2', title: 'Applying them to Atlas', done: false },
    ],
    tags: ['ux', 'atlas'], favorite: true, archived: false,
    linkedGoalIds: ['g1'], linkedProjectIds: ['p2'], linkedHabitIds: [],
    createdAt: '2026-07-28', updatedAt: '2026-07-29',
  },
  {
    id: 'r10', title: 'Rust by Example', author: 'Rust Community',
    description: 'Learn Rust through annotated examples — ownership, traits, and error handling.',
    type: 'course', subject: 'programming', status: 'Not Started', priority: 'Low',
    dueDate: null, estimatedMinutes: 900,
    units: [
      { id: 'r10u1', title: 'Primitives & flow', done: false },
      { id: 'r10u2', title: 'Ownership & borrowing', done: false },
      { id: 'r10u3', title: 'Structs & enums', done: false },
      { id: 'r10u4', title: 'Traits', done: false },
      { id: 'r10u5', title: 'Error handling', done: false },
    ],
    tags: ['rust'], favorite: false, archived: false,
    linkedGoalIds: [], linkedProjectIds: [], linkedHabitIds: ['h5'],
    createdAt: '2026-08-01', updatedAt: '2026-08-01',
  },
];

export function resourceById(id) {
  return resources.find((r) => r.id === id) || null;
}

// Hydration hook — see projects/data.js for why this replaces in place.
export function setResources(list) {
  resources.splice(0, resources.length, ...list);
}

let resourceIdCounter = 1000;
export function createResourceId() {
  resourceIdCounter += 1;
  return `r${resourceIdCounter}-${Date.now()}`;
}

// Atlas — Goals canonical data. Same discipline as projects/data.js: this
// file holds the raw content and config maps; everything DERIVED (progress
// from milestones, completion forecast, stats, filtering/sorting, timeline)
// lives in state.js. The dashboard preview reads from here too.

// ---- Goal types — the long/short split the spec asks for ----
export const GOAL_TYPES = [
  { id: 'long', label: 'Long-term', description: 'Six months or more', icon: 'flag' },
  { id: 'short', label: 'Short-term', description: 'Weeks to a few months', icon: 'target' },
];

export const GOAL_STATUS_CONFIG = {
  'Not Started': { color: 'neutral' },
  Planning: { color: 'neutral' },
  'In Progress': { color: 'accent' },
  'On Track': { color: 'success' },
  'At Risk': { color: 'warning' },
  Blocked: { color: 'danger' },
  Completed: { color: 'success' },
  Archived: { color: 'archived' },
};
export const GOAL_STATUSES = Object.keys(GOAL_STATUS_CONFIG);

// Same escalate-by-weight system as Projects' priorities.
export const PRIORITY_CONFIG = {
  Low: { color: 'neutral', solid: false },
  Medium: { color: 'warning', solid: false },
  High: { color: 'danger', solid: false },
  Critical: { color: 'danger', solid: true },
};
export const PRIORITIES = Object.keys(PRIORITY_CONFIG);

export const CATEGORY_CONFIG = {
  career: { label: 'Career', icon: 'briefcase', color: 'blue' },
  learning: { label: 'Learning', icon: 'bookOpen', color: 'teal' },
  fitness: { label: 'Fitness', icon: 'flame', color: 'emerald' },
  health: { label: 'Health', icon: 'heart', color: 'rose' },
  finance: { label: 'Finance', icon: 'wallet', color: 'amber' },
  creative: { label: 'Creative', icon: 'sparkle', color: 'violet' },
  personal: { label: 'Personal', icon: 'star', color: 'slate' },
  home: { label: 'Home', icon: 'checklist', color: 'amber' },
};
export const GOAL_CATEGORIES = Object.keys(CATEGORY_CONFIG);

export const GOAL_COLORS = ['blue', 'violet', 'teal', 'amber', 'rose', 'emerald', 'slate'];

// ---- Milestone shape ----
// { id, title, due: 'YYYY-MM-DD', done: boolean, linkedProjectId?: string }
// Progress is DERIVED from milestone completion in state.js — never stored
// separately — so ticking a milestone off actually moves the goal.

export let goals = [
  {
    id: 'g1', title: 'Ship Atlas v1.0',
    description: 'The full Atlas system — every module wired together and polished — shipping as a single calm, keyboard-first app.',
    type: 'long', category: 'career', status: 'In Progress', priority: 'Critical',
    startDate: '2026-01-01', deadline: '2026-12-31',
    milestones: [
      { id: 'g1m1', title: 'Goals module shipped', due: '2026-08-21', done: false, linkedProjectId: 'p2' },
      { id: 'g1m2', title: 'Dashboard rebuild live', due: '2026-07-20', done: true, linkedProjectId: 'p1' },
      { id: 'g1m3', title: 'Calendar module live', due: '2026-08-15', done: true },
      { id: 'g1m4', title: 'Beta to 10 users', due: '2026-10-15', done: false },
      { id: 'g1m5', title: 'v1.0 release', due: '2026-12-31', done: false },
    ],
    linkedProjects: ['p1', 'p2'],
    linkedHabits: ['h5', 'h9'],
    favorite: true, archived: false,
    createdAt: '2026-01-01', updatedAt: '2026-08-05',
  },
  {
    id: 'g2', title: 'Finish thesis chapter',
    description: 'Consensus protocol chapter with the benchmark suite backing it up — the last real writing block before submission.',
    type: 'short', category: 'learning', status: 'At Risk', priority: 'Critical',
    startDate: '2026-03-01', deadline: '2026-08-15',
    milestones: [
      { id: 'g2m1', title: 'Benchmark suite passing', due: '2026-07-01', done: true, linkedProjectId: 'p5' },
      { id: 'g2m2', title: 'Chapter draft complete', due: '2026-07-25', done: false, linkedProjectId: 'p5' },
      { id: 'g2m3', title: 'Supervisor review', due: '2026-08-05', done: false },
      { id: 'g2m4', title: 'Final revision', due: '2026-08-15', done: false },
    ],
    linkedProjects: ['p5'],
    linkedHabits: ['h5'],
    favorite: true, archived: false,
    createdAt: '2026-03-01', updatedAt: '2026-08-04',
  },
  {
    id: 'g3', title: 'Run a half marathon',
    description: '21.1 km in under two hours — 16-week block building to race day.',
    type: 'long', category: 'fitness', status: 'On Track', priority: 'Medium',
    startDate: '2026-05-01', deadline: '2026-10-12',
    milestones: [
      { id: 'g3m1', title: '10K at training pace', due: '2026-06-28', done: true },
      { id: 'g3m2', title: '15K long run', due: '2026-08-09', done: false },
      { id: 'g3m3', title: '18K long run', due: '2026-09-06', done: false },
      { id: 'g3m4', title: 'Race day', due: '2026-10-12', done: false },
    ],
    linkedProjects: ['p11'],
    linkedHabits: ['h1', 'h8'],
    favorite: false, archived: false,
    createdAt: '2026-05-01', updatedAt: '2026-08-03',
  },
  {
    id: 'g4', title: 'Read 24 books this year',
    description: 'Two books a month, mostly non-fiction — a mix of deep work and something fun.',
    type: 'long', category: 'learning', status: 'In Progress', priority: 'Low',
    startDate: '2026-01-01', deadline: '2026-12-31',
    milestones: [
      { id: 'g4m1', title: 'Book 6 done', due: '2026-04-30', done: true },
      { id: 'g4m2', title: 'Book 12 done', due: '2026-07-31', done: true },
      { id: 'g4m3', title: 'Book 18 done', due: '2026-10-31', done: false },
      { id: 'g4m4', title: 'Book 24 done', due: '2026-12-31', done: false },
    ],
    linkedProjects: [],
    linkedHabits: ['h2'],
    favorite: false, archived: false,
    createdAt: '2026-01-01', updatedAt: '2026-08-01',
  },
  {
    id: 'g5', title: 'Build a 3-month emergency fund',
    description: 'Six thousand in a high-yield account, untouched except for real emergencies.',
    type: 'long', category: 'finance', status: 'In Progress', priority: 'High',
    startDate: '2026-02-01', deadline: '2026-11-30',
    milestones: [
      { id: 'g5m1', title: 'First month saved', due: '2026-05-01', done: true },
      { id: 'g5m2', title: 'Halfway there', due: '2026-08-01', done: false },
      { id: 'g5m3', title: 'Full fund', due: '2026-11-30', done: false },
    ],
    linkedProjects: [],
    linkedHabits: ['h11'],
    favorite: true, archived: false,
    createdAt: '2026-02-01', updatedAt: '2026-08-02',
  },
  {
    id: 'g6', title: 'Launch the Q3 marketing site',
    description: 'New landing pages for the Q3 push with the updated brand system across every page.',
    type: 'short', category: 'career', status: 'Completed', priority: 'High',
    startDate: '2026-05-10', deadline: '2026-07-28',
    milestones: [
      { id: 'g6m1', title: 'Design system applied', due: '2026-06-15', done: true },
      { id: 'g6m2', title: 'Copy reviewed', due: '2026-07-10', done: true },
      { id: 'g6m3', title: 'Launch', due: '2026-07-28', done: true },
    ],
    linkedProjects: ['p3'],
    linkedHabits: [],
    favorite: false, archived: false,
    createdAt: '2026-05-10', updatedAt: '2026-07-28',
  },
  {
    id: 'g7', title: 'Renovate the kitchen',
    description: 'Kitchen and living room — permits, contractor quotes, and a real timeline instead of guesswork.',
    type: 'long', category: 'home', status: 'Planning', priority: 'Medium',
    startDate: '2026-07-10', deadline: '2026-11-15',
    milestones: [
      { id: 'g7m1', title: 'Permits filed', due: '2026-08-10', done: false, linkedProjectId: 'p6' },
      { id: 'g7m2', title: 'Contractor chosen', due: '2026-09-01', done: false, linkedProjectId: 'p6' },
      { id: 'g7m3', title: 'Demolition done', due: '2026-10-05', done: false },
      { id: 'g7m4', title: 'Final walkthrough', due: '2026-11-15', done: false },
    ],
    linkedProjects: ['p6'],
    linkedHabits: [],
    favorite: false, archived: false,
    createdAt: '2026-07-10', updatedAt: '2026-07-18',
  },
  {
    id: 'g8', title: 'Learn Postgres internals',
    description: 'MVCC, indexing, and query planning — enough to reason about the migration instead of just running it.',
    type: 'short', category: 'learning', status: 'Blocked', priority: 'Medium',
    startDate: '2026-06-15', deadline: '2026-08-30',
    milestones: [
      { id: 'g8m1', title: 'MVCC chapter', due: '2026-07-15', done: true },
      { id: 'g8m2', title: 'Indexing notes', due: '2026-08-05', done: false },
      { id: 'g8m3', title: 'Query planner lab', due: '2026-08-30', done: false, linkedProjectId: 'p10' },
    ],
    linkedProjects: ['p10'],
    linkedHabits: ['h5'],
    favorite: false, archived: false,
    createdAt: '2026-06-15', updatedAt: '2026-07-26',
  },
  {
    id: 'g9', title: 'Family reunion weekend',
    description: 'Venue, catering, and the group flight booking spreadsheet everyone actually used.',
    type: 'short', category: 'personal', status: 'Completed', priority: 'Low',
    startDate: '2026-05-20', deadline: '2026-07-10',
    milestones: [
      { id: 'g9m1', title: 'Venue booked', due: '2026-06-01', done: true },
      { id: 'g9m2', title: 'Catering confirmed', due: '2026-06-20', done: true },
      { id: 'g9m3', title: 'Reunion weekend', due: '2026-07-10', done: true, linkedProjectId: 'p14' },
    ],
    linkedProjects: ['p14'],
    linkedHabits: [],
    favorite: true, archived: false,
    createdAt: '2026-05-20', updatedAt: '2026-07-10',
  },
  {
    id: 'g10', title: 'Publish the photography portfolio',
    description: 'Curating three years of film scans into something worth showing — one coherent gallery.',
    type: 'long', category: 'creative', status: 'Not Started', priority: 'Low',
    startDate: '2026-07-20', deadline: '2026-09-30',
    milestones: [
      { id: 'g10m1', title: 'Cull to 60 scans', due: '2026-08-15', done: false },
      { id: 'g10m2', title: 'Site built', due: '2026-09-10', done: false, linkedProjectId: 'p9' },
      { id: 'g10m3', title: 'Live', due: '2026-09-30', done: false, linkedProjectId: 'p9' },
    ],
    linkedProjects: ['p9'],
    linkedHabits: [],
    favorite: false, archived: false,
    createdAt: '2026-07-20', updatedAt: '2026-07-21',
  },
];

export function goalById(id) {
  return goals.find((g) => g.id === id) || null;
}

// Hydration hook — see projects/data.js for why this replaces in place.
export function setGoals(list) {
  goals.splice(0, goals.length, ...list);
}

let goalIdCounter = 1000;
export function createGoalId() {
  goalIdCounter += 1;
  return `g${goalIdCounter}-${Date.now()}`;
}

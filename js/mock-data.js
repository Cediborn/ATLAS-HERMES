// Atlas — Mock data.
// Static stand-ins for what will eventually come from Postgres via tRPC (Foundation §3, §4).
// Every UI module reads from here rather than hardcoding content inline.

export const currentUser = {
  name: 'Alex Morgan',
  email: 'alex@atlas.dev',
  initials: 'AM',
};

export const workspaces = [
  { id: 'personal', name: 'Personal', badge: 'P' },
  { id: 'university', name: 'University', badge: 'U' },
  { id: 'startup', name: 'Startup', badge: 'S' },
];

// Single source of truth for sidebar + router + empty states.
// `phase` maps to the Foundation §10 roadmap where the pillar already has a
// planned phase; omit it for nav items added after that table was written.
export const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'projects', label: 'Projects', icon: 'folder', phase: 2 },
  { id: 'calendar', label: 'Calendar', icon: 'calendar', phase: 3 },
  { id: 'notes', label: 'Notes', icon: 'fileText', phase: 2 },
  { id: 'habits', label: 'Habits', icon: 'flame', phase: 3 },
  { id: 'goals', label: 'Goals', icon: 'target' },
  { id: 'learning', label: 'Learning', icon: 'bookOpen', phase: 4 },
  { id: 'finance', label: 'Finance', icon: 'wallet', phase: 4 },
  { id: 'books', label: 'Books', icon: 'book' },
  { id: 'coding', label: 'Coding', icon: 'code' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export const notifications = [
  { id: 1, text: 'Sarah commented on "Atlas Roadmap"', time: '12m ago', unread: true },
  { id: 2, text: 'Habit reminder: Evening reading', time: '1h ago', unread: true },
  { id: 3, text: 'Your weekly review is ready', time: 'Yesterday', unread: false },
];

export const quickActions = [
  { id: 'task', icon: 'check', label: '+ New Task' },
  { id: 'note', icon: 'fileText', label: '+ New Note' },
  { id: 'project', icon: 'folder', label: '+ New Project' },
  { id: 'event', icon: 'calendar', label: '+ New Event' },
];

export const dashboardData = {
  // `trend` and `accent` are both deliberately omitted on one card each below —
  // that's the "optional" props in StatCard actually being exercised, not an oversight.
  // The 'streak' card's value/trend below are placeholders — views.js overwrites
  // both with live numbers from js/habits/state.js before rendering.
  stats: [
    { id: 'tasks', title: 'Tasks Today', value: '4', icon: 'check', trend: '2 completed', accent: 'accent' },
    { id: 'streak', title: 'Habit Streak', value: '\u2014', icon: 'flame', trend: '', accent: 'warning' },
    { id: 'events', title: 'Events Today', value: '2', icon: 'calendar', accent: 'success' },
    { id: 'notes', title: 'Notes This Week', value: '5', icon: 'fileText' },
  ],
  tasks: [
    { id: 1, title: 'Finish sidebar collapse animation', category: 'Atlas', priority: 'high', dueTime: '11:00 AM', done: false },
    { id: 2, title: 'Review Q3 budget', category: 'Finance', priority: 'medium', done: false },
    { id: 3, title: 'Read ch. 4 of Deep Work', category: 'Learning', done: true },
    { id: 4, title: 'Reply to design feedback thread', category: 'Atlas', priority: 'low', dueTime: '5:00 PM', done: false },
  ],
  // habits[] retired — the real Habits module (js/habits/data.js) is the
  // canonical source now; the dashboard preview reads live from it.
};

// Landing-page hero demo: cycles through example quick-capture inputs and
// their parsed result, showing the "ambient AI" pillar rather than describing it.
export const heroDemos = [
  {
    typed: 'call sarah tomorrow 3pm',
    icon: 'calendar',
    resultTitle: 'Call Sarah',
    time: 'Tomorrow · 3:00 PM',
    tag: 'Personal',
  },
  {
    typed: 'read 20 pages of atomic habits',
    icon: 'bookOpen',
    resultTitle: 'Read 20 pages — Atomic Habits',
    time: 'Today',
    tag: 'Learning',
  },
  {
    typed: 'team sync notes',
    icon: 'fileText',
    resultTitle: 'Team sync notes',
    time: 'New note',
    tag: 'Projects',
  },
];

export const pillars = [
  { id: 'projects', icon: 'folder', title: 'Projects', desc: 'Hierarchical projects and tasks that link straight to the notes and events behind them.' },
  { id: 'notes', icon: 'fileText', title: 'Notes', desc: 'Freeform, block-based notes you can attach to any task, event, or project.' },
  { id: 'calendar', icon: 'calendar', title: 'Calendar', desc: 'Schedule a task and it becomes an event — the two stay in sync automatically.' },
  { id: 'habits', icon: 'flame', title: 'Habits', desc: 'Simple daily and weekly streaks, without a gamified layer getting in the way.' },
  { id: 'learning', icon: 'bookOpen', title: 'Learning', desc: 'Courses, books, and articles with progress that carries across sessions.' },
  { id: 'finance', icon: 'wallet', title: 'Finance', desc: 'Manual accounts and transactions today, imports later — always yours to export.' },
  { id: 'ai', icon: 'sparkle', title: 'AI', desc: 'Ambient, not a chatbot bolted on: capture parsing, summaries, and suggestions inline.' },
  { id: 'analytics', icon: 'layers', title: 'Analytics', desc: 'Every action writes to one activity log, so insight compounds instead of resetting.' },
];

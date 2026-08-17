// Atlas — Landing-page marketing content.
//
// This file used to be the app's data source; since the persistence layer
// (js/persistence.js + IndexedDB) landed, the application reads all real data
// from the data layer. What remains here is intentionally illustrative
// marketing copy for the public landing page only — the hero typewriter demo
// and the capability cards. The app itself never imports this file.

// Landing-page hero demo: cycles through example command-palette searches and
// their real-looking result, showing that one search spans every module.
export const heroDemos = [
  {
    typed: 'build atlas',
    icon: 'folder',
    resultTitle: 'Build Atlas',
    time: 'In Progress · 60%',
    tag: 'Projects',
  },
  {
    typed: 'atomic habits',
    icon: 'book',
    resultTitle: 'Atomic Habits — 42% read',
    time: 'Currently reading',
    tag: 'Books',
  },
  {
    typed: 'team sync',
    icon: 'fileText',
    resultTitle: 'Team sync notes',
    time: 'Edited 2h ago',
    tag: 'Notes',
  },
  {
    typed: 'pay rent',
    icon: 'wallet',
    resultTitle: 'Rent — −₵2,400',
    time: 'Aug 1 · Housing',
    tag: 'Finance',
  },
];

// The real Atlas capability set: nine data modules, workspaces, global
// search, and LUNA — twelve cards, all backed by live persisted data.
export const pillars = [
  { id: 'projects', icon: 'folder', title: 'Projects', desc: 'Tasks, priorities, deadlines, and progress — full CRUD, persisted to IndexedDB.' },
  { id: 'calendar', icon: 'calendar', title: 'Calendar', desc: 'Events with recurrence, drag-to-reschedule, and habit reminders folded in.' },
  { id: 'notes', icon: 'fileText', title: 'Notes', desc: 'A real markdown editor with tags, pinning, word counts, and instant search.' },
  { id: 'habits', icon: 'flame', title: 'Habits', desc: 'Daily completion, streak math, and heatmaps computed from your actual history.' },
  { id: 'goals', icon: 'target', title: 'Goals', desc: 'Milestones drive progress — complete one and the bar moves.' },
  { id: 'learning', icon: 'bookOpen', title: 'Learning', desc: 'Resources and units with progress that carries across every session.' },
  { id: 'finance', icon: 'wallet', title: 'Finance', desc: 'Income, expenses, categories, and balances — never a hard-coded total.' },
  { id: 'books', icon: 'book', title: 'Books', desc: 'Reading progress, ratings, and start/finish dates for your shelf.' },
  { id: 'coding', icon: 'code', title: 'Coding', desc: 'Problems and builds with steps, sessions, and time-by-language stats.' },
  { id: 'workspaces', icon: 'layers', title: 'Workspaces', desc: 'Personal, University, and Startup — real data scopes, not a renamed label.' },
  { id: 'search', icon: 'search', title: 'Command palette', desc: 'One ⌘K search across every module — find it, jump to it, act on it.' },
  { id: 'luna', icon: 'sparkle', title: 'LUNA', desc: 'A local AI assistant that reads your live data — no server, no tracking.' },
];

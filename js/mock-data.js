// Atlas — Landing-page marketing content.
//
// This file used to be the app's data source; since the persistence layer
// (js/persistence.js + IndexedDB) landed, the application reads all real data
// from the data layer. What remains here is intentionally illustrative
// marketing copy for the public landing page only — the hero typewriter demo
// and the eight pillars. The app itself never imports this file.

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

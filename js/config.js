// Atlas — Static app configuration.
// Navigation, workspaces, and quick-action definitions are product config,
// not user data — they never change at runtime, so they live here rather than
// in the persisted data layer (and no longer in mock-data.js, which is now
// landing-page marketing content only).

export const workspaces = [
  { id: 'personal', name: 'Personal', badge: 'P' },
  { id: 'university', name: 'University', badge: 'U' },
  { id: 'startup', name: 'Startup', badge: 'S' },
];

// Single source of truth for sidebar + router + empty states.
// Books and Coding have been absorbed into Learning and Projects respectively.
// Sidebar items are grouped into conceptual sections: PLAN / LEARN / CAPTURE / LIFE.
export const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  // PLAN
  { id: 'calendar', label: 'Calendar', icon: 'calendar', group: 'Plan' },
  { id: 'projects', label: 'Projects', icon: 'folder', group: 'Plan' },
  { id: 'goals', label: 'Goals', icon: 'target', group: 'Plan' },
  // LEARN
  { id: 'learning', label: 'Learning', icon: 'bookOpen', group: 'Learn' },
  // CAPTURE
  { id: 'notes', label: 'Notes', icon: 'fileText', group: 'Capture' },
  // LIFE
  { id: 'habits', label: 'Habits', icon: 'flame', group: 'Life' },
  { id: 'finance', label: 'Finance', icon: 'wallet', group: 'Life' },
  // UTILITIES
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export const quickActions = [
  { id: 'task', icon: 'check', label: '+ New Task' },
  { id: 'note', icon: 'fileText', label: '+ New Note' },
  { id: 'project', icon: 'folder', label: '+ New Project' },
  { id: 'event', icon: 'calendar', label: '+ New Event' },
];

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
export const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'projects', label: 'Projects', icon: 'folder' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'notes', label: 'Notes', icon: 'fileText' },
  { id: 'habits', label: 'Habits', icon: 'flame' },
  { id: 'goals', label: 'Goals', icon: 'target' },
  { id: 'learning', label: 'Learning', icon: 'bookOpen' },
  { id: 'finance', label: 'Finance', icon: 'wallet' },
  { id: 'books', label: 'Books', icon: 'book' },
  { id: 'coding', label: 'Coding', icon: 'code' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export const quickActions = [
  { id: 'task', icon: 'check', label: '+ New Task' },
  { id: 'note', icon: 'fileText', label: '+ New Note' },
  { id: 'project', icon: 'folder', label: '+ New Project' },
  { id: 'event', icon: 'calendar', label: '+ New Event' },
];

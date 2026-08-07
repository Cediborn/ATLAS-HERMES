// Atlas — Projects canonical data. This is the ONE place project data lives;
// the dashboard's "Recent Projects" section reads from here too (it used to
// keep its own separate copy — that's been retired to avoid two competing
// datasets drifting apart).

export const people = {
  am: { id: 'am', name: 'Alex Morgan', initials: 'AM' },
  sc: { id: 'sc', name: 'Sarah Chen', initials: 'SC' },
  jl: { id: 'jl', name: 'Jordan Lee', initials: 'JL' },
  pp: { id: 'pp', name: 'Priya Patel', initials: 'PP' },
  mw: { id: 'mw', name: 'Marcus Webb', initials: 'MW' },
  no: { id: 'no', name: 'Nina Ortiz', initials: 'NO' },
};

export function person(id) {
  return people[id] || { id, name: id, initials: '?' };
}

// Status color reuses the app's existing semantic tokens wherever the
// meaning already fits; only Planning and Archived needed a genuinely new hue.
export const STATUS_CONFIG = {
  'Not Started': { color: 'neutral' },
  Planning: { color: 'planning' },
  'In Progress': { color: 'accent' },
  Blocked: { color: 'danger' },
  Review: { color: 'warning' },
  Completed: { color: 'success' },
  Archived: { color: 'archived' },
};
export const STATUSES = Object.keys(STATUS_CONFIG);

// Critical reuses High's hue but rendered solid instead of tinted — urgency
// escalates by weight, not by adding a fifth color.
export const PRIORITY_CONFIG = {
  Low: { color: 'neutral', solid: false },
  Medium: { color: 'warning', solid: false },
  High: { color: 'danger', solid: false },
  Critical: { color: 'danger', solid: true },
};
export const PRIORITIES = Object.keys(PRIORITY_CONFIG);

export const PROJECT_COLORS = ['blue', 'violet', 'teal', 'amber', 'rose', 'emerald', 'slate'];

export const projects = [
  {
    id: 'p1', title: 'Atlas Dashboard Rebuild',
    description: 'Rebuild the dashboard on a reusable component system — StatCard, SectionCard, and every list item type.',
    icon: 'grid', status: 'Completed', priority: 'High', deadline: '2026-07-20', estimatedCompletion: null, progress: 100,
    owner: 'am', members: ['am', 'sc'], color: 'blue',
    createdAt: '2026-06-28', updatedAt: '2026-07-20', lastActivity: '2026-07-20',
    tags: ['Atlas', 'Design'], taskCount: 18, completedTaskCount: 18, attachmentsCount: 3, notesCount: 5,
    favorite: true, pinned: true, cover: false,
  },
  {
    id: 'p2', title: 'Atlas Projects Module',
    description: 'Kanban, grid, and list views over one shared component set — status, priority, and progress all reusable.',
    icon: 'folder', status: 'In Progress', priority: 'High', deadline: '2026-08-05', estimatedCompletion: '2026-08-03', progress: 55,
    owner: 'am', members: ['am', 'sc', 'jl'], color: 'violet',
    createdAt: '2026-07-24', updatedAt: '2026-07-25', lastActivity: '2026-07-25',
    tags: ['Atlas', 'Engineering'], taskCount: 24, completedTaskCount: 13, attachmentsCount: 2, notesCount: 4,
    favorite: true, pinned: true, cover: true,
  },
  {
    id: 'p3', title: 'Q3 Marketing Site',
    description: 'New landing pages for the Q3 push, with the updated brand system across every page.',
    icon: 'sparkle', status: 'Review', priority: 'Medium', deadline: '2026-07-28', estimatedCompletion: '2026-07-27', progress: 90,
    owner: 'sc', members: ['sc', 'mw'], color: 'teal',
    createdAt: '2026-05-10', updatedAt: '2026-07-23', lastActivity: '2026-07-23',
    tags: ['Marketing', 'Web'], taskCount: 32, completedTaskCount: 29, attachmentsCount: 8, notesCount: 6,
    favorite: false, pinned: false, cover: true,
  },
  {
    id: 'p4', title: 'Personal Website Refresh',
    description: 'Long overdue redesign of the personal site — new writing section, cleaner nav.',
    icon: 'monitor', status: 'Not Started', priority: 'Low', deadline: null, estimatedCompletion: null, progress: 0,
    owner: 'am', members: ['am'], color: 'slate',
    createdAt: '2026-07-15', updatedAt: '2026-07-15', lastActivity: '2026-07-15',
    tags: ['Personal', 'Design'], taskCount: 6, completedTaskCount: 0, attachmentsCount: 0, notesCount: 1,
    favorite: false, pinned: false, cover: false,
  },
  {
    id: 'p5', title: 'Thesis: Distributed Systems',
    description: 'Consensus protocol chapter and the benchmark suite backing it up.',
    icon: 'book', status: 'In Progress', priority: 'Critical', deadline: '2026-08-01', estimatedCompletion: '2026-08-04', progress: 35,
    owner: 'am', members: ['am', 'pp'], color: 'rose',
    createdAt: '2026-03-01', updatedAt: '2026-07-24', lastActivity: '2026-07-24',
    tags: ['University', 'Research'], taskCount: 40, completedTaskCount: 14, attachmentsCount: 12, notesCount: 22,
    favorite: true, pinned: false, cover: false,
  },
  {
    id: 'p6', title: 'Home Renovation',
    description: 'Kitchen and living room — permits, contractor quotes, and a real timeline.',
    icon: 'checklist', status: 'Planning', priority: 'Medium', deadline: '2026-09-15', estimatedCompletion: null, progress: 10,
    owner: 'am', members: ['am'], color: 'amber',
    createdAt: '2026-07-10', updatedAt: '2026-07-18', lastActivity: '2026-07-18',
    tags: ['Personal', 'Home'], taskCount: 15, completedTaskCount: 1, attachmentsCount: 4, notesCount: 3,
    favorite: false, pinned: false, cover: true,
  },
  {
    id: 'p7', title: 'Startup Pitch Deck',
    description: 'Series A narrative and financials — waiting on updated numbers from finance.',
    icon: 'target', status: 'Blocked', priority: 'Critical', deadline: '2026-07-26', estimatedCompletion: '2026-07-30', progress: 45,
    owner: 'sc', members: ['sc', 'am', 'mw'], color: 'rose',
    createdAt: '2026-06-20', updatedAt: '2026-07-22', lastActivity: '2026-07-22',
    tags: ['Startup', 'Fundraising'], taskCount: 20, completedTaskCount: 9, attachmentsCount: 6, notesCount: 8,
    favorite: true, pinned: true, cover: false,
  },
  {
    id: 'p8', title: 'Client Onboarding Flow',
    description: 'First-run experience for new accounts, down from 9 steps to 4.',
    icon: 'users', status: 'In Progress', priority: 'High', deadline: '2026-08-10', estimatedCompletion: '2026-08-08', progress: 70,
    owner: 'mw', members: ['mw', 'jl', 'no'], color: 'blue',
    createdAt: '2026-06-01', updatedAt: '2026-07-24', lastActivity: '2026-07-24',
    tags: ['Startup', 'Product'], taskCount: 28, completedTaskCount: 20, attachmentsCount: 5, notesCount: 7,
    favorite: false, pinned: false, cover: true,
  },
  {
    id: 'p9', title: 'Photography Portfolio',
    description: 'Curating three years of film scans into something worth showing.',
    icon: 'layers', status: 'Planning', priority: 'Low', deadline: null, estimatedCompletion: null, progress: 5,
    owner: 'am', members: ['am'], color: 'emerald',
    createdAt: '2026-07-20', updatedAt: '2026-07-21', lastActivity: '2026-07-21',
    tags: ['Personal', 'Creative'], taskCount: 10, completedTaskCount: 0, attachmentsCount: 2, notesCount: 2,
    favorite: false, pinned: false, cover: true,
  },
  {
    id: 'p10', title: 'Database Migration',
    description: 'Postgres 14 to 17, zero-downtime, staged behind a feature flag.',
    icon: 'code', status: 'Review', priority: 'High', deadline: '2026-07-27', estimatedCompletion: '2026-07-26', progress: 95,
    owner: 'jl', members: ['jl', 'mw'], color: 'slate',
    createdAt: '2026-06-15', updatedAt: '2026-07-24', lastActivity: '2026-07-24',
    tags: ['Engineering', 'Infra'], taskCount: 22, completedTaskCount: 21, attachmentsCount: 3, notesCount: 4,
    favorite: false, pinned: false, cover: false,
  },
  {
    id: 'p11', title: 'Marathon Training Plan',
    description: '16-week block building to race day — long runs on Sundays, no exceptions.',
    icon: 'flame', status: 'In Progress', priority: 'Medium', deadline: '2026-10-12', estimatedCompletion: null, progress: 60,
    owner: 'am', members: ['am'], color: 'emerald',
    createdAt: '2026-05-01', updatedAt: '2026-07-24', lastActivity: '2026-07-24',
    tags: ['Personal', 'Health'], taskCount: 16, completedTaskCount: 10, attachmentsCount: 0, notesCount: 5,
    favorite: false, pinned: false, cover: false,
  },
  {
    id: 'p12', title: 'Book Manuscript',
    description: 'First draft, chapters 1 through 12. Hasn\u2019t been opened since spring.',
    icon: 'book', status: 'Not Started', priority: 'Medium', deadline: '2026-07-01', estimatedCompletion: null, progress: 0,
    owner: 'am', members: ['am'], color: 'amber',
    createdAt: '2026-04-01', updatedAt: '2026-04-01', lastActivity: '2026-04-01',
    tags: ['Personal', 'Writing'], taskCount: 12, completedTaskCount: 0, attachmentsCount: 1, notesCount: 9,
    favorite: false, pinned: false, cover: false,
  },
  {
    id: 'p13', title: 'Old CRM Integration',
    description: 'Superseded by the new vendor contract — kept for reference only.',
    icon: 'users', status: 'Archived', priority: 'Low', deadline: '2026-05-01', estimatedCompletion: null, progress: 20,
    owner: 'mw', members: ['mw'], color: 'slate',
    createdAt: '2026-02-01', updatedAt: '2026-05-05', lastActivity: '2026-05-05',
    tags: ['Startup', 'Legacy'], taskCount: 14, completedTaskCount: 3, attachmentsCount: 2, notesCount: 1,
    favorite: false, pinned: false, cover: false,
  },
  {
    id: 'p14', title: 'Family Reunion Planning',
    description: 'Venue, catering, and the group flight booking spreadsheet everyone actually used.',
    icon: 'gift', status: 'Completed', priority: 'Low', deadline: '2026-07-10', estimatedCompletion: null, progress: 100,
    owner: 'am', members: ['am', 'no'], color: 'teal',
    createdAt: '2026-05-20', updatedAt: '2026-07-10', lastActivity: '2026-07-10',
    tags: ['Personal', 'Events'], taskCount: 9, completedTaskCount: 9, attachmentsCount: 4, notesCount: 3,
    favorite: true, pinned: false, cover: false,
  },
];

export const ALL_TAGS = [...new Set(projects.flatMap((p) => p.tags))].sort();

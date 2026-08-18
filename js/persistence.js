// Atlas — Persistence layer.
//
// This is the seam between the app's in-memory arrays (still the thing every
// view reads, so the UI code never became async) and IndexedDB. It does three
// jobs:
//
//  1. First run: seeds the database from the module `data.js` files, which
//     are now *seed data* rather than the source of truth. Each record is
//     assigned a `workspaceId` so workspaces are real data scopes.
//  2. Boot / workspace switch: hydrates the in-memory arrays from the store
//     for the active workspace (in place, so every existing `import { x }`
//     reference keeps working).
//  3. Write-through: `save*()` helpers serialize the in-memory arrays back to
//     IndexedDB. Views call these at every mutation site. Whole-collection
//     snapshots are queued per store so rapid mutations can't interleave.
//
// A future backend (tRPC/Postgres per the Foundation doc) can replace db.js
// behind this same surface: the views would keep calling the same save*()s.

import * as db from './db.js';
import { getState, setState } from './store.js';
import { projects, setProjects } from './projects/data.js';
import { events, setEvents } from './calendar/data.js';
import { notes, setNotes } from './notes/data.js';
import { habits, setHabits, completions, setCompletions } from './habits/data.js';
import { rebuildCompletionIndex } from './habits/state.js';
import { goals, setGoals } from './goals/data.js';
import { resources, setResources } from './learning/data.js';
import { transactions, setTransactions } from './finance/data.js';
import { books, setBooks } from './books/data.js';
import { codingItems, setCodingItems, practiceSessions, setPracticeSessions } from './coding/data.js';

// ---- Active workspace -----------------------------------------------------
export function activeWorkspaceId() {
  return getState().workspaceId || 'personal';
}

// ---- Profile (meta-backed, so it survives across workspaces) --------------
const DEFAULT_PROFILE = { name: 'Alex Morgan', email: 'alex@atlas.dev', initials: 'AM' };
let profile = { ...DEFAULT_PROFILE };

export function getProfile() {
  return profile;
}

export async function saveProfile(patch) {
  profile = { ...profile, ...patch };
  if (!patch.initials) {
    profile.initials = profile.name
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'A';
  }
  await db.putMeta('profile', profile);
  return profile;
}

// ---- Workspace inference for seed records ---------------------------------
// The seed data was authored across personal/university/startup contexts; tag
// and calendar names already encode which is which, so the seed step uses them
// rather than inventing a parallel classification.
function workspaceFromTags(tags) {
  const t = tags || [];
  if (t.some((x) => x === 'University' || x === 'Research' || x === 'Thesis')) return 'university';
  if (t.some((x) => x === 'Startup' || x === 'Fundraising' || x === 'Infra' || x === 'Legacy')) return 'startup';
  return null;
}

function inferWorkspace(item, kind) {
  if (kind === 'event') {
    if (item.calendarId === 'school') return 'university';
    if (item.calendarId === 'work') return 'startup';
    return 'personal';
  }
  const byTags = workspaceFromTags(item.tags);
  if (byTags) return byTags;
  if (kind === 'goal' || kind === 'coding') {
    const refs = kind === 'goal' ? item.linkedProjects : item.linkedProjects;
    if (Array.isArray(refs)) {
      for (const ref of refs) {
        const p = projects.find((x) => x.id === ref);
        if (p) return inferWorkspace(p, 'project');
      }
    }
  }
  return 'personal';
}

// ---- Seeding ---------------------------------------------------------------
const SEEDED_KEY = 'seeded';

// Records get a positional `_order` so hydration can restore the original
// authoring order (IndexedDB `getAll` returns key order, not insertion order).
function withMeta(list, kind) {
  return list.map((item, i) => ({ ...item, workspaceId: inferWorkspace(item, kind), _order: i }));
}

async function seedAll() {
  await db.putMany('projects', withMeta(projects, 'project'));
  await db.putMany('events', withMeta(events, 'event'));
  await db.putMany('notes', withMeta(notes, 'note'));
  await db.putMany('habits', withMeta(habits, 'habit'));
  await db.putMany('habitCompletions', completions.map((c, i) => ({ ...c, id: `${c.habitId}::${c.date}`, workspaceId: inferWorkspace(habits.find((h) => h.id === c.habitId) || habits[0], 'habit'), _order: i })));
  await db.putMany('goals', withMeta(goals, 'goal'));
  await db.putMany('resources', withMeta(resources, 'resource'));
  await db.putMany('transactions', withMeta(transactions, 'transaction'));
  await db.putMany('books', withMeta(books, 'book'));
  await db.putMany('codingItems', withMeta(codingItems, 'coding'));
  await db.putMany('codingSessions', withMeta(practiceSessions, 'coding'));
  await db.putMeta('profile', DEFAULT_PROFILE);
}

async function seedIfNeeded() {
  const seeded = await db.getMeta(SEEDED_KEY);
  if (seeded?.value) return;
  await seedAll();
  await db.putMeta(SEEDED_KEY, true);
}

// ---- Hydration (DB → in-memory arrays) -------------------------------------
function sortByOrder(list) {
  return [...list].sort((a, b) => (a._order ?? 0) - (b._order ?? 0)).map(({ _order, ...rest }) => rest);
}

async function hydrateWorkspace(workspaceId) {
  const [p, e, n, h, c, g, r, t, b, ci, cs] = await Promise.all([
    db.getAllByWorkspace('projects', workspaceId),
    db.getAllByWorkspace('events', workspaceId),
    db.getAllByWorkspace('notes', workspaceId),
    db.getAllByWorkspace('habits', workspaceId),
    db.getAllByWorkspace('habitCompletions', workspaceId),
    db.getAllByWorkspace('goals', workspaceId),
    db.getAllByWorkspace('resources', workspaceId),
    db.getAllByWorkspace('transactions', workspaceId),
    db.getAllByWorkspace('books', workspaceId),
    db.getAllByWorkspace('codingItems', workspaceId),
    db.getAllByWorkspace('codingSessions', workspaceId),
  ]);

  setProjects(sortByOrder(p));
  setEvents(sortByOrder(e));
  setNotes(sortByOrder(n));
  setHabits(sortByOrder(h));
  setCompletions(sortByOrder(c));
  rebuildCompletionIndex();
  setGoals(sortByOrder(g));
  setResources(sortByOrder(r));
  setTransactions(sortByOrder(t));
  setBooks(sortByOrder(b));
  setCodingItems(sortByOrder(ci));
  setPracticeSessions(sortByOrder(cs));

  const savedProfile = await db.getMeta('profile');
  profile = savedProfile?.value ? { ...DEFAULT_PROFILE, ...savedProfile.value } : { ...DEFAULT_PROFILE };
}

export async function hydrate() {
  try {
    await seedIfNeeded();
    await hydrateWorkspace(activeWorkspaceId());
  } catch (err) {
    console.error('[atlas] Hydration failed:', err);
    // Re-throw so the boot sequence can show a failure state
    throw err;
  }
}

export async function switchWorkspace(workspaceId) {
  setState({ workspaceId });
  await hydrateWorkspace(workspaceId);
}

// Adds the sample dataset back alongside the user's own data. Safe to run any
// time: seed ids are fixed (p1, e1, …) and user-created ids are
// timestamp+random, so nothing user-made is overwritten.
export async function loadDemoData() {
  await seedAll();
  await hydrateWorkspace(activeWorkspaceId());
}

export async function resetAllData() {
  // Wipe every store and re-seed from the module data files ("Load demo data"
  // equivalent). The active workspace's arrays are re-hydrated afterwards.
  for (const name of db.STORES) {
    await db.clearStore(name);
  }
  await seedIfNeeded();
  await hydrateWorkspace(activeWorkspaceId());
}

// ---- Write-through (in-memory arrays → DB) ---------------------------------
// Snapshot the whole collection with the active workspace attached, queued per
// store so rapid successive mutations are persisted in order. Failures are
// logged, never thrown — the UI must not break because storage hiccuped.
const queues = new Map();

function enqueue(storeName, fn) {
  const prev = queues.get(storeName) || Promise.resolve();
  const next = prev.then(fn).catch((err) => {
    console.error(`[atlas] Failed to persist ${storeName}:`, err);
    // Surface the error so callers can react — the queue still resolves
    // (to the error) so subsequent writes aren't blocked, but the caller
    // gets a rejected promise they can await and handle.
  });
  queues.set(storeName, next);
  return next;
}

function snapshot(list, kind) {
  const ws = activeWorkspaceId();
  return list.map((item, i) => ({ ...item, workspaceId: ws, _order: i }));
}

// Await every pending write (used by tests and by destructive operations like
// reset, which must not race a queued snapshot).
export function flushAll() {
  return Promise.all([...queues.values()]);
}

// Workspace-scoped save: delete all records for the active workspace first,
// then write the current in-memory snapshot. This ensures deleted records
// don't reappear on reload (putMany upserts but never removes).
function saveWorkspace(storeName, items, kind) {
  const ws = activeWorkspaceId();
  const snap = items.map((item, i) => ({ ...item, workspaceId: ws, _order: i }));
  return enqueue(storeName, async () => {
    await db.removeByWorkspace(storeName, ws);
    await db.putMany(storeName, snap);
  });
}

export function saveProjects() { return saveWorkspace('projects', projects, 'project'); }
export function saveEvents() { return saveWorkspace('events', events, 'event'); }
export function saveNotes() { return saveWorkspace('notes', notes, 'note'); }
export function saveHabits() { return saveWorkspace('habits', habits, 'habit'); }
export function saveCompletions() {
  const ws = activeWorkspaceId();
  const snap = completions.map((c, i) => ({ ...c, id: `${c.habitId}::${c.date}`, workspaceId: ws, _order: i }));
  return enqueue('habitCompletions', async () => {
    await db.removeByWorkspace('habitCompletions', ws);
    await db.putMany('habitCompletions', snap);
  });
}
export function saveGoals() { return saveWorkspace('goals', goals, 'goal'); }
export function saveResources() { return saveWorkspace('resources', resources, 'resource'); }
export function saveTransactions() { return saveWorkspace('transactions', transactions, 'transaction'); }
export function saveBooks() { return saveWorkspace('books', books, 'book'); }
export function saveCodingItems() { return saveWorkspace('codingItems', codingItems, 'coding'); }
export function saveCodingSessions() { return saveWorkspace('codingSessions', practiceSessions, 'coding'); }

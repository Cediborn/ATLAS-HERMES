// Atlas — persistence/CRUD test harness.
// Loaded from tests/run-tests.html. Runs a full CRUD + persistence round-trip
// against the real data layer and prints results into the DOM, so it can be
// executed headlessly (chrome --headless --dump-dom). Two consecutive runs in
// the same Chrome profile prove data survives a page reload.

import {
  hydrate, flushAll,
  saveProjects, saveNotes, saveHabits, saveCompletions, saveGoals,
  saveBooks, saveTransactions, saveResources, saveCodingItems, saveCodingSessions,
  switchWorkspace,
} from '../js/persistence.js';
import { projects, setProjects } from '../js/projects/data.js';
import { habits, setHabits, completions, setCompletions } from '../js/habits/data.js';
import { setCompletionStatus, getStatusOn } from '../js/habits/state.js';
import { events, setEvents } from '../js/calendar/data.js';
import { createLocalEvent, deleteLocalEvent, getEventsInRange } from '../js/calendar/repository.js';
import { notes, setNotes } from '../js/notes/data.js';
import { goals, setGoals } from '../js/goals/data.js';
import { books, setBooks } from '../js/books/data.js';
import { transactions, setTransactions } from '../js/finance/data.js';
import { resources, setResources } from '../js/learning/data.js';
import { codingItems, setCodingItems, practiceSessions, setPracticeSessions } from '../js/coding/data.js';

const results = [];
const runId = new URLSearchParams(location.search).get('run') || '1';

function pass(name) {
  results.push({ ok: true, name });
  console.log(`PASS ${runId}: ${name}`);
}
function fail(name, detail) {
  results.push({ ok: false, name, detail });
  console.error(`FAIL ${runId}: ${name} — ${detail}`);
}
function check(name, cond, detail) {
  (cond ? pass : fail)(name, detail || '');
}

async function main() {
  try {
    await hydrate();
    // 14 seed projects split by tag-inferred workspace: p5→university, p7/p8/p12/p14→startup, rest→personal.
    // Run 2 counts one extra (the test project created in run 1 before it's deleted).
    const expectedProjects = runId === '1' ? 9 : 10;
    check('hydrate: personal workspace has correct seed project count', projects.length === expectedProjects, `got ${projects.length} expected ${expectedProjects}`);
    check('hydrate: personal workspace has seed notes', notes.length >= 10, `got ${notes.length}`);
    check('hydrate: personal workspace has seed events', events.length >= 10, `got ${events.length}`);
    check('hydrate: personal workspace has seed habits', habits.length >= 8, `got ${habits.length}`);
    check('hydrate: habits completion history loaded', completions.length > 100, `got ${completions.length}`);
    check('hydrate: goals/books/resources/coding seeded', goals.length > 0 && books.length > 0 && resources.length > 0 && codingItems.length > 0);
    check('hydrate: transactions seeded', transactions.length >= 10, `got ${transactions.length}`);

    if (runId === '1') {
      // ---- Mutate: create things (mirrors what the UI does) ----
      const proj = { id: 'test-project', title: 'Build Atlas', description: 'Acceptance test project', status: 'In Progress', priority: 'High', deadline: '2030-01-01', tasks: [{ id: 'tk1', title: 'Write persistence layer', done: false, due: '2030-01-01' }, { id: 'tk2', title: 'Ship it', done: true, due: null }], taskCount: 2, completedTaskCount: 1, progress: 50, createdAt: '2030-01-01', updatedAt: '2030-01-01', lastActivity: '2030-01-01', tags: ['test'], favorite: false, pinned: false, owner: 'am', members: ['am'], color: 'blue', icon: 'folder', attachmentsCount: 0, notesCount: 0, cover: false };
      setProjects([proj, ...projects]);
      saveProjects();

      setCompletionStatus('h1', '2030-01-01', 'done');
      setCompletionStatus('h1', '2030-01-02', 'done');

      createLocalEvent({ title: 'Test event', start: '2030-01-01T10:00', end: '2030-01-01T11:00', allDay: false, calendarId: 'personal', type: 'Normal Event', priority: 'medium' });

      const note = { id: 'test-note', title: 'Test note', content: 'hello', category: 'Journal', tags: ['test'], createdAt: '2030-01-01', updatedAt: '2030-01-01', pinned: false, favorite: false, archived: false };
      setNotes([note, ...notes]);
      saveNotes();

      const goal = { id: 'test-goal', title: 'Test goal', description: '', type: 'short', category: 'personal', status: 'In Progress', priority: 'Medium', startDate: '2030-01-01', deadline: '2030-02-01', milestones: [{ id: 'm1', title: 'Do it', due: null, done: false }], linkedProjects: [], linkedHabits: [], favorite: false, archived: false, createdAt: '2030-01-01', updatedAt: '2030-01-01' };
      setGoals([goal, ...goals]);
      saveGoals();

      const book = { id: 'test-book', title: 'Test book', author: 'Tester', genre: 'fiction', format: 'print', pages: 100, pagesRead: 25, status: 'Reading', rating: null, favorite: false, notes: '', startedAt: '2030-01-01', finishedAt: null, linkedGoals: [], linkedHabits: [] };
      setBooks([book, ...books]);
      saveBooks();

      const tx = { id: 'test-tx', date: '2030-01-01', description: 'Test expense', type: 'expense', category: 'food', amount: 42, accountId: 'a1', status: 'cleared', favorite: false };
      setTransactions([tx, ...transactions]);
      saveTransactions();

      const res = { id: 'test-res', title: 'Test resource', author: 'Tester', type: 'article', subject: 'design', status: 'In Progress', priority: 'Low', units: [{ id: 'u1', title: 'Read it', done: true }], tags: [], favorite: false, archived: false, linkedGoalIds: [], linkedProjectIds: [], linkedHabitIds: [], createdAt: '2030-01-01', updatedAt: '2030-01-01' };
      setResources([res, ...resources]);
      saveResources();

      const coding = { id: 'test-coding', title: 'Test problem', kind: 'problem', source: 'LeetCode', difficulty: 'Easy', languages: ['JavaScript'], topics: ['algorithms'], status: 'In Progress', timeSpentMin: 30, lastPracticed: '2030-01-01', favorite: false, steps: [], linkedGoals: [], linkedProjects: [], linkedHabits: [] };
      setCodingItems([coding, ...codingItems]);
      saveCodingItems();

      const session = { id: 'test-session', date: '2030-01-01', minutes: 45 };
      setPracticeSessions([session, ...practiceSessions]);
      saveCodingSessions();

      const habit = { id: 'test-habit', title: 'Test habit', description: '', category: 'custom', icon: 'flame', color: 'blue', frequency: 'daily', customDays: null, reminderTime: null, goal: null, priority: 'Medium', tags: [], notes: '', favorite: false, archived: false, linkedProjectId: null, goalId: null, createdAt: '2030-01-01', updatedAt: '2030-01-01' };
      setHabits([habit, ...habits]);
      saveHabits();

      await flushAll();
      pass('wrote all mutations to IndexedDB');
    } else {
      // ---- Second run (simulated page reload): everything must still exist ----
      check('persist: created project survived', projects.some((p) => p.id === 'test-project'), 'missing');
      const proj = projects.find((p) => p.id === 'test-project');
      check('persist: project tasks survived', proj && proj.tasks?.length === 2, JSON.stringify(proj?.tasks));
      check('persist: habit completion survived', getStatusOn('h1', '2030-01-01') === 'done', 'missing');
      check('persist: habit survives', habits.some((h) => h.id === 'test-habit'));
      check('persist: event survives', events.some((e) => e.title === 'Test event'));
      check('persist: note survives', notes.some((n) => n.id === 'test-note'));
      check('persist: goal survives', goals.some((g) => g.id === 'test-goal'));
      check('persist: book survives', books.some((b) => b.id === 'test-book'));
      check('persist: transaction survives', transactions.some((t) => t.id === 'test-tx'));
      check('persist: resource survives', resources.some((r) => r.id === 'test-res'));
      check('persist: coding item survives', codingItems.some((c) => c.id === 'test-coding'));
      check('persist: coding session survives', practiceSessions.some((s) => s.id === 'test-session'));

      // ---- Delete something, and it must stay deleted after another reload ----
      const idx = projects.findIndex((p) => p.id === 'test-project');
      if (idx !== -1) projects.splice(idx, 1);
      saveProjects();
      deleteLocalEvent(events.find((e) => e.title === 'Test event')?.id);
      await flushAll();
      pass('deleted test project + test event');
    }

    // ---- Workspace scoping ----
    await switchWorkspace('university');
    check('workspace: university is a separate data scope', !projects.some((p) => p.id === 'test-project'));
    check('workspace: university has thesis seed project', projects.some((p) => p.id === 'p5'), 'p5 missing');
    await switchWorkspace('personal');
    check('workspace: personal restored after switching back', projects.some((p) => p.id === 'p1'));
  } catch (err) {
    fail('harness threw', String(err && err.stack || err));
  }

  const failed = results.filter((r) => !r.ok).length;
  const out = document.getElementById('results');
  out.innerHTML = `
    <h1>Run ${runId}</h1>
    <p class="${failed ? 'bad' : 'good'}">${results.length - failed}/${results.length} passed</p>
    <ul>${results.map((r) => `<li class="${r.ok ? 'ok' : 'bad'}">${r.ok ? 'PASS' : 'FAIL'} — ${r.name}${r.detail ? ` <small>${r.detail}</small>` : ''}</li>`).join('')}</ul>
  `;
  out.dataset.failed = String(failed);
  out.dataset.total = String(results.length);
}
main();

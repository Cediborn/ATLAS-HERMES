// Atlas — LUNA. A floating AI assistant that answers plain-language questions
// by reading the app's live data modules. No server, no network calls — it
// summarizes what is already on disk. Self-contained: initLuna() mounts its own
// DOM and owns all its event listeners.

import { icon } from './icons.js';
import { todayKey, dateKey, formatDate, daysUntil } from './date-utils.js';
import { projects as allProjects } from './projects/data.js';
import { goals as allGoals } from './goals/data.js';
import { computeGoalProgress } from './goals/state.js';
import { habits as allHabits } from './habits/data.js';
import { topStreaks, computeSuccessRate, dayState } from './habits/state.js';
import { accounts, transactions } from './finance/data.js';
import { accountBalance, formatCurrency, computeFinanceStats } from './finance/state.js';
import { books as allBooks } from './books/data.js';
import { computeBookProgress } from './books/state.js';
import { codingItems as allCoding } from './coding/data.js';
import { computeItemProgress } from './coding/state.js';
import { resources as allResources } from './learning/data.js';
import { computeResourceProgress } from './learning/state.js';
import { getEventsInRange } from './calendar/repository.js';
import { formatTime } from './calendar/state.js';

let fabEl = null;
let wrapEl = null;
let panelEl = null;
let messagesEl = null;
let inputEl = null;
let suggestionsEl = null;
let collapsed = false;
let initialized = false;

const COLLAPSE_KEY = 'atlas:lunaCollapsed';

// ================= INTENT ROUTING =================

// Real task list: open project tasks due today/overdue, plus events today.
function todayTasks() {
  const todayK = todayKey();
  const rows = [];
  for (const p of allProjects) {
    for (const t of p.tasks || []) {
      if (t.done) continue;
      const due = t.due || p.deadline || null;
      if (!due || due > todayK) continue;
      rows.push(`<li>${esc(t.title)} <span class="luna-list__meta">${esc(p.title)} · ${due < todayK ? 'overdue' : 'due today'}</span></li>`);
    }
  }
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  const evts = getEventsInRange(start, end).filter((e) => !e.completed).slice(0, 3);
  for (const e of evts) {
    rows.push(`<li>${esc(e.title)} <span class="luna-list__meta">${e.allDay ? 'All day' : formatTime(e.start)}</span></li>`);
  }
  if (!rows.length) return '<p>Nothing on your plate today. Enjoy the clear schedule.</p>';
  return `<p><strong>${rows.length} things</strong> due today.</p><ul class="luna-list">${rows.join('')}</ul>`;
}

function topGoalAnswer() {
  const active = allGoals
    .filter((g) => g.status !== 'Completed' && g.status !== 'Archived')
    .sort((a, b) => new Date(a.deadline || '9999-12-31') - new Date(b.deadline || '9999-12-31'))
    .slice(0, 3);
  if (!active.length) return '<p>No active goals right now.</p>';
  const rows = active.map(
    (g) =>
      `<li><span class="luna-list__bar" style="width:${computeGoalProgress(g)}%"></span>${esc(g.title)} <span class="luna-list__meta">${computeGoalProgress(g)}% · ${g.deadline ? formatDate(g.deadline) : 'no deadline'}</span></li>`
  ).join('');
  return `<ul class="luna-list">${rows}</ul>`;
}

function streakAnswer() {
  const top = topStreaks('current', 3).filter(({ streak }) => streak.current > 0);
  if (!top.length) return '<p>No active streaks yet — pick a habit and start today.</p>';
  const rows = top
    .map(({ habit, streak }) => `<li>${esc(habit.title)} <span class="luna-list__meta">${streak.current} day streak</span></li>`)
    .join('');
  return `<ul class="luna-list">${rows}</ul>`;
}

function moneyAnswer() {
  const s = computeFinanceStats();
  return `<p>Net worth is <strong>${formatCurrency(s.totalBalance)}</strong> across ${accounts.length} accounts.</p>
    <ul class="luna-list">
      <li>Income this month <span class="luna-list__meta">+${formatCurrency(s.income)}</span></li>
      <li>Spending this month <span class="luna-list__meta">\u2212${formatCurrency(s.expense)}</span></li>
      <li>Savings rate <span class="luna-list__meta">${s.savingsRate}%</span></li>
    </ul>`;
}

function booksAnswer() {
  const reading = allBooks.filter((b) => b.status === 'Reading').sort((a, b) => computeBookProgress(b) - computeBookProgress(a));
  if (!reading.length) return '<p>Nothing on the nightstand. Pick something up.</p>';
  const rows = reading
    .map((b) => `<li>${esc(b.title)} <span class="luna-list__meta">${computeBookProgress(b)}% · ${b.pagesRead}/${b.pages} pages</span></li>`)
    .join('');
  return `<ul class="luna-list">${rows}</ul>`;
}

function codingAnswer() {
  const active = allCoding.filter((c) => c.status === 'In Progress').sort((a, b) => computeItemProgress(b) - computeItemProgress(a));
  if (!active.length) return '<p>Nothing in flight. Queue up a problem or build.</p>';
  const rows = active
    .map((c) => `<li>${esc(c.title)} <span class="luna-list__meta">${computeItemProgress(c)}%${c.stepsTotal ? ` · ${c.stepsDone}/${c.stepsTotal} steps` : ''}</span></li>`)
    .join('');
  return `<ul class="luna-list">${rows}</ul>`;
}

function eventsAnswer() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const events = getEventsInRange(start, end).sort((a, b) => new Date(a.start) - new Date(b.start));
  if (!events.length) return '<p>No events today.</p>';
  const rows = events
    .map((e) => `<li>${e.allDay ? 'All day' : formatTime(e.start)} <span class="luna-list__meta">${esc(e.title)}${e.location ? ` · ${esc(e.location)}` : ''}</span></li>`)
    .join('');
  return `<ul class="luna-list">${rows}</ul>`;
}

function overdueAnswer() {
  const todayK = todayKey();
  const rows = [];
  // Overdue tasks
  for (const p of allProjects) {
    for (const t of p.tasks || []) {
      if (t.done) continue;
      const due = t.due || p.deadline || null;
      if (due && due < todayK) rows.push(`<li>${esc(t.title)} <span class="luna-list__meta">${esc(p.title)} · ${Math.abs(daysUntil(due))}d overdue</span></li>`);
    }
  }
  // Overdue goal deadlines
  for (const g of allGoals) {
    if (g.status === 'Completed' || g.status === 'Archived' || !g.deadline) continue;
    if (daysUntil(g.deadline) < 0) rows.push(`<li>${esc(g.title)} <span class="luna-list__meta">deadline ${Math.abs(daysUntil(g.deadline))}d overdue</span></li>`);
  }
  if (!rows.length) return '<p>Nothing overdue — you\u2019re on top of things.</p>';
  return `<p><strong>${rows.length} overdue item${rows.length === 1 ? '' : 's'}</strong>:</p><ul class="luna-list">${rows.join('')}</ul>`;
}

function neglectedGoalsAnswer() {
  const active = allGoals
    .filter((g) => g.status !== 'Completed' && g.status !== 'Archived')
    .map((g) => ({ goal: g, progress: computeGoalProgress(g) }));
  const neglected = active
    .filter(({ goal, progress }) => {
      if (goal.status === 'At Risk' || goal.status === 'Blocked') return true;
      if (progress < 30 && goal.deadline && daysUntil(goal.deadline) < 30) return true;
      if (goal.deadline && daysUntil(goal.deadline) < 0) return true;
      return false;
    })
    .sort((a, b) => (a.goal.deadline ? daysUntil(a.goal.deadline) : 999) - (b.goal.deadline ? daysUntil(b.goal.deadline) : 999));
  if (!neglected.length) return '<p>All your goals look healthy. Keep it up.</p>';
  const rows = neglected
    .map(({ goal, progress }) => {
      const urgency = goal.deadline && daysUntil(goal.deadline) < 0 ? 'overdue' : goal.status;
      return `<li><span class="luna-list__bar" style="width:${progress}%"></span>${esc(goal.title)} <span class="luna-list__meta">${progress}% · ${urgency}${goal.deadline ? ` · ${formatDate(goal.deadline)}` : ''}</span></li>`;
    })
    .join('');
  return `<ul class="luna-list">${rows}</ul>`;
}

function whatNextAnswer() {
  const suggestions = [];
  const todayK = todayKey();
  // Overdue tasks first
  for (const p of allProjects) {
    for (const t of p.tasks || []) {
      if (t.done) continue;
      const due = t.due || p.deadline || null;
      if (due && due < todayK) suggestions.push({ priority: 0, html: `<li>${esc(t.title)} <span class="luna-list__meta">overdue in ${esc(p.title)}</span></li>` });
    }
  }
  // Tasks due today
  for (const p of allProjects) {
    for (const t of p.tasks || []) {
      if (t.done) continue;
      const due = t.due || p.deadline || null;
      if (due && due === todayK) suggestions.push({ priority: 1, html: `<li>${esc(t.title)} <span class="luna-list__meta">due today in ${esc(p.title)}</span></li>` });
    }
  }
  // At-risk goals
  for (const g of allGoals.filter((g) => g.status === 'At Risk' || g.status === 'Blocked')) {
    suggestions.push({ priority: 2, html: `<li>${esc(g.title)} <span class="luna-list__meta">${g.status} goal</span></li>` });
  }
  // Incomplete habits today
  for (const h of allHabits.filter((h) => !h.archived && dayState(h, new Date()) === 'incomplete')) {
    suggestions.push({ priority: 3, html: `<li>${esc(h.title)} <span class="luna-list__meta">habit not done yet</span></li>` });
  }
  suggestions.sort((a, b) => a.priority - b.priority);
  const top = suggestions.slice(0, 5);
  if (!top.length) return '<p>Nothing pressing. Pick whatever energizes you most.</p>';
  return `<p>Here\u2019s what I\u2019d focus on:</p><ul class="luna-list">${top.map((s) => s.html).join('')}</ul>`;
}

function weekSummaryAnswer() {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const todayK = todayKey();
  const weekAgoK = dateKey(weekAgo);
  // Tasks completed this week
  let tasksDone = 0;
  for (const p of allProjects) {
    for (const t of p.tasks || []) {
      if (t.done && t.createdAt && t.createdAt >= weekAgoK) tasksDone++;
    }
  }
  // Habits success rate
  let habitDue = 0, habitDone = 0;
  for (const h of allHabits.filter((h) => !h.archived)) {
    const rate = computeSuccessRate(h, 7);
    habitDue++;
    habitDone += rate > 0 ? 1 : 0;
  }
  const habitPct = habitDue ? Math.round((habitDone / habitDue) * 100) : 0;
  // Goal progress
  const activeGoals = allGoals.filter((g) => g.status !== 'Completed' && g.status !== 'Archived');
  const avgProgress = activeGoals.length ? Math.round(activeGoals.reduce((s, g) => s + computeGoalProgress(g), 0) / activeGoals.length) : 0;
  const bits = [
    `${tasksDone} task${tasksDone === 1 ? '' : 's'} completed this week`,
    `${habitPct}% of habits had activity`,
    `Average goal progress: ${avgProgress}%`,
  ];
  return `<p><strong>This week in review:</strong></p><ul class="luna-list">${bits.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`;
}

function searchAnswer(query) {
  const q = query.toLowerCase();
  const results = [];
  // Search projects
  for (const p of allProjects) {
    if (p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || (p.tags || []).some((t) => t.toLowerCase().includes(q))) {
      results.push(`<li><span class="luna-list__meta">Project</span> ${esc(p.title)} <span class="luna-list__meta">· ${p.status}</span></li>`);
    }
  }
  // Search tasks
  for (const p of allProjects) {
    for (const t of p.tasks || []) {
      if (t.title.toLowerCase().includes(q)) {
        results.push(`<li><span class="luna-list__meta">Task</span> ${esc(t.title)} <span class="luna-list__meta">· ${esc(p.title)}</span></li>`);
      }
    }
  }
  // Search goals
  for (const g of allGoals) {
    if (g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)) {
      results.push(`<li><span class="luna-list__meta">Goal</span> ${esc(g.title)} <span class="luna-list__meta">· ${g.status}</span></li>`);
    }
  }
  // Search learning
  for (const r of allResources) {
    if (r.title.toLowerCase().includes(q) || r.author.toLowerCase().includes(q) || (r.tags || []).some((t) => t.toLowerCase().includes(q))) {
      results.push(`<li><span class="luna-list__meta">Learning</span> ${esc(r.title)} <span class="luna-list__meta">· ${r.status}</span></li>`);
    }
  }
  // Search habits
  for (const h of allHabits) {
    if (h.title.toLowerCase().includes(q) || (h.tags || []).some((t) => t.toLowerCase().includes(q))) {
      results.push(`<li><span class="luna-list__meta">Habit</span> ${esc(h.title)} <span class="luna-list__meta">· ${h.category}</span></li>`);
    }
  }
  if (!results.length) return `<p>Nothing found for "${esc(query)}".</p>`;
  return `<p><strong>${results.length} result${results.length === 1 ? '' : 's'}</strong> for "${esc(query)}":</p><ul class="luna-list">${results.join('')}</ul>`;
}

function greetingAnswer() {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const todayK = todayKey();
  let undone = 0;
  for (const p of allProjects) {
    for (const t of p.tasks || []) {
      if (t.done) continue;
      const due = t.due || p.deadline || null;
      if (due && due <= todayK) undone += 1;
    }
  }
  const top = topStreaks('current', 1)[0];
  const goal = allGoals
    .filter((g) => g.status !== 'Completed' && g.status !== 'Archived')
    .sort((a, b) => new Date(a.deadline || '9999-12-31') - new Date(b.deadline || '9999-12-31'))[0];
  const bits = [
    `${undone ? `${undone} task${undone === 1 ? '' : 's'} open today` : 'all tasks done today'}`,
    top ? `${top.habit.title} — ${top.streak.current} day streak` : 'no streaks running',
    goal ? `top goal: ${goal.title}` : 'no active goals',
  ];
  return `<p><strong>${part}!</strong> Quick summary from your data:</p><ul class="luna-list">${bits.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`;
}

const HELP_LINES = [
  'I read your live data — nothing leaves your machine.',
  ['"What\u2019s on today?"', 'tasks and to-dos'],
  ['"Top goals"', 'deadline-ordered active goals'],
  ['"Best streak"', 'running habit streaks'],
  ['"My money"', 'balance, income, spending'],
  ['"Currently reading"', 'books in progress'],
  ['"Coding progress"', 'open problems and builds'],
  ['"Upcoming events"', 'today\u2019s calendar'],
  ['"What\u2019s overdue?"', 'overdue tasks and goals'],
  ['"Neglected goals"', 'goals needing attention'],
  ['"What should I work on next?"', 'prioritized suggestions'],
  ['"This week"', 'weekly summary'],
  ['"Everything about X"', 'cross-module search'],
].map((l) => (Array.isArray(l) ? `<li><code>${l[0]}</code> <span class="luna-list__meta">${l[1]}</span></li>` : `<li>${l}</li>`)).join('');

function answerFor(raw) {
  const q = raw.toLowerCase().trim();
  if (!q) return null;
  if (/(what can you do|help|commands|^hi$|hello|hey)/.test(q) && !q.includes('streak')) {
    return { text: `<p>Here\u2019s what I can tell you:</p><ul class="luna-list">${HELP_LINES}</ul>`, chips: SUGGESTIONS };
  }
  if (/(greet|hello|hi|hey|morning|afternoon|evening)/.test(q) && /(^|[^a-z])(hi|hello|hey|morning|afternoon|evening)/.test(q)) {
    return { text: greetingAnswer(), chips: SUGGESTIONS };
  }
  if (/(overdue|late|behind)/.test(q)) return { text: overdueAnswer(), chips: ['Neglected goals', 'What should I work on next?'] };
  if (/(neglect|stale|stuck|risk|at risk|blocked)/.test(q)) return { text: neglectedGoalsAnswer(), chips: ['What\u2019s overdue?', 'What should I work on next?'] };
  if (/(next|what next|what should|priority|priorities|focus)/.test(q)) return { text: whatNextAnswer(), chips: ['This week', 'Overdue'] };
  if (/(week|weekly|this week|how did)/.test(q)) return { text: weekSummaryAnswer(), chips: ['What should I work on next?', 'Neglected goals'] };
  if (/(task|todo|today|overview|to-do)/.test(q)) return { text: todayTasks(), chips: ['Top goals', 'Best streak', 'My money'] };
  if (/(goal|milestone)/.test(q)) return { text: topGoalAnswer(), chips: ['What\u2019s on today?', 'Currently reading'] };
  if (/(streak|habit)/.test(q)) return { text: streakAnswer(), chips: ['Top goals', 'Coding progress'] };
  if (/(money|finance|balance|budget|income|spend|saving)/.test(q)) return { text: moneyAnswer(), chips: ['What\u2019s on today?', 'Top goals'] };
  if (/(book|read|shelf|nightstand)/.test(q)) return { text: booksAnswer(), chips: ['Coding progress', 'What\u2019s on today?'] };
  if (/(coding|problem|build|leetcode|code)/.test(q)) return { text: codingAnswer(), chips: ['Best streak', 'Top goals'] };
  if (/(event|calendar|meeting|schedule|appointment)/.test(q)) return { text: eventsAnswer(), chips: ['What\u2019s on today?', 'My money'] };
  if (/(search|find|show|everything about)/.test(q)) return { text: searchAnswer(raw), chips: SUGGESTIONS };
  // Default: try to search for the query across all modules
  if (q.length > 2) return { text: searchAnswer(raw), chips: SUGGESTIONS };
  return {
    text: `<p>I\u2019m still learning that one. Try asking about <strong>today\u2019s tasks</strong>, <strong>goals</strong>, <strong>streaks</strong>, <strong>money</strong>, <strong>books</strong>, <strong>coding</strong>, or <strong>events</strong>.</p>`,
    chips: SUGGESTIONS,
  };
}

const SUGGESTIONS = ['What\u2019s on today?', 'Top goals', 'Best streak', 'My money', 'What\u2019s overdue?', 'What should I work on next?', 'This week'];

// ================= DOM + EVENTS =================

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function mount() {
  if (document.getElementById('luna-root')) return;
  const root = document.createElement('div');
  root.id = 'luna-root';
  root.innerHTML = `
    <div class="luna-fab-wrap" id="luna-fab-wrap">
      <button type="button" class="luna-fab" id="luna-fab" aria-label="Ask LUNA" aria-expanded="false" aria-controls="luna-panel">
        <span class="luna-fab__icon">${icon('sparkle', { size: 20 })}</span>
        <span class="luna-fab__label">Ask LUNA</span>
      </button>
      <button type="button" class="luna-fab__collapse" id="luna-collapse" aria-label="Collapse LUNA" title="Collapse LUNA">${icon('chevronDown', { size: 14 })}</button>
    </div>

    <section class="luna-panel" id="luna-panel" role="dialog" aria-modal="false" aria-label="LUNA assistant" hidden>
      <header class="luna-panel__header">
        <span class="luna-panel__avatar">${icon('sparkle', { size: 15 })}</span>
        <div class="luna-panel__titles">
          <span class="luna-panel__name">LUNA</span>
          <span class="luna-panel__status">local rules-based assistant · no data leaves your device</span>
        </div>
        <button type="button" class="icon-btn luna-panel__min" id="luna-min" aria-label="Minimize LUNA" title="Minimize LUNA">${icon('chevronDown', { size: 17 })}</button>
        <button type="button" class="icon-btn luna-panel__close" id="luna-close" aria-label="Close LUNA">${icon('x', { size: 17 })}</button>
      </header>

      <div class="luna-messages" id="luna-messages" role="log" aria-live="polite"></div>

      <div class="luna-suggestions" id="luna-suggestions"></div>

      <form class="luna-input" id="luna-form" autocomplete="off">
        <input type="text" id="luna-input" placeholder="Ask LUNA anything\u2026" aria-label="Message LUNA" autocomplete="off" spellcheck="false" />
        <button type="submit" class="icon-btn luna-input__send" aria-label="Send">${icon('arrowRight', { size: 17 })}</button>
      </form>
    </section>
  `;
  document.body.appendChild(root);
}

export function initLuna() {
  if (initialized) return;
  initialized = true;
  mount();

  fabEl = document.getElementById('luna-fab');
  wrapEl = document.getElementById('luna-fab-wrap');
  panelEl = document.getElementById('luna-panel');
  messagesEl = document.getElementById('luna-messages');
  suggestionsEl = document.getElementById('luna-suggestions');
  inputEl = document.getElementById('luna-input');
  const closeBtn = document.getElementById('luna-close');
  const collapseBtn = document.getElementById('luna-collapse');
  const minBtn = document.getElementById('luna-min');
  const form = document.getElementById('luna-form');

  // ---- Collapse / expand: shrink the whole assistant to a compact dot ----
  function collapse() {
    collapsed = true;
    try { localStorage.setItem(COLLAPSE_KEY, '1'); } catch { /* ignore */ }
    wrapEl.classList.add('is-collapsed');
    fabEl.setAttribute('aria-label', 'Expand LUNA');
    panelEl.hidden = true;
    fabEl.setAttribute('aria-expanded', 'false');
    fabEl.focus();
  }

  function expand() {
    collapsed = false;
    try { localStorage.removeItem(COLLAPSE_KEY); } catch { /* ignore */ }
    wrapEl.classList.remove('is-collapsed');
    fabEl.setAttribute('aria-label', 'Ask LUNA');
  }

  // Restore the persisted collapsed state on boot.
  try {
    collapsed = localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    collapsed = false;
  }
  if (collapsed) {
    wrapEl.classList.add('is-collapsed');
    fabEl.setAttribute('aria-label', 'Expand LUNA');
  }

  function open() {
    panelEl.hidden = false;
    fabEl.setAttribute('aria-expanded', 'true');
    if (!messagesEl.children.length) {
      addMessage('luna', greetingAnswer(), SUGGESTIONS, true);
      renderSuggestions(SUGGESTIONS);
    }
    setTimeout(() => inputEl.focus(), 60);
  }

  function close({ restoreFocus = true } = {}) {
    panelEl.hidden = true;
    fabEl.setAttribute('aria-expanded', 'false');
    if (restoreFocus) fabEl.focus();
  }

  function addMessage(who, html, chips = [], instant = false) {
    const wrap = document.createElement('div');
    wrap.className = `luna-msg luna-msg--${who}`;
    wrap.innerHTML = `<div class="luna-msg__bubble">${html}</div>`;
    if (chips.length && who === 'luna') {
      const chipRow = document.createElement('div');
      chipRow.className = 'luna-chips';
      chips.forEach((label) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'luna-chip';
        b.textContent = label;
        b.addEventListener('click', () => send(label));
        chipRow.appendChild(b);
      });
      wrap.appendChild(chipRow);
    }
    if (instant) {
      messagesEl.appendChild(wrap);
    } else {
      const typing = document.createElement('div');
      typing.className = 'luna-msg luna-msg--luna luna-typing';
      typing.innerHTML = '<div class="luna-msg__bubble"><span class="luna-typing__dot"></span><span class="luna-typing__dot"></span><span class="luna-typing__dot"></span></div>';
      messagesEl.appendChild(typing);
      const delay = 500 + Math.random() * 500;
      setTimeout(() => {
        typing.replaceWith(wrap);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        renderSuggestions(chips);
      }, delay);
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderSuggestions(chips) {
    suggestionsEl.innerHTML = '';
    chips.forEach((label) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'luna-suggestion';
      b.textContent = label;
      b.addEventListener('click', () => send(label));
      suggestionsEl.appendChild(b);
    });
  }

  function send(text) {
    const value = (text ?? inputEl.value).trim();
    if (!value) return;
    inputEl.value = '';
    addMessage('user', esc(value));
    const answer = answerFor(value);
    setTimeout(() => {
      addMessage('luna', answer.text, answer.chips);
    }, 200 + Math.random() * 200);
  }

  fabEl.addEventListener('click', () => {
    if (collapsed) {
      expand();
      return;
    }
    if (panelEl.hidden) open();
    else close();
  });
  collapseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    collapse();
  });
  minBtn.addEventListener('click', () => collapse());
  closeBtn.addEventListener('click', () => close());
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    send();
  });
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panelEl.hidden) close({ restoreFocus: false });
  });
  document.addEventListener('click', (e) => {
    if (!panelEl.hidden && !e.target.closest('#luna-root')) close({ restoreFocus: false });
  });
}

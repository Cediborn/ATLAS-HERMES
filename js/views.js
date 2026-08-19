// Atlas — View renderers. Each export fills a container with markup.
// The dashboard is assembled entirely from js/components.js, and every number
// is computed from the live data layer — no hard-coded values.

import { icon } from './icons.js';
import { quickActions, workspaces } from './config.js';
import { getState } from './store.js';
import { setTheme } from './theme.js';
import { getProfile, saveProfile, saveProjects } from './persistence.js';
import { notificationsEnabled, setNotificationsEnabled } from './browser-notifications.js';
import { timeAgo, todayKey, formatDate, dateKey } from './date-utils.js';
import { projects as allProjects } from './projects/data.js';
import { notes as allNotes } from './notes/data.js';
import { habits as allHabits } from './habits/data.js';
import { goals as allGoals } from './goals/data.js';
import { computeGoalProgress } from './goals/state.js';
import { resources as allResources } from './learning/data.js';
import { computeResourceProgress } from './learning/state.js';
import { transactions as allTransactions, accounts as allAccounts, CATEGORY_CONFIG } from './finance/data.js';
import { formatCurrency as formatMoney } from './finance/state.js';

import { computeDashboardStats, computeStreak, computeSuccessRate, dayState, topStreaks, computeTrend, setCompletionStatus } from './habits/state.js';
import { getEventsInRange } from './calendar/repository.js';
import { calendar as getCalendarInfo } from './calendar/data.js';
import { formatTime } from './calendar/state.js';
import { esc } from './sanitize.js';
import {
  StatCard,
  SectionCard,
  sectionAction,
  QuickActionButton,
  TaskItem,
  EventItem,
  ProjectItem,
  GoalItem,
  ResourceItem,
  TransactionItem,
  NoteItem,
  HabitItem,
  Badge,
  emptyState,
} from './components.js';

// ---- Real dashboard metrics (computed, never stored/hard-coded) ----

function dueTasksToday() {
  const today = todayKey();
  const rows = [];
  for (const p of allProjects) {
    for (const t of p.tasks || []) {
      if (t.done) continue;
      const due = t.due || p.deadline || null;
      if (!due) continue;
      if (due <= today) rows.push({ task: t, project: p, overdue: due < today });
    }
  }
  return rows;
}

function eventsToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return getEventsInRange(start, end);
}

function notesThisWeek() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const cutoff = dateKey(weekAgo);
  return allNotes.filter((n) => !n.archived && n.updatedAt >= cutoff);
}

export function renderDashboard(container) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const profile = getProfile();
  const firstName = profile.name.split(' ')[0];
  const dateStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  // ---- Stats: all real ----
  const todayDue = dueTasksToday();
  const evtsToday = eventsToday();
  const notesWeek = notesThisWeek();
  const habitStats = computeDashboardStats();
  const bestStreakHabit = topStreaks('current', 1)[0];
  const streakTrend = bestStreakHabit ? computeTrend(bestStreakHabit.habit) : 0;

  const stats = [
    StatCard({ title: 'Tasks Due', value: String(todayDue.length), icon: 'check', accent: 'accent', trend: `${todayDue.filter((r) => r.overdue).length} overdue` }),
    StatCard({ title: 'Habit Streak', value: `${habitStats.currentStreak} days`, icon: 'flame', trend: `${streakTrend >= 0 ? '+' : ''}${streakTrend}% vs last week`, accent: 'warning' }),
    StatCard({ title: 'Events Today', value: String(evtsToday.length), icon: 'calendar', accent: 'success' }),
    StatCard({ title: 'Notes This Week', value: String(notesWeek.length), icon: 'fileText' }),
  ].join('');

  // ---- Today's overview: real tasks due today/overdue ----
  const todayBody = todayDue.length
    ? todayDue
        .sort((a, b) => (a.overdue === b.overdue ? 0 : a.overdue ? -1 : 1))
        .slice(0, 6)
        .map(({ task, project, overdue }) =>
          TaskItem({
            id: task.id,
            title: task.title,
            category: project.title,
            priority: (project.priority || '').toLowerCase(),
            dueTime: overdue ? 'Overdue' : 'Due today',
            done: false,
          })
        )
        .join('')
    : emptyState({ icon: 'check', title: 'Nothing due today', description: 'Enjoy the clear schedule.', size: 'sm' });

  const recentProjects = [...allProjects]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 3)
    .map((p) => ({ id: p.id, name: p.title, status: p.status, lastUpdated: timeAgo(p.updatedAt), progress: p.progress }));

  const projectsBody = recentProjects.length
    ? recentProjects.map((p) => ProjectItem(p)).join('')
    : emptyState({ icon: 'folder', title: 'No projects yet', description: 'Create your first project.', size: 'sm' });

  const recentNotes = allNotes
    .filter((n) => !n.archived)
    .slice()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 2)
    .map((n) => ({ id: n.id, title: n.title, editedDate: timeAgo(n.updatedAt), tag: n.tags[0] }));

  const notesBody = recentNotes.length
    ? recentNotes.map((n) => NoteItem(n)).join('')
    : emptyState({ icon: 'fileText', title: 'No notes yet', description: 'Capture your ideas.', size: 'sm' });

  const topGoals = allGoals
    .filter((g) => g.status !== 'Completed' && g.status !== 'Archived')
    .sort((a, b) => new Date(a.deadline || '9999-12-31') - new Date(b.deadline || '9999-12-31'))
    .slice(0, 3);

  const goalsBody = topGoals.length
    ? topGoals
        .map((g) =>
          GoalItem({
            id: g.id,
            title: g.title,
            progress: computeGoalProgress(g),
            status: g.status,
            deadline: g.deadline ? formatDate(g.deadline) : null,
          })
        )
        .join('')
    : emptyState({ icon: 'target', title: 'No goals yet', description: 'Set a goal to start tracking.', size: 'sm' });

  const eventsRangeStart = new Date();
  eventsRangeStart.setHours(0, 0, 0, 0);
  const eventsRangeEnd = new Date(eventsRangeStart);
  eventsRangeEnd.setDate(eventsRangeEnd.getDate() + 2);
  const upcomingEvents = getEventsInRange(eventsRangeStart, eventsRangeEnd)
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .slice(0, 4)
    .map((e) => ({
      id: e.occurrenceKey,
      time: e.allDay ? 'All day' : formatTime(e.start),
      title: e.title,
      location: e.location,
      color: e.color || getCalendarInfo(e.calendarId).color,
    }));

  const eventsBody = upcomingEvents.length
    ? upcomingEvents.map((e) => EventItem(e)).join('')
    : emptyState({ icon: 'calendar', title: 'No events today', description: 'Enjoy your free schedule.', size: 'sm' });

  const dashboardHabitStats = computeDashboardStats();
  const topCurrentStreaks = topStreaks('current', 3).filter((x) => x.streak.current > 0 || dayState(x.habit, new Date()) !== 'locked');
  const previewHabits = (topCurrentStreaks.length ? topCurrentStreaks : topStreaks('current', 3)).map(({ habit, streak }) => ({
    id: habit.id,
    name: habit.title,
    icon: habit.icon,
    streak: `${streak.current} day streak`,
    completedToday: dayState(habit, new Date()) === 'done',
    weeklyProgress: computeSuccessRate(habit, 7),
  }));

  const habitsBody = previewHabits.length
    ? previewHabits.map((h) => HabitItem(h)).join('')
    : emptyState({ icon: 'flame', title: 'No habits yet', description: 'Start one to build a streak.', size: 'sm' });

  const activeResources = allResources
    .filter((r) => r.status === 'In Progress')
    .sort((a, b) => computeResourceProgress(b) - computeResourceProgress(a))
    .slice(0, 3);

  const learningBody = activeResources.length
    ? activeResources
        .map((r) =>
          ResourceItem({
            id: r.id,
            title: r.title,
            typeLabel: `${r.type[0].toUpperCase() + r.type.slice(1)} · ${r.author}`,
            progress: computeResourceProgress(r),
            status: r.status,
          })
        )
        .join('')
    : emptyState({ icon: 'bookOpen', title: 'Nothing in progress', description: 'Start a course or book.', size: 'sm' });

  const recentTransactions = allTransactions
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);

  const financeBody = recentTransactions.length
    ? recentTransactions
        .map((t) =>
          TransactionItem({
            id: t.id,
            title: t.description,
            category: CATEGORY_CONFIG[t.category].label,
            amount: formatMoney(t.amount),
            type: t.type,
            icon: CATEGORY_CONFIG[t.category].icon,
            account: allAccounts.find((a) => a.id === t.accountId)?.name,
          })
        )
        .join('')
    : emptyState({ icon: 'wallet', title: 'No transactions yet', description: 'Add an income or expense.', size: 'sm' });



  const welcome = !localStorage.getItem('atlas:welcomeSeen')
    ? `<div class="welcome-banner" role="status">
        <div class="welcome-banner__body"><strong>Welcome to Atlas.</strong> Everything you create is saved locally in your browser — nothing leaves your machine. Press <kbd>Ctrl/⌘</kbd><kbd>K</kbd> to search or jump anywhere.</div>
        <button type="button" class="welcome-banner__close" id="welcome-dismiss" aria-label="Dismiss welcome message">${icon('x', { size: 16 })}</button>
      </div>`
    : '';

  container.innerHTML = `
    <div class="dashboard">
      ${welcome}
      <div class="dashboard__hero">
        <h2>${greeting}, ${esc(firstName)}.</h2>
        <p class="dashboard__hero-date">${dateStr}</p>
        <p class="dashboard__hero-subtitle">Let's make today count.</p>
      </div>

      <div class="dashboard__stats">${stats}</div>

      <div class="quick-actions" id="quick-actions" aria-label="Quick actions">
        ${quickActions.map((qa) => QuickActionButton(qa)).join('')}
      </div>

      <div class="dashboard__grid">
        <div class="dashboard__col dashboard__col--left">
          ${SectionCard({ title: "Today's Overview", action: sectionAction('projects'), content: todayBody })}
          ${SectionCard({ title: 'Recent Projects', action: sectionAction('projects'), content: projectsBody })}
          ${SectionCard({ title: 'Top Goals', action: sectionAction('goals'), content: goalsBody })}
          ${SectionCard({ title: 'Recent Notes', action: sectionAction('notes'), content: notesBody })}
        </div>
        <div class="dashboard__col dashboard__col--right">
          ${SectionCard({ title: 'Upcoming Events', action: sectionAction('calendar'), content: eventsBody })}
          ${SectionCard({ title: 'Current Streaks', action: sectionAction('habits'), content: habitsBody })}
          ${SectionCard({ title: 'Finance', action: sectionAction('finance'), content: financeBody })}
          ${SectionCard({ title: 'Learning Progress', action: sectionAction('learning'), content: learningBody })}
        </div>
      </div>
    </div>
  `;

  const dismissWelcome = container.querySelector('#welcome-dismiss');
  if (dismissWelcome) {
    dismissWelcome.addEventListener('click', () => {
      try { localStorage.setItem('atlas:welcomeSeen', '1'); } catch { /* ignore */ }
      dismissWelcome.closest('.welcome-banner')?.remove();
    });
  }

  // Task checkbox toggle — mutates the real project task and persists.
  container.querySelectorAll('.task-item').forEach((row) => {
    const toggle = () => {
      row.classList.toggle('is-done');
      const isDone = row.classList.contains('is-done');
      row.setAttribute('aria-checked', String(isDone));
      const taskId = row.dataset.id;
      for (const p of allProjects) {
        const task = (p.tasks || []).find((t) => t.id === taskId);
        if (task) {
          task.done = isDone;
          const done = p.tasks.filter((t) => t.done).length;
          p.taskCount = p.tasks.length;
          p.completedTaskCount = done;
          p.progress = p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0;
          p.updatedAt = new Date().toISOString().slice(0, 10);
          saveProjects();
          break;
        }
      }
    };
    row.addEventListener('click', toggle);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });

  // Habit "done today" toggle — writes real completion history.
  container.querySelectorAll('.habit-item__check').forEach((btn) => {
    btn.addEventListener('click', () => {
      const isDone = !btn.classList.contains('is-done');
      btn.classList.toggle('is-done', isDone);
      btn.setAttribute('aria-checked', String(isDone));
      const habitId = btn.closest('.habit-item').dataset.id;
      const habit = allHabits.find((h) => h.id === habitId);
      if (!habit) return;
      setCompletionStatus(habitId, todayKey(), isDone ? 'done' : null);
      const streak = computeStreak(habit);
      const metaEl = btn.closest('.habit-item').querySelector('.habit-item__meta');
      if (metaEl) metaEl.textContent = `${streak.current} day streak`;
    });
  });

  // Quick actions → direct creation. Each button navigates to the
  // appropriate module and opens the creation dialog/interface.
  container.querySelector('.quick-actions')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.quick-action');
    if (!btn) return;
    const action = btn.dataset.action;

    switch (action) {
      case 'project':
        // Project dialog is a shared form-dialog modal — works from anywhere
        import('./projects/dialog.js').then((m) => m.openProjectDialog('create', null, () => {}));
        break;
      case 'note':
        // Navigate to Notes, then click the "New Note" toolbar button
        window.location.hash = '/notes';
        const tryClickNote = () => {
          const noteBtn = document.getElementById('notes-new');
          if (noteBtn) noteBtn.click();
          else setTimeout(tryClickNote, 100);
        };
        setTimeout(tryClickNote, 100);
        break;
      case 'event':
        // Event dialog requires initEventPanel (calendar view must be mounted)
        window.location.hash = '/calendar';
        setTimeout(() => {
          import('./calendar/event-panel.js').then((m) =>
            m.openEventDialog('create', new Date().toISOString().slice(0, 10))
          );
        }, 200);
        break;
      case 'task':
        // Tasks are sub-items of projects — navigate to Projects
        window.location.hash = '/projects';
        break;
      default:
        // Fallback: open command palette for unknown actions
        document.getElementById('search-trigger').click();
    }
  });
}

export function renderEmptyState(container, { label, icon: iconName, phase }) {
  const description = phase
    ? `${label} is scoped for Phase ${phase} of the roadmap — the shell and navigation are ready, the feature itself isn't built yet.`
    : `${label} doesn't have a scheduled phase yet — it's on the list, just not built.`;
  const badge = phase ? Badge({ label: `Phase ${phase}`, variant: 'accent' }) : Badge({ label: 'Coming soon', variant: 'neutral' });

  container.innerHTML = emptyState({ icon: iconName, title: label, description, size: 'lg', badge });
}

export function renderSettings(container) {
  const theme = getState().theme;
  const activeWorkspaceId = getState().workspaceId;
  const profile = getProfile();

  const profileContent = `
    <div class="field"><label for="set-name">Name</label><input id="set-name" type="text" value="${esc(profile.name)}"></div>
    <div class="field"><label for="set-email">Email</label><input id="set-email" type="email" value="${esc(profile.email)}"></div>
    <div class="settings-row"><button type="button" class="btn btn--primary" id="settings-save-profile">Save profile</button><span class="settings-row__meta" id="settings-profile-status" aria-live="polite"></span></div>
  `;

  const appearanceContent = `
    <div class="switch-group" role="group" aria-label="Theme">
      ${['light', 'dark', 'system']
        .map(
          (t) => `
        <button type="button" class="switch-group__option" data-theme-option="${t}" aria-pressed="${t === theme}">
          ${icon(t === 'light' ? 'sun' : t === 'dark' ? 'moon' : 'monitor', { size: 16 })}
          <span>${t[0].toUpperCase() + t.slice(1)}</span>
        </button>`
        )
        .join('')}
    </div>
  `;

  const notifEnabled = notificationsEnabled();
  const notificationsContent = `
    <p class="settings-row__desc">Get system notifications for the same real items shown in the in-app panel — upcoming events, due projects, habit reminders. Permission is requested only when you turn this on.</p>
    <div class="switch-group" role="group" aria-label="Browser notifications">
      <button type="button" class="switch-group__option" id="settings-notif-on" aria-pressed="${notifEnabled}">${icon('bell', { size: 16 })}<span>On</span></button>
      <button type="button" class="switch-group__option" id="settings-notif-off" aria-pressed="${!notifEnabled}">${icon('bell', { size: 16 })}<span>Off</span></button>
    </div>
    <div class="settings-row"><span class="settings-row__meta" id="settings-notif-status" aria-live="polite"></span></div>
  `;

  const workspacesContent = workspaces
    .map(
      (w) => `
    <div class="settings-row">
      <span class="workspace-switcher__badge">${w.badge}</span>
      <span class="settings-row__body">${w.name}</span>
      ${w.id === activeWorkspaceId ? Badge({ label: 'Active' }) : ''}
    </div>`
    )
    .join('');

  const dataContent = `
    <p class="settings-row__desc">All data is stored locally in your browser (IndexedDB). Nothing leaves your machine.</p>
    <div class="settings-row">
      <button type="button" class="btn btn--secondary" id="settings-load-demo">Load demo data</button>
      <span class="settings-row__meta">Adds the sample dataset alongside your own data.</span>
    </div>
    <div class="settings-row">
      <button type="button" class="btn btn--secondary" id="settings-reset-data">Reset demo data</button>
      <span class="settings-row__meta">Clears everything and re-seeds the sample data.</span>
    </div>
  `;

  const shortcutsContent = `
    <div class="settings-row"><span class="settings-row__body">Open command palette</span><kbd>Ctrl / ⌘</kbd><kbd>K</kbd></div>
    <div class="settings-row"><span class="settings-row__body">Navigate results</span><kbd>↑</kbd><kbd>↓</kbd></div>
    <div class="settings-row"><span class="settings-row__body">Close any overlay</span><kbd>Esc</kbd></div>
  `;

  const aboutContent = `
    <p class="settings-row__desc">Atlas v1.0 — a static, local-first personal operating system. All data stays in your browser. No cloud sync, no account required.</p>
    <div class="settings-row"><span class="settings-row__body">Storage</span><span class="settings-row__meta">IndexedDB (browser local storage)</span></div>
    <div class="settings-row"><span class="settings-row__body">Offline</span><span class="settings-row__meta">Full offline support after first visit (service worker)</span></div>
    <div class="settings-row"><span class="settings-row__body">LUNA</span><span class="settings-row__meta">Local rules-based assistant — reads your data on-device, no AI model</span></div>
    <div class="settings-row__desc" style="margin-top:var(--space-16);"><strong>Not yet supported:</strong></div>
    <div class="settings-row"><span class="settings-row__body">Calendar week/day views</span><span class="settings-row__meta">Month and Agenda views available</span></div>
    <div class="settings-row"><span class="settings-row__body">Project Board/Kanban view</span><span class="settings-row__meta">Grid view available</span></div>
    <div class="settings-row"><span class="settings-row__body">Import/Export</span><span class="settings-row__meta">Requires file I/O, not yet implemented</span></div>
    <div class="settings-row"><span class="settings-row__body">Google/Outlook calendar sync</span><span class="settings-row__meta">All data is local-only</span></div>
    <div class="settings-row"><span class="settings-row__body">Cloud sync / authentication</span><span class="settings-row__meta">Atlas is designed as a local-first app</span></div>
    <div class="settings-row"><span class="settings-row__body">Custom event recurrence</span><span class="settings-row__meta">Basic recurrence only (weekly, monthly, yearly)</span></div>
  `;

  container.innerHTML = `
    <div class="settings-page">
      ${SectionCard({ title: 'Profile', content: profileContent })}
      ${SectionCard({ title: 'Appearance', content: appearanceContent })}
      ${SectionCard({ title: 'Notifications', content: notificationsContent })}
      ${SectionCard({ title: 'Workspaces', content: workspacesContent })}
      ${SectionCard({ title: 'Data', content: dataContent })}
      ${SectionCard({ title: 'Keyboard shortcuts', content: shortcutsContent })}
      ${SectionCard({ title: 'About Atlas', content: aboutContent })}
    </div>
  `;

  container.querySelectorAll('[data-theme-option]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setTheme(btn.dataset.themeOption);
      container
        .querySelectorAll('[data-theme-option]')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    });
  });

  const notifStatus = document.getElementById('settings-notif-status');
  const notifButtons = [document.getElementById('settings-notif-on'), document.getElementById('settings-notif-off')];
  notifButtons.forEach((btn) => {
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const turnOn = btn.id === 'settings-notif-on';
      const result = await setNotificationsEnabled(turnOn);
      const enabled = result === 'granted';
      document.getElementById('settings-notif-on').setAttribute('aria-pressed', String(enabled));
      document.getElementById('settings-notif-off').setAttribute('aria-pressed', String(!enabled));
      notifStatus.textContent =
        result === 'granted' ? 'Notifications enabled.'
        : result === 'denied' ? 'Permission was denied — allow notifications for this site in your browser settings.'
        : result === 'unsupported' ? 'This browser does not support notifications.'
        : result === 'dismissed' ? 'Permission prompt dismissed.'
        : 'Notifications off.';
    });
  });

  document.getElementById('settings-load-demo').addEventListener('click', async () => {
    const { loadDemoData } = await import('./persistence.js');
    await loadDemoData();
    const { rerender } = await import('./router.js');
    rerender();
  });

  document.getElementById('settings-save-profile').addEventListener('click', async () => {
    const name = document.getElementById('set-name').value.trim();
    const email = document.getElementById('set-email').value.trim();
    if (!name || !email) {
      const status = document.getElementById('settings-profile-status');
      status.textContent = 'Name and email are required.';
      return;
    }
    await saveProfile({ name, email });
    const status = document.getElementById('settings-profile-status');
    status.textContent = 'Saved.';
    document.getElementById('profile-trigger').innerHTML = `<span class="avatar avatar--md">${getProfile().initials}</span>`;
    setTimeout(() => { status.textContent = ''; }, 2500);
  });

  document.getElementById('settings-reset-data').addEventListener('click', async () => {
    if (!window.confirm('Reset all Atlas data to the sample data? This cannot be undone.')) return;
    const { resetAllData } = await import('./persistence.js');
    await resetAllData();
    const { rerender } = await import('./router.js');
    rerender();
  });
}

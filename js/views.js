// Atlas — View renderers. Each export fills a container with markup.
// The dashboard is now assembled entirely from js/components.js — no
// section here has its own bespoke wrapper (Day 6 spec).

import { icon } from './icons.js';
import { dashboardData, currentUser, workspaces, quickActions } from './mock-data.js';
import { getState } from './store.js';
import { setTheme } from './theme.js';
import { timeAgo, todayKey, formatDate } from './date-utils.js';
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

export function renderDashboard(container) {
  const d = dashboardData;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = currentUser.name.split(' ')[0];
  const dateStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const todayBody = d.tasks.length
    ? d.tasks.map((t) => TaskItem(t)).join('')
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

  const statsWithLiveStreak = d.stats.map((s) => {
    if (s.id !== 'streak') return s;
    const bestStreakHabit = topStreaks('current', 1)[0];
    const trend = bestStreakHabit ? computeTrend(bestStreakHabit.habit) : 0;
    return { ...s, value: `${dashboardHabitStats.currentStreak} days`, trend: `${trend >= 0 ? '+' : ''}${trend}% vs last week` };
  });

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

  container.innerHTML = `
    <div class="dashboard">
      <div class="dashboard__hero">
        <h2>${greeting}, ${firstName}.</h2>
        <p class="dashboard__hero-date">${dateStr}</p>
        <p class="dashboard__hero-subtitle">Let's make today count.</p>
      </div>

      <div class="dashboard__stats">
        ${statsWithLiveStreak.map((s) => StatCard(s)).join('')}
      </div>

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

  // Task checkbox toggle
  container.querySelectorAll('.task-item').forEach((row) => {
    const toggle = () => {
      row.classList.toggle('is-done');
      const isDone = row.classList.contains('is-done');
      row.setAttribute('aria-checked', String(isDone));
      const task = d.tasks.find((t) => String(t.id) === row.dataset.id);
      if (task) task.done = isDone;
    };
    row.addEventListener('click', toggle);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });

  // Habit "done today" toggle — dashboard preview stays a simple binary
  // toggle (done / not done); the full 3-state cycle (done/skipped/undo)
  // lives on the Habits page itself, see habits/components.js.
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

  // Quick actions open the command palette (quick-capture) rather than a
  // non-functional stub — no backend exists yet to actually create anything.
  container.querySelector('.quick-actions')?.addEventListener('click', (e) => {
    if (e.target.closest('.quick-action')) {
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

  const profileContent = `
    <div class="field"><label for="set-name">Name</label><input id="set-name" type="text" value="${currentUser.name}"></div>
    <div class="field"><label for="set-email">Email</label><input id="set-email" type="email" value="${currentUser.email}"></div>
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

  const shortcutsContent = `
    <div class="settings-row"><span class="settings-row__body">Open command palette</span><kbd>Ctrl / ⌘</kbd><kbd>K</kbd></div>
    <div class="settings-row"><span class="settings-row__body">Navigate results</span><kbd>↑</kbd><kbd>↓</kbd></div>
    <div class="settings-row"><span class="settings-row__body">Close any overlay</span><kbd>Esc</kbd></div>
  `;

  container.innerHTML = `
    <div class="settings-page">
      ${SectionCard({ title: 'Profile', content: profileContent })}
      ${SectionCard({ title: 'Appearance', content: appearanceContent })}
      ${SectionCard({ title: 'Workspaces', content: workspacesContent })}
      ${SectionCard({ title: 'Keyboard shortcuts', content: shortcutsContent })}
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
}

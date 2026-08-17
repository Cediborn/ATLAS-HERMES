// Atlas — Notifications. Every notification is computed from the user's real
// stored data at read time (upcoming events, overdue/due project deadlines,
// approaching goal deadlines, unfinished habits with reminders, overdue
// tasks). Nothing is fabricated; when there's nothing to say, the list is
// empty. Read-state is a lightweight UI preference, so it lives in localStorage.

import { dateKey, todayKey } from './date-utils.js';
import { getEventsInRange } from './calendar/repository.js';
import { projects } from './projects/data.js';
import { goals } from './goals/data.js';
import { habits, isDueOn } from './habits/data.js';
import { getStatusOn } from './habits/state.js';

const READ_KEY = 'atlas:notifRead';

function readSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function persistRead(set) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...set]));
  } catch {
    // storage unavailable — read state just won't persist
  }
}

export function computeNotifications() {
  const list = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ---- Upcoming events (next 24h) ----
  const rangeStart = new Date(today);
  const rangeEnd = new Date(today);
  rangeEnd.setDate(rangeEnd.getDate() + 1);
  rangeEnd.setHours(23, 59, 59, 999);
  const soon = getEventsInRange(rangeStart, rangeEnd)
    .filter((e) => !e.completed)
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  for (const e of soon.slice(0, 5)) {
    list.push({
      id: `event-${e.occurrenceKey || e.id}`,
      text: e.allDay ? `Event today: ${e.title}` : `${e.title} at ${new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(e.start))}`,
      time: 'Today',
      kind: 'event',
    });
  }

  // ---- Projects: overdue, then due within 3 days ----
  for (const p of projects) {
    if (!p.deadline || p.status === 'Completed' || p.status === 'Archived') continue;
    const days = Math.round((new Date(`${p.deadline}T00:00:00`) - today) / 86400000);
    if (days < 0) {
      list.push({ id: `proj-over-${p.id}`, text: `"${p.title}" is ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`, time: 'Project', kind: 'project' });
    } else if (days <= 3) {
      list.push({
        id: `proj-due-${p.id}`,
        text: days === 0 ? `"${p.title}" is due today` : days === 1 ? `"${p.title}" is due tomorrow` : `"${p.title}" is due in ${days} days`,
        time: 'Project',
        kind: 'project',
      });
    }
  }

  // ---- Goals: deadlines within 7 days ----
  for (const g of goals) {
    if (!g.deadline || g.status === 'Completed' || g.status === 'Archived') continue;
    const days = Math.round((new Date(`${g.deadline}T00:00:00`) - today) / 86400000);
    if (days >= 0 && days <= 7) {
      list.push({
        id: `goal-${g.id}`,
        text: days === 0 ? `Goal deadline today: ${g.title}` : `Goal deadline in ${days} day${days === 1 ? '' : 's'}: ${g.title}`,
        time: 'Goal',
        kind: 'goal',
      });
    }
  }

  // ---- Habits with a reminder due today, not yet completed ----
  const todayK = todayKey();
  for (const h of habits) {
    if (h.archived || !h.reminderTime || !isDueOn(h, new Date())) continue;
    if (getStatusOn(h.id, todayK) === 'done' || getStatusOn(h.id, todayK) === 'skipped') continue;
    list.push({ id: `habit-${h.id}-${todayK}`, text: `Habit reminder: ${h.title}`, time: 'Today', kind: 'habit' });
  }

  // ---- Overdue project tasks (cap the noise) ----
  let overdueTasks = 0;
  for (const p of projects) {
    for (const t of p.tasks || []) {
      if (!t.done && t.due && t.due < todayK) overdueTasks += 1;
    }
  }
  if (overdueTasks > 0) {
    list.push({ id: `tasks-overdue`, text: `${overdueTasks} task${overdueTasks === 1 ? ' is' : 's are'} overdue`, time: 'Tasks', kind: 'task' });
  }

  list.sort((a, b) => (a.kind === 'event' ? -1 : 1) - (b.kind === 'event' ? -1 : 1));
  return list.slice(0, 12).map((n) => ({ ...n, unread: !readSet().has(n.id) }));
}

export function markNotificationRead(id) {
  const set = readSet();
  set.add(id);
  persistRead(set);
}

export function markAllRead() {
  const set = new Set(computeNotifications().map((n) => n.id));
  persistRead(set);
}

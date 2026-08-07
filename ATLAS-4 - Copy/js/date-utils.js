// Atlas — Shared date helpers. Originally lived inside projects/state.js;
// extracted here once Notes needed the exact same logic, rather than having
// one feature module import internals from another.
//
// `dateKey`/`todayDate`/`todayKey`/`startOfMonth`/`endOfMonth`/`addMonths`/
// `monthGridDays` below made the exact same move for the exact same reason:
// they originally lived only in calendar/state.js, until Habits needed the
// identical month-grid math for its heatmap. calendar/state.js now re-exports
// them from here instead of keeping its own copy (see that file).

const DAY_MS = 86400000;

function atMidnight(d) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.round((atMidnight(new Date(`${dateStr}T00:00:00`)) - atMidnight(new Date())) / DAY_MS);
}

export function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${dateStr}T00:00:00`));
}

export function timeAgo(dateStr) {
  const days = Math.round((atMidnight(new Date()) - atMidnight(new Date(`${dateStr}T00:00:00`))) / DAY_MS);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

// ---- Date-grid helpers (moved from calendar/state.js — see header note) ----
export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
export function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
}
export function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}
export function todayDate() {
  return atMidnight(new Date());
}
export function dateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function todayKey() {
  return dateKey(todayDate());
}

// 42-cell grid (6 full weeks) so month height stays consistent regardless of
// how many days the month actually has or which day it starts on.
export function monthGridDays(monthDate) {
  const first = startOfMonth(monthDate);
  const startPadding = first.getDay();
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startPadding);

  const days = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push({ date: d, key: dateKey(d), inCurrentMonth: d.getMonth() === monthDate.getMonth(), isWeekend: d.getDay() === 0 || d.getDay() === 6 });
  }
  return days;
}

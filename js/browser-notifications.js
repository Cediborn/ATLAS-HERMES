// Atlas — Browser notifications.
// Thin opt-in layer over the Web Notifications API. Permission is only ever
// requested from the explicit Settings toggle — never on page load — and the
// notifications themselves are the same real, data-computed items shown in
// the in-app panel (js/notifications.js). Nothing is fabricated, and every
// failure is swallowed so a blocked notification can never break the app.

import { computeNotifications } from './notifications.js';

const PREF_KEY = 'atlas:browserNotifs';
const SENT_KEY = 'atlas:notifSent';
const MAX_PER_SYNC = 5;

export function notificationsEnabled() {
  try {
    return localStorage.getItem(PREF_KEY) === 'on';
  } catch {
    return false;
  }
}

// Turns the feature on/off. Only this function ever calls requestPermission,
// and only when the user actively flips the toggle on.
export async function setNotificationsEnabled(on) {
  if (!on) {
    try { localStorage.setItem(PREF_KEY, 'off'); } catch { /* ignore */ }
    return 'off';
  }
  if (!('Notification' in window)) {
    try { localStorage.setItem(PREF_KEY, 'off'); } catch { /* ignore */ }
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    try { localStorage.setItem(PREF_KEY, 'on'); } catch { /* ignore */ }
    return 'granted';
  }
  if (Notification.permission === 'denied') {
    try { localStorage.setItem(PREF_KEY, 'off'); } catch { /* ignore */ }
    return 'denied';
  }
  // permission === 'default' → ask now, directly from this user action.
  const result = await Notification.requestPermission();
  if (result === 'granted') {
    try { localStorage.setItem(PREF_KEY, 'on'); } catch { /* ignore */ }
    return 'granted';
  }
  try { localStorage.setItem(PREF_KEY, 'off'); } catch { /* ignore */ }
  return result === 'denied' ? 'denied' : 'dismissed';
}

function sentSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SENT_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function persistSent(set) {
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify([...set].slice(-200)));
  } catch {
    // storage unavailable — each sync may re-notify, acceptable degradation
  }
}

function routeFor(kind) {
  return (
    {
      event: '#/calendar',
      project: '#/projects',
      task: '#/projects',
      goal: '#/goals',
      habit: '#/habits',
    }[kind] || '#/dashboard'
  );
}

// Sends system notifications for unread items not already notified (each item
// is notified once). Called on boot and whenever the tab becomes visible
// again, so new items that arrived while the tab was hidden get surfaced.
export function syncBrowserNotifications() {
  if (!notificationsEnabled()) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const sent = sentSet();
  let count = 0;
  for (const n of computeNotifications()) {
    if (count >= MAX_PER_SYNC) break;
    if (sent.has(n.id)) continue;
    sent.add(n.id);
    count += 1;
    try {
      const notif = new Notification('Atlas', {
        body: n.text,
        tag: n.id,
        icon: '../assets/favicon.svg',
      });
      notif.onclick = () => {
        window.focus();
        location.hash = routeFor(n.kind);
        notif.close();
      };
    } catch {
      // Notification construction failed — never break the app over it.
    }
  }
  if (count) persistSent(sent);
}

// Atlas — Topbar component: date, page title, notifications, profile.
// Notifications are computed live from real user data (js/notifications.js);
// the profile comes from the persisted meta store.

import { icon } from './icons.js';
import { createPopover } from './popover.js';
import { getProfile } from './persistence.js';
import { computeNotifications, markNotificationRead, markAllRead } from './notifications.js';

export function initTopbar() {
  renderDate();
  renderProfileTrigger();
  initNotifications();
  initProfileMenu();
}

export function setPageTitle(title) {
  document.getElementById('page-title').textContent = title;
  document.title = `${title} · Atlas`;
}

function renderDate() {
  const el = document.getElementById('current-date');
  el.textContent = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

function renderProfileTrigger() {
  document.getElementById('profile-trigger').innerHTML =
    `<span class="avatar avatar--md">${getProfile().initials}</span>`;
}

function initNotifications() {
  const trigger = document.getElementById('notifications-trigger');
  const panel = document.getElementById('notifications-panel');
  const dot = trigger.querySelector('.icon-btn__dot');

  function updateDot() {
    if (dot) dot.hidden = !computeNotifications().some((n) => n.unread);
  }

  function renderPanel() {
    const items = computeNotifications();
    panel.innerHTML = `
      <div class="menu__label">Notifications</div>
      ${items.length
        ? items
            .map(
              (n) => `
            <div class="notification-item" data-id="${n.id}">
              <span class="notification-item__dot${n.unread ? '' : ' is-read'}"></span>
              <span class="notification-item__body">
                <span class="notification-item__text">${n.text}</span>
                <span class="notification-item__time">${n.time}</span>
              </span>
            </div>`
            )
            .join('')
        : '<div class="notification-empty">Nothing needs your attention right now.</div>'}
      ${
        items.length
          ? `<div class="menu__divider"></div><button type="button" class="menu__item" id="notif-mark-all">${icon('check', { size: 16 })}<span>Mark all as read</span></button>`
          : ''
      }
    `;
  }

  panel.addEventListener('click', (e) => {
    const row = e.target.closest('.notification-item');
    if (row) {
      markNotificationRead(row.dataset.id);
      row.querySelector('.notification-item__dot').classList.add('is-read');
      updateDot();
      return;
    }
    if (e.target.closest('#notif-mark-all')) {
      markAllRead();
      renderPanel();
      updateDot();
    }
  });

  createPopover({ trigger, panel, onOpenRender: renderPanel });
  updateDot();
}

function initProfileMenu() {
  const trigger = document.getElementById('profile-trigger');
  const menu = document.getElementById('profile-menu');
  const profile = getProfile();

  function renderMenu() {
    menu.innerHTML = `
      <div class="menu__label">${profile.name}</div>
      <div class="menu__meta">${profile.email}</div>
      <div class="menu__divider"></div>
      <a href="#/settings" class="menu__item">${icon('settings', { size: 18 })}<span>Settings</span></a>
      <button type="button" class="menu__item" id="shortcuts-trigger">${icon('search', { size: 18 })}<span>Keyboard shortcuts</span></button>
    `;
  }

  const popover = createPopover({ trigger, panel: menu, onOpenRender: renderMenu });

  menu.addEventListener('click', (e) => {
    if (e.target.closest('#shortcuts-trigger')) {
      popover.close();
      document.getElementById('search-trigger').click();
    } else if (e.target.closest('a')) {
      popover.close();
    }
  });
}

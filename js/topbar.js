// Atlas — Topbar component: date, page title, notifications, profile.

import { icon } from './icons.js';
import { createPopover } from './popover.js';
import { currentUser, notifications } from './mock-data.js';

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
    `<span class="avatar avatar--md">${currentUser.initials}</span>`;
}

function initNotifications() {
  const trigger = document.getElementById('notifications-trigger');
  const panel = document.getElementById('notifications-panel');
  const dot = trigger.querySelector('.icon-btn__dot');

  function updateDot() {
    if (dot) dot.hidden = !notifications.some((n) => n.unread);
  }

  function renderPanel() {
    panel.innerHTML = `
      <div class="menu__label">Notifications</div>
      ${notifications
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
        .join('')}
    `;
  }

  panel.addEventListener('click', (e) => {
    const row = e.target.closest('.notification-item');
    if (!row) return;
    const item = notifications.find((n) => String(n.id) === row.dataset.id);
    if (item) {
      item.unread = false;
      row.querySelector('.notification-item__dot').classList.add('is-read');
      updateDot();
    }
  });

  createPopover({ trigger, panel, onOpenRender: renderPanel });
  updateDot();
}

function initProfileMenu() {
  const trigger = document.getElementById('profile-trigger');
  const menu = document.getElementById('profile-menu');

  function renderMenu() {
    menu.innerHTML = `
      <div class="menu__label">${currentUser.name}</div>
      <div class="menu__meta">${currentUser.email}</div>
      <div class="menu__divider"></div>
      <a href="#/settings" class="menu__item">${icon('settings', { size: 18 })}<span>Settings</span></a>
      <button type="button" class="menu__item" id="shortcuts-trigger">${icon('search', { size: 18 })}<span>Keyboard shortcuts</span></button>
    `;
  }

  const popover = createPopover({ trigger, panel: menu, onOpenRender: renderMenu });

  // Anything actionable in this menu completes the interaction, so close on click.
  menu.addEventListener('click', (e) => {
    if (e.target.closest('#shortcuts-trigger')) {
      popover.close();
      document.getElementById('search-trigger').click(); // reuse the palette's own open logic rather than duplicating it
    } else if (e.target.closest('a')) {
      popover.close();
    }
  });
}

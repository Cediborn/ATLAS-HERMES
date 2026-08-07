// Atlas — Sidebar component.
// Renders nav from config, and owns every sidebar-only interaction:
// mobile drawer, desktop icon-rail collapse, workspace switcher.

import { icon } from './icons.js';
import { getState, setState } from './store.js';
import { workspaces } from './mock-data.js';
import { createPopover } from './popover.js';

const MOBILE_BREAKPOINT = 768;

export function renderNav(navItems) {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = navItems
    .map(
      (item) => `
      <a href="#/${item.id}" class="nav-link" data-route="${item.id}" title="${item.label}">
        ${icon(item.icon, { size: 19 })}
        <span class="nav-link__label">${item.label}</span>
        ${item.phase ? `<span class="nav-link__phase">P${item.phase}</span>` : ''}
      </a>`
    )
    .join('');
}

export function setActiveRoute(routeId) {
  document.querySelectorAll('.nav-link').forEach((a) => {
    if (a.dataset.route === routeId) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

export function initSidebarControls() {
  const appShell = document.querySelector('.app-shell');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const collapseToggle = document.getElementById('sidebar-collapse-toggle');

  if (getState().sidebarCollapsed) appShell.dataset.sidebar = 'collapsed';

  collapseToggle.addEventListener('click', () => toggleCollapse(appShell, collapseToggle));

  function openMobile() {
    setState({ sidebarOpen: true });
    sidebar.classList.add('is-open');
    backdrop.classList.add('is-open');
    mobileToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    sidebar.querySelector('.nav-link')?.focus();
  }

  function closeMobile() {
    setState({ sidebarOpen: false });
    sidebar.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    mobileToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    mobileToggle.focus();
  }

  mobileToggle.addEventListener('click', () => {
    getState().sidebarOpen ? closeMobile() : openMobile();
  });
  backdrop.addEventListener('click', closeMobile);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && getState().sidebarOpen) closeMobile();
  });
  document.getElementById('sidebar-nav').addEventListener('click', (e) => {
    if (e.target.closest('.nav-link') && window.innerWidth <= MOBILE_BREAKPOINT) closeMobile();
  });

  // Resizing past the breakpoint with the drawer open would leave the body
  // scroll-locked and the drawer flagged open — force a clean close.
  const desktopQuery = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT + 1}px)`);
  const handleDesktopResize = () => {
    if (desktopQuery.matches && getState().sidebarOpen) closeMobile();
  };
  if (desktopQuery.addEventListener) desktopQuery.addEventListener('change', handleDesktopResize);
  else desktopQuery.addListener(handleDesktopResize);

  initWorkspaceSwitcher();
}

function toggleCollapse(appShell, collapseToggle) {
  const collapsed = !getState().sidebarCollapsed;
  setState({ sidebarCollapsed: collapsed });
  appShell.dataset.sidebar = collapsed ? 'collapsed' : 'expanded';
  collapseToggle.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
}

function initWorkspaceSwitcher() {
  const trigger = document.getElementById('workspace-trigger');
  const menu = document.getElementById('workspace-menu');
  const nameEl = trigger.querySelector('.workspace-switcher__name');
  const badgeEl = trigger.querySelector('.workspace-switcher__badge');

  function renderMenu() {
    menu.setAttribute('role', 'listbox');
    menu.innerHTML = workspaces
      .map(
        (w) => `
        <button class="menu__item" role="option" data-id="${w.id}" aria-selected="${w.id === getState().workspaceId}">
          <span class="workspace-switcher__badge" style="width:20px;height:20px;font-size:10px;flex-shrink:0;">${w.badge}</span>
          <span>${w.name}</span>
        </button>`
      )
      .join('');
  }

  function applyActive() {
    const active = workspaces.find((w) => w.id === getState().workspaceId) || workspaces[0];
    nameEl.textContent = active.name;
    badgeEl.textContent = active.badge;
  }

  const popover = createPopover({ trigger, panel: menu, onOpenRender: renderMenu });

  menu.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-id]');
    if (btn) {
      setState({ workspaceId: btn.dataset.id });
      applyActive();
      popover.close();
    }
  });

  applyActive();
}

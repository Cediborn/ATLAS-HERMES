// Atlas — Sidebar component.
// Renders nav from config, and owns every sidebar-only interaction:
// mobile drawer, desktop icon-rail collapse, workspace switcher.
//
// Navigation items are grouped (Plan/Learn/Capture/Life) per the consolidated
// information architecture. Books and Coding are removed as standalone entries.

import { icon } from './icons.js';
import { getState, setState } from './store.js';
import { workspaces } from './config.js';
import { createPopover } from './popover.js';

const MOBILE_BREAKPOINT = 768;

// Brand mark — the Atlas logo (dark tile + gold nested triangles). Used as the
// workspace avatar in the sidebar trigger and the workspace switcher menu.
const LOGO_SVG =
  '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#1E1E1E"/><polygon points="16,5 5.5,26.5 26.5,26.5" fill="none" stroke="#E6C66D" stroke-width="1.5" stroke-linejoin="round"/><polygon points="16,10 10.75,21.5 21.25,21.5" fill="none" stroke="#E6C66D" stroke-width="3.5" stroke-linejoin="round"/><polygon points="16,15.5 11.9,19.3 20.1,19.3" fill="#E6C66D"/></svg>';

export function renderNav(navItems) {
  const nav = document.getElementById('sidebar-nav');
  let html = '';
  let lastGroup = null;

  for (const item of navItems) {
    // Render group label when the group changes (except for ungrouped items)
    if (item.group && item.group !== lastGroup) {
      lastGroup = item.group;
      html += `<li class="nav-group__label" aria-hidden="true">${item.group}</li>`;
    } else if (!item.group) {
      // When moving from grouped to ungrouped (e.g. Dashboard), reset
      lastGroup = null;
    }

    html += `
      <li>
        <a href="#/${item.id}" class="nav-link" data-route="${item.id}" title="${item.label}">
          ${icon(item.icon, { size: 19 })}
          <span class="nav-link__label">${item.label}</span>
          ${item.phase ? `<span class="nav-link__phase">P${item.phase}</span>` : ''}
        </a>
      </li>`;
  }

  nav.innerHTML = html;
}

export function setActiveRoute(routeId) {
  document.querySelectorAll('.nav-link').forEach((a) => {
    if (a.dataset.route === routeId) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

let onWorkspaceChangeCb = null;

export function initSidebarControls({ onWorkspaceChange } = {}) {
  onWorkspaceChangeCb = onWorkspaceChange || null;
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
          <span class="workspace-switcher__badge" style="width:20px;height:20px;flex-shrink:0;">${LOGO_SVG}</span>
          <span>${w.name}</span>
        </button>`
      )
      .join('');
  }

  function applyActive() {
    const active = workspaces.find((w) => w.id === getState().workspaceId) || workspaces[0];
    nameEl.textContent = active.name;
    badgeEl.innerHTML = LOGO_SVG;
  }

  const popover = createPopover({ trigger, panel: menu, onOpenRender: renderMenu });

  menu.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-id]');
    if (btn) {
      const nextId = btn.dataset.id;
      if (nextId === getState().workspaceId) {
        popover.close();
        return;
      }
      popover.close();
      // Persistence re-hydrates every in-memory array for the new workspace,
      // then the router re-renders — real data context switching.
      await onWorkspaceChangeCb?.(nextId);
      applyActive();
    }
  });

  applyActive();
}

// Atlas — Projects page controller. This is the only file in the module that
// touches the DOM or wires events; data.js/state.js/components.js stay pure.

import { icon } from '../icons.js';
import { createPopover } from '../popover.js';
import { Badge, emptyState } from '../components.js';
import { projects, STATUSES, PRIORITIES, ALL_TAGS, person } from './data.js';
import { getState, setState, getVisibleProjects, invalidateVisibleProjectsCache, resetFilters, SORT_OPTIONS, formatDate, timeAgo } from './state.js';
import { ProjectCard, ProjectSkeleton, ProjectEmptyState, ProjectHeader, ProjectProgress } from './components.js';

export function renderProjects(container) {
  container.innerHTML = `
    <div class="projects-page">
      <div class="projects-toolbar">
        <label class="toolbar-search" for="projects-search">
          ${icon('search', { size: 16 })}
          <input type="text" id="projects-search" placeholder="Search projects\u2026" autocomplete="off" />
        </label>

        <button type="button" class="btn btn--primary projects-toolbar__new" id="projects-new">
          ${icon('folder', { size: 16 })}<span>New Project</span>
        </button>

        <div class="toolbar-spacer"></div>

        <div class="view-switcher" role="tablist" aria-label="View">
          <button type="button" class="view-switcher__option is-active" role="tab" aria-selected="true">${icon('grid', { size: 15 })}<span>Grid</span></button>
          <button type="button" class="view-switcher__option" role="tab" aria-selected="false" disabled title="Coming in the next milestone">${icon('layers', { size: 15 })}<span>List</span></button>
          <button type="button" class="view-switcher__option" role="tab" aria-selected="false" disabled title="Coming in the next milestone">${icon('layers', { size: 15 })}<span>Board</span></button>
        </div>

        <div class="toolbar-popover">
          <button type="button" class="btn btn--secondary" id="projects-filter-trigger">
            ${icon('filter', { size: 15 })}<span>Filter</span><span class="badge badge--accent" id="filter-count" hidden></span>
          </button>
          <div class="menu projects-filter-panel" id="projects-filter-panel" hidden></div>
        </div>

        <div class="toolbar-popover">
          <button type="button" class="btn btn--secondary" id="projects-sort-trigger">${icon('sort', { size: 15 })}<span>Sort</span></button>
          <div class="menu" id="projects-sort-panel" hidden></div>
        </div>

        <div class="toolbar-popover">
          <button type="button" class="icon-btn" id="projects-more-trigger" aria-label="More actions">${icon('moreHorizontal', { size: 18 })}</button>
          <div class="menu menu--right" id="projects-more-panel" hidden></div>
        </div>
      </div>

      <div class="projects-grid" id="projects-grid"></div>
    </div>

    <div class="overlay project-detail-overlay" id="project-detail-overlay" hidden>
      <aside class="project-detail-panel" role="dialog" aria-modal="true" aria-label="Project details" id="project-detail-panel"></aside>
    </div>
  `;

  initToolbar();
  initGridInteractions(document.getElementById('projects-grid'));
  initDetailPanel();
  updateFilterCount();
  renderGrid();
}

// Shown briefly by the router while the projects.js chunk itself is still
// being fetched — a real loading state for a real (if brief) async gap, not decoration.
export function renderProjectsSkeleton(container) {
  container.innerHTML = `<div class="projects-page"><div class="projects-grid">${ProjectSkeleton({ count: 6 })}</div></div>`;
}

// ================= GRID =================
function renderGrid() {
  const grid = document.getElementById('projects-grid');
  const visible = getVisibleProjects(projects, getState());
  if (!visible.length) {
    grid.classList.add('projects-grid--empty');
    grid.innerHTML = ProjectEmptyState({ hasFilters: hasActiveFilters() });
    return;
  }
  grid.classList.remove('projects-grid--empty');
  grid.innerHTML = visible.map((p) => ProjectCard({ project: p })).join('');
}

function hasActiveFilters() {
  const f = getState();
  return Boolean(f.search || f.statusFilter.size || f.priorityFilter.size || f.tagFilter.size || f.favoritesOnly);
}

// ================= GRID INTERACTIONS (delegated — survives every re-render) =================
function initGridInteractions(grid) {
  grid.addEventListener('click', (e) => {
    const actionItem = e.target.closest('[data-action]');
    if (actionItem) {
      handleCardAction(actionItem.closest('.action-menu'), actionItem.dataset.action);
      closeAllActionMenus();
      return;
    }

    const menuTrigger = e.target.closest('.action-menu__trigger');
    if (menuTrigger) {
      const panel = menuTrigger.nextElementSibling;
      const wasOpen = !panel.hidden;
      closeAllActionMenus();
      if (!wasOpen) {
        panel.hidden = false;
        menuTrigger.setAttribute('aria-expanded', 'true');
      }
      return;
    }

    const tagBtn = e.target.closest('.tag-chip');
    if (tagBtn) {
      setState({ tagFilter: new Set([tagBtn.dataset.tag]) });
      renderGrid();
      updateFilterCount();
      return;
    }

    const card = e.target.closest('.project-card');
    if (card) openDetail(card.dataset.id);
  });

  grid.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('project-card')) {
      e.preventDefault();
      openDetail(e.target.dataset.id);
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.action-menu')) closeAllActionMenus();
  });
}

function closeAllActionMenus() {
  document.querySelectorAll('.action-menu__panel').forEach((p) => { p.hidden = true; });
  document.querySelectorAll('.action-menu__trigger').forEach((b) => b.setAttribute('aria-expanded', 'false'));
}

function handleCardAction(menuEl, action) {
  const trigger = menuEl?.querySelector('.action-menu__trigger');
  const p = projects.find((pr) => pr.id === trigger?.dataset.id);
  if (!p) return;
  if (action === 'favorite') p.favorite = !p.favorite;
  else if (action === 'pin') p.pinned = !p.pinned;
  else if (action === 'archive') p.status = p.status === 'Archived' ? 'Not Started' : 'Archived';
  invalidateVisibleProjectsCache();
  renderGrid();
}

// ================= TOOLBAR =================
function initToolbar() {
  const searchInput = document.getElementById('projects-search');
  searchInput.addEventListener('input', () => {
    setState({ search: searchInput.value });
    renderGrid();
  });

  document.getElementById('projects-new').addEventListener('click', () => {
    // No create-project backend exists yet — opens quick-capture instead of a dead button.
    document.getElementById('search-trigger').click();
  });

  initFilterPopover();
  initSortPopover();
  initMorePopover();
}

function filterCheckbox(type, value, checked, label) {
  return `
    <label class="menu__item filter-checkbox">
      <input type="checkbox" data-filter-type="${type}" value="${value || ''}" ${checked ? 'checked' : ''} />
      <span>${label || value}</span>
    </label>`;
}

function toggleSetFilter(key, value, checked) {
  const current = new Set(getState()[key]);
  if (checked) current.add(value);
  else current.delete(value);
  setState({ [key]: current });
}

function initFilterPopover() {
  const trigger = document.getElementById('projects-filter-trigger');
  const panel = document.getElementById('projects-filter-panel');

  function render() {
    const f = getState();
    panel.innerHTML = `
      <div class="menu__label">Status</div>
      ${STATUSES.filter((s) => s !== 'Archived').map((s) => filterCheckbox('status', s, f.statusFilter.has(s))).join('')}
      <div class="menu__divider"></div>
      <div class="menu__label">Priority</div>
      ${PRIORITIES.map((p) => filterCheckbox('priority', p, f.priorityFilter.has(p))).join('')}
      <div class="menu__divider"></div>
      <div class="menu__label">Tags</div>
      ${ALL_TAGS.map((t) => filterCheckbox('tag', t, f.tagFilter.has(t))).join('')}
      <div class="menu__divider"></div>
      ${filterCheckbox('favoritesOnly', '', f.favoritesOnly, 'Favorites only')}
      ${filterCheckbox('showArchived', '', f.showArchived, 'Show archived')}
      <div class="menu__divider"></div>
      <button type="button" class="menu__item" id="filter-clear">${icon('x', { size: 16 })}<span>Clear filters</span></button>
    `;
  }

  createPopover({ trigger, panel, onOpenRender: render });

  panel.addEventListener('change', (e) => {
    const cb = e.target;
    const type = cb.dataset.filterType;
    if (type === 'status') toggleSetFilter('statusFilter', cb.value, cb.checked);
    else if (type === 'priority') toggleSetFilter('priorityFilter', cb.value, cb.checked);
    else if (type === 'tag') toggleSetFilter('tagFilter', cb.value, cb.checked);
    else if (type === 'favoritesOnly') setState({ favoritesOnly: cb.checked });
    else if (type === 'showArchived') setState({ showArchived: cb.checked });
    renderGrid();
    updateFilterCount();
  });

  panel.addEventListener('click', (e) => {
    if (e.target.closest('#filter-clear')) {
      resetFilters();
      render();
      renderGrid();
      updateFilterCount();
    }
  });
}

function updateFilterCount() {
  const f = getState();
  const count = f.statusFilter.size + f.priorityFilter.size + f.tagFilter.size + (f.favoritesOnly ? 1 : 0);
  const badge = document.getElementById('filter-count');
  badge.hidden = count === 0;
  badge.textContent = String(count);
}

function initSortPopover() {
  const trigger = document.getElementById('projects-sort-trigger');
  const panel = document.getElementById('projects-sort-panel');

  function render() {
    const current = getState().sortBy;
    panel.innerHTML = SORT_OPTIONS.map(
      (opt) => `
      <button type="button" class="menu__item" data-sort="${opt.id}" aria-selected="${opt.id === current}">
        ${opt.id === current ? icon('check', { size: 16 }) : '<span class="menu__item-spacer"></span>'}
        <span>${opt.label}</span>
      </button>`
    ).join('');
  }

  const popover = createPopover({ trigger, panel, onOpenRender: render });

  panel.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sort]');
    if (btn) {
      setState({ sortBy: btn.dataset.sort });
      renderGrid();
      popover.close();
    }
  });
}

function initMorePopover() {
  const trigger = document.getElementById('projects-more-trigger');
  const panel = document.getElementById('projects-more-panel');

  function render() {
    panel.innerHTML = `<button type="button" class="menu__item" id="more-shortcuts">${icon('search', { size: 16 })}<span>Keyboard shortcuts</span></button>`;
  }

  const popover = createPopover({ trigger, panel, onOpenRender: render });

  panel.addEventListener('click', (e) => {
    if (e.target.closest('#more-shortcuts')) {
      popover.close();
      document.getElementById('search-trigger').click();
    }
  });
}

// ================= DETAIL PANEL =================
let lastFocusedBeforeDetail = null;

function initDetailPanel() {
  const overlay = document.getElementById('project-detail-overlay');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDetail();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) closeDetail();
  });
}

function openDetail(projectId) {
  const p = projects.find((pr) => pr.id === projectId);
  if (!p) return;
  lastFocusedBeforeDetail = document.activeElement;
  const overlay = document.getElementById('project-detail-overlay');
  const panel = document.getElementById('project-detail-panel');
  panel.innerHTML = renderDetailContent(p);
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  const closeBtn = panel.querySelector('#detail-close');
  closeBtn.addEventListener('click', closeDetail);
  closeBtn.focus();
}

function closeDetail() {
  const overlay = document.getElementById('project-detail-overlay');
  overlay.hidden = true;
  document.body.style.overflow = '';
  lastFocusedBeforeDetail?.focus?.();
}

function renderDetailContent(p) {
  return `
    <button type="button" class="icon-btn project-detail-panel__close" id="detail-close" aria-label="Close panel">${icon('x', { size: 18 })}</button>
    <div class="project-detail-panel__scroll">
      ${ProjectHeader({ project: p })}
      <p class="project-detail-panel__desc">${p.description}</p>

      ${detailSection(
        'Progress',
        `
        <div class="project-detail-panel__progress-row">
          ${ProjectProgress({ percentage: p.progress, variant: 'ring', size: 56 })}
          <div class="project-detail-panel__progress-copy">
            <div>${p.completedTaskCount} of ${p.taskCount} tasks complete</div>
            ${p.estimatedCompletion ? `<div class="project-detail-panel__muted">Est. completion ${formatDate(p.estimatedCompletion)}</div>` : ''}
          </div>
        </div>
        ${ProjectProgress({ percentage: p.progress, variant: 'milestone' })}`
      )}

      ${detailSection('Members', `<div class="project-detail-panel__members">${p.members.map((id) => memberRow(id, id === p.owner)).join('')}</div>`)}

      ${detailSection(
        'Timeline',
        `
        <div class="settings-row"><span class="settings-row__body">Created</span><span>${formatDate(p.createdAt)}</span></div>
        <div class="settings-row"><span class="settings-row__body">Last updated</span><span>${timeAgo(p.updatedAt)}</span></div>
        ${p.deadline ? `<div class="settings-row"><span class="settings-row__body">Deadline</span><span>${formatDate(p.deadline)}</span></div>` : ''}`
      )}

      ${detailSection('Recent Activity', activityFeed(p))}

      ${detailSection(
        'Statistics',
        `<div class="project-detail-panel__stats-grid">
          ${statBlock(p.taskCount, 'Tasks')}
          ${statBlock(p.completedTaskCount, 'Completed')}
          ${statBlock(p.attachmentsCount, 'Attachments')}
          ${statBlock(p.notesCount, 'Notes')}
        </div>`
      )}

      ${detailSection(
        'Notes',
        p.notesCount
          ? `<p class="project-detail-panel__muted">${p.notesCount} note${p.notesCount === 1 ? '' : 's'} attached to this project.</p>`
          : emptyState({ icon: 'fileText', title: 'No notes yet', description: 'Capture your ideas.', size: 'sm' })
      )}

      ${detailSection(
        'Attachments',
        p.attachmentsCount
          ? `<p class="project-detail-panel__muted">${p.attachmentsCount} file${p.attachmentsCount === 1 ? '' : 's'} attached.</p>`
          : emptyState({ icon: 'folder', title: 'No attachments yet', description: 'Files you attach will show up here.', size: 'sm' })
      )}
    </div>`;
}

function detailSection(title, content) {
  return `<section class="project-detail-panel__section"><h4>${title}</h4>${content}</section>`;
}

function memberRow(id, isOwner) {
  const m = person(id);
  return `
    <div class="settings-row">
      <span class="avatar avatar--sm">${m.initials}</span>
      <span class="settings-row__body">${m.name}</span>
      ${isOwner ? Badge({ label: 'Owner', variant: 'accent' }) : ''}
    </div>`;
}

function statBlock(value, label) {
  return `<div class="project-detail-panel__stat"><span class="project-detail-panel__stat-value">${value}</span><span class="project-detail-panel__stat-label">${label}</span></div>`;
}

function activityFeed(p) {
  // Synthesized from real fields (status/progress/lastActivity) rather than a
  // separate invented activity log — this genuinely describes what happened.
  const items = [
    `${p.status === 'Completed' ? 'Marked complete' : `Progress updated to ${p.progress}%`} \u2014 ${timeAgo(p.lastActivity)}`,
    `${p.completedTaskCount} of ${p.taskCount} tasks done`,
  ];
  if (p.status === 'Blocked') items.unshift('Marked as blocked \u2014 waiting on input');
  return `<div class="project-detail-panel__activity">${items.map((t) => `<div class="project-detail-panel__activity-item">${t}</div>`).join('')}</div>`;
}

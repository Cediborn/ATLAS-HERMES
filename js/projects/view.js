// Atlas — Projects page controller. This is the only file in the module that
// touches the DOM or wires events; data.js/state.js/components.js stay pure.

import { icon } from '../icons.js';
import { createPopover } from '../popover.js';
import { Badge, emptyState } from '../components.js';
import { saveProjects } from '../persistence.js';
import { projects, STATUSES, PRIORITIES, allProjectTags, person } from './data.js';
import { getState, setState, getVisibleProjects, invalidateVisibleProjectsCache, resetFilters, SORT_OPTIONS, formatDate, timeAgo } from './state.js';
import { ProjectCard, ProjectSkeleton, ProjectEmptyState, ProjectHeader, ProjectProgress } from './components.js';
import { openProjectDialog } from './dialog.js';
import { goals } from '../goals/data.js';
import { resources } from '../learning/data.js';
import { computeResourceProgress } from '../learning/state.js';
import { getEventsInRange } from '../calendar/repository.js';
import { daysUntil } from '../date-utils.js';

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

function refreshAfterMutation() {
  invalidateVisibleProjectsCache();
  renderGrid();
  updateFilterCount();
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
  saveProjects();
  refreshAfterMutation();
}

// ================= TOOLBAR =================
function initToolbar() {
  const searchInput = document.getElementById('projects-search');
  searchInput.addEventListener('input', () => {
    setState({ search: searchInput.value });
    renderGrid();
  });

  document.getElementById('projects-new').addEventListener('click', () => {
    openProjectDialog('create', null, refreshAfterMutation);
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
    const tags = allProjectTags();
    panel.innerHTML = `
      <div class="menu__label">Status</div>
      ${STATUSES.filter((s) => s !== 'Archived').map((s) => filterCheckbox('status', s, f.statusFilter.has(s))).join('')}
      <div class="menu__divider"></div>
      <div class="menu__label">Priority</div>
      ${PRIORITIES.map((p) => filterCheckbox('priority', p, f.priorityFilter.has(p))).join('')}
      <div class="menu__divider"></div>
      <div class="menu__label">Tags</div>
      ${tags.map((t) => filterCheckbox('tag', t, f.tagFilter.has(t))).join('')}
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
let detailProjectId = null;

function initDetailPanel() {
  const overlay = document.getElementById('project-detail-overlay');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDetail();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) closeDetail();
  });
  document.getElementById('project-detail-panel').addEventListener('click', onDetailClick);
  document.getElementById('project-detail-panel').addEventListener('submit', onTaskSubmit);
}

function openDetail(projectId) {
  const p = projects.find((pr) => pr.id === projectId);
  if (!p) return;
  detailProjectId = projectId;
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
  detailProjectId = null;
  lastFocusedBeforeDetail?.focus?.();
}

function refreshDetail() {
  const panel = document.getElementById('project-detail-panel');
  const p = projects.find((pr) => pr.id === detailProjectId);
  if (!p) return;
  const scrollEl = panel.querySelector('.project-detail-panel__scroll');
  const scrollTop = scrollEl?.scrollTop || 0;
  panel.innerHTML = renderDetailContent(p);
  const closeBtn = panel.querySelector('#detail-close');
  closeBtn.addEventListener('click', closeDetail);
  closeBtn.focus();
  if (scrollEl) scrollEl.scrollTop = scrollTop;
}

function taskId() {
  return `tk${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function onDetailClick(e) {
  const check = e.target.closest('[data-task-toggle]');
  if (check) {
    const p = projects.find((pr) => pr.id === detailProjectId);
    const task = p?.tasks?.find((t) => t.id === check.dataset.taskToggle);
    if (p && task) {
      task.done = !task.done;
      recomputeAndSave(p);
    }
    return;
  }

  const del = e.target.closest('[data-task-delete]');
  if (del) {
    const p = projects.find((pr) => pr.id === detailProjectId);
    if (p && p.tasks) {
      const idx = p.tasks.findIndex((t) => t.id === del.dataset.taskDelete);
      if (idx !== -1) p.tasks.splice(idx, 1);
      recomputeAndSave(p);
    }
    return;
  }

  const edit = e.target.closest('#detail-edit');
  if (edit) {
    const p = projects.find((pr) => pr.id === detailProjectId);
    if (p) openProjectDialog('edit', p, () => { refreshDetail(); refreshAfterMutation(); });
    return;
  }

  const remove = e.target.closest('#detail-delete');
  if (remove) {
    const p = projects.find((pr) => pr.id === detailProjectId);
    if (p && window.confirm(`Delete "${p.title}"? This can\u2019t be undone.`)) {
      const idx = projects.findIndex((x) => x.id === p.id);
      if (idx !== -1) projects.splice(idx, 1);
      saveProjects();
      closeDetail();
      refreshAfterMutation();
    }
  }
}

function onTaskSubmit(e) {
  if (!e.target.matches('#task-add-form')) return;
  e.preventDefault();
  const p = projects.find((pr) => pr.id === detailProjectId);
  if (!p) return;
  const input = document.getElementById('task-add-input');
  const dueInput = document.getElementById('task-add-due');
  const title = input.value.trim();
  if (!title) return;
  if (!p.tasks) p.tasks = [];
  p.tasks.push({ id: taskId(), title, done: false, due: dueInput?.value || null, createdAt: new Date().toISOString().slice(0, 10) });
  input.value = '';
  if (dueInput) dueInput.value = '';
  recomputeAndSave(p);
}

function recomputeAndSave(p) {
  const done = (p.tasks || []).filter((t) => t.done).length;
  p.taskCount = (p.tasks || []).length;
  p.completedTaskCount = done;
  p.progress = p.taskCount ? Math.round((done / p.taskCount) * 100) : 0;
  p.updatedAt = new Date().toISOString().slice(0, 10);
  p.lastActivity = p.updatedAt;
  saveProjects();
  invalidateVisibleProjectsCache();
  refreshDetail();
  renderGrid();
}

function renderDetailContent(p) {
  const tasks = p.tasks || [];
  const doneTasks = tasks.filter((t) => t.done).length;
  
  // Related items
  const linkedGoal = p.linkedGoalId ? goals.find((g) => g.id === p.linkedGoalId) : null;
  const linkedResources = (p.linkedResourceIds || []).map((id) => resources.find((r) => r.id === id)).filter(Boolean);
  
  // Scheduled tasks (tasks with due dates)
  const scheduledTasks = tasks.filter((t) => t.due && !t.done);
  const overdueTasks = tasks.filter((t) => t.due && !t.done && daysUntil(t.due) < 0);
  
  const tasksBody = tasks.length
    ? `
      <div class="project-tasks">
        ${tasks
          .map(
            (t) => `
          <div class="project-task${t.done ? ' is-done' : ''}">
            <button type="button" class="project-task__check" data-task-toggle="${t.id}" role="checkbox" aria-checked="${t.done}" aria-label="Toggle ${t.title}">${t.done ? icon('check', { size: 12 }) : ''}</button>
            <span class="project-task__title">${t.title}</span>
            <button type="button" class="icon-btn project-task__delete" data-task-delete="${t.id}" aria-label="Delete task">${icon('trash', { size: 14 })}</button>
          </div>`
          )
          .join('')}
      </div>
      <form class="project-task-add" id="task-add-form">
        <input id="task-add-input" type="text" placeholder="Add a task\u2026" aria-label="New task title" />
        <input id="task-add-due" type="date" aria-label="Task due date" />
        <button type="submit" class="btn btn--primary btn--sm">${icon('plus', { size: 14 })}<span>Add</span></button>
      </form>`
    : `
      <form class="project-task-add" id="task-add-form">
        <input id="task-add-input" type="text" placeholder="Add your first task\u2026" aria-label="New task title" />
        <input id="task-add-due" type="date" aria-label="Task due date" />
        <button type="submit" class="btn btn--primary btn--sm">${icon('plus', { size: 14 })}<span>Add</span></button>
      </form>`;

  return `
    <button type="button" class="icon-btn project-detail-panel__close" id="detail-close" aria-label="Close panel">${icon('x', { size: 18 })}</button>
    <div class="project-detail-panel__scroll">
      ${ProjectHeader({ project: p })}
      <div class="project-detail-panel__header-actions">
        <button type="button" class="btn btn--secondary" id="detail-edit">${icon('edit', { size: 15 })}<span>Edit</span></button>
        <button type="button" class="btn btn--secondary" id="detail-delete">${icon('trash', { size: 15 })}<span>Delete</span></button>
      </div>
      <p class="project-detail-panel__desc">${p.description || 'No description yet.'}</p>

      ${detailSection(
        'Progress',
        `
        <div class="project-detail-panel__progress-row">
          ${ProjectProgress({ percentage: p.progress, variant: 'ring', size: 56 })}
          <div class="project-detail-panel__progress-copy">
            <div>${p.completedTaskCount} of ${p.taskCount} task${p.taskCount === 1 ? '' : 's'} complete</div>
            ${p.estimatedCompletion ? `<div class="project-detail-panel__muted">Est. completion ${formatDate(p.estimatedCompletion)}</div>` : ''}
          </div>
        </div>
        ${ProjectProgress({ percentage: p.progress, variant: 'milestone' })}`
      )}

      ${detailSection('Tasks', tasksBody)}

      ${detailSection('Members', `<div class="project-detail-panel__members">${p.members.map((id) => memberRow(id, id === p.owner)).join('')}</div>`)}

      ${(linkedGoal || linkedResources.length) ? detailSection('Related', `
        <div class="goal-detail-panel__links">
          ${linkedGoal ? linkRow({ iconName: 'target', label: linkedGoal.title, sub: `Goal \u00b7 ${linkedGoal.status} \u00b7 ${linkedGoal.progress}%`, route: 'goals' }) : ''}
          ${linkedResources.map((r) => linkRow({ iconName: 'bookOpen', label: r.title, sub: `Learning \u00b7 ${r.type} \u00b7 ${computeResourceProgress(r)}%`, route: 'learning' })).join('')}
        </div>
      `) : ''}

      ${overdueTasks.length ? detailSection('Overdue Tasks', `
        <div class="project-tasks">
          ${overdueTasks.map((t) => `
            <div class="project-task">
              <span class="project-task__title">${t.title}</span>
              <span class="project-task__due project-task__due--overdue">${Math.abs(daysUntil(t.due))}d overdue</span>
            </div>
          `).join('')}
        </div>
      `) : ''}

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

function linkRow({ iconName, label, sub, route }) {
  return `
    <button type="button" class="goal-link" data-link-route="${route}">
      <span class="goal-link__icon">${icon(iconName, { size: 15 })}</span>
      <span class="goal-link__body">
        <span class="goal-link__title">${label}</span>
        <span class="goal-link__meta">${sub}</span>
      </span>
      ${icon('chevronRight', { size: 14, className: 'goal-link__chevron' })}
    </button>`;
}

function activityFeed(p) {
  const items = [
    `${p.status === 'Completed' ? 'Marked complete' : `Progress updated to ${p.progress}%`} \u2014 ${timeAgo(p.lastActivity)}`,
    `${p.completedTaskCount} of ${p.taskCount} tasks done`,
  ];
  if (p.status === 'Blocked') items.unshift('Marked as blocked \u2014 waiting on input');
  return `<div class="project-detail-panel__activity">${items.map((t) => `<div class="project-detail-panel__activity-item">${t}</div>`).join('')}</div>`;
}

// Atlas — Hash router. Hash-based on purpose: a path-based router would 404
// on hard refresh under GitHub Pages' static hosting without extra server
// config; `#/route` resolves entirely client-side, so it just works.

import { navItems } from './mock-data.js';
import { renderDashboard, renderEmptyState, renderSettings } from './views.js';
import { setActiveRoute } from './sidebar.js';
import { setPageTitle } from './topbar.js';

const DEFAULT_ROUTE = 'dashboard';

function currentRouteId() {
  return window.location.hash.replace(/^#\/?/, '') || DEFAULT_ROUTE;
}

function render(routeId) {
  const item = navItems.find((n) => n.id === routeId) || navItems.find((n) => n.id === DEFAULT_ROUTE);
  const root = document.getElementById('view-root');

  if (item.id === 'dashboard') {
    renderDashboard(root);
  } else if (item.id === 'settings') {
    renderSettings(root);
  } else if (item.id === 'projects') {
    // Genuine code-splitting: this module isn't fetched until the user
    // actually navigates here. The skeleton covers the real (if brief) gap.
    import('./projects/view.js').then(({ renderProjects, renderProjectsSkeleton }) => {
      renderProjectsSkeleton(root);
      renderProjects(root);
    });
  } else if (item.id === 'notes') {
    import('./notes/view.js').then(({ renderNotes, renderNotesSkeleton }) => {
      renderNotesSkeleton(root);
      renderNotes(root);
    });
  } else if (item.id === 'calendar') {
    import('./calendar/view.js').then(({ renderCalendar, renderCalendarSkeleton }) => {
      renderCalendarSkeleton(root);
      renderCalendar(root);
    });
  } else if (item.id === 'habits') {
    import('./habits/view.js').then(({ renderHabits, renderHabitsSkeleton }) => {
      renderHabitsSkeleton(root);
      renderHabits(root);
    });
  } else if (item.id === 'goals') {
    import('./goals/view.js').then(({ renderGoals, renderGoalsSkeleton }) => {
      renderGoalsSkeleton(root);
      renderGoals(root);
    });
  } else if (item.id === 'learning') {
    import('./learning/view.js').then(({ renderLearning, renderLearningSkeleton }) => {
      renderLearningSkeleton(root);
      renderLearning(root);
    });
  } else if (item.id === 'finance') {
    import('./finance/view.js').then(({ renderFinance, renderFinanceSkeleton }) => {
      renderFinanceSkeleton(root);
      renderFinance(root);
    });
  } else if (item.id === 'books') {
    import('./books/view.js').then(({ renderBooks, renderBooksSkeleton }) => {
      renderBooksSkeleton(root);
      renderBooks(root);
    });
  } else if (item.id === 'coding') {
    import('./coding/view.js').then(({ renderCoding, renderCodingSkeleton }) => {
      renderCodingSkeleton(root);
      renderCoding(root);
    });
  } else {
    renderEmptyState(root, item);
  }

  setActiveRoute(item.id);
  setPageTitle(item.label);
  root.focus();
}

export function navigate(routeId) {
  if (currentRouteId() === routeId) {
    render(routeId); // clicking the already-active nav item still re-renders
    return;
  }
  window.location.hash = `/${routeId}`;
}

export function initRouter() {
  window.addEventListener('hashchange', () => render(currentRouteId()));
  render(currentRouteId());
}

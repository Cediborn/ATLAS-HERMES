// Atlas — Finance page controller. The only file in the module that touches
// the DOM or wires events; data.js/state.js/components.js stay pure.

import { icon } from '../icons.js';
import { createPopover } from '../popover.js';
import { StatCard, SectionCard, emptyState } from '../components.js';
import { saveTransactions } from '../persistence.js';
import {
  accounts,
  transactions,
  CATEGORY_CONFIG,
  ACCOUNT_TYPE_CONFIG,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
} from './data.js';
import {
  getState,
  setState,
  getVisibleTransactions,
  invalidateVisibleTransactionsCache,
  resetFilters,
  computeFinanceStats,
  spendingByCategory,
  cashFlowThisMonth,
  groupByDate,
  accountBalance,
  formatCurrency,
  SORT_OPTIONS,
} from './state.js';
import {
  AccountCard,
  AccountHeader,
  TransactionRow,
  TransactionGroupHeader,
  CategoryChip,
  TransactionStatusBadge,
  FinanceSkeleton,
  FinanceEmptyState,
} from './components.js';
import { openTransactionDialog } from './dialog.js';

export function renderFinance(container) {
  container.innerHTML = `
    <div class="finance-page">
      <div class="finance-toolbar">
        <label class="toolbar-search" for="finance-search">
          ${icon('search', { size: 16 })}
          <input type="text" id="finance-search" placeholder="Search transactions\u2026" autocomplete="off" />
        </label>

        <button type="button" class="btn btn--primary finance-toolbar__new" id="finance-new">
          ${icon('plus', { size: 16 })}<span>New Transaction</span>
        </button>

        <div class="toolbar-spacer"></div>

        <div class="view-switcher" role="tablist" aria-label="View">
          <button type="button" class="view-switcher__option is-active" role="tab" aria-selected="true" data-view="overview">${icon('grid', { size: 15 })}<span>Overview</span></button>
          <button type="button" class="view-switcher__option" role="tab" aria-selected="false" data-view="transactions">${icon('checklist', { size: 15 })}<span>Transactions</span></button>
        </div>

        <div class="toolbar-popover">
          <button type="button" class="btn btn--secondary" id="finance-filter-trigger">
            ${icon('filter', { size: 15 })}<span>Filter</span><span class="badge badge--accent" id="finance-filter-count" hidden></span>
          </button>
          <div class="menu finance-filter-panel" id="finance-filter-panel" hidden></div>
        </div>

        <div class="toolbar-popover">
          <button type="button" class="btn btn--secondary" id="finance-sort-trigger">${icon('sort', { size: 15 })}<span>Sort</span></button>
          <div class="menu" id="finance-sort-panel" hidden></div>
        </div>

        <div class="toolbar-popover">
          <button type="button" class="icon-btn" id="finance-more-trigger" aria-label="More actions">${icon('moreHorizontal', { size: 18 })}</button>
          <div class="menu menu--right" id="finance-more-panel" hidden></div>
        </div>
      </div>

      <div class="finance-stats" id="finance-stats"></div>

      <div class="finance-charts" id="finance-charts"></div>

      <div class="finance-main" id="finance-main"></div>
    </div>

    <div class="overlay account-detail-overlay" id="account-detail-overlay" hidden>
      <aside class="account-detail-panel" role="dialog" aria-modal="true" aria-label="Account details" id="account-detail-panel"></aside>
    </div>
  `;

  initToolbar();
  initViewSwitcher();
  initDetailPanel();
  initPanelInteractions();
  initListInteractions();
  renderStats();
  renderCharts();
  renderMain();
}

export function renderFinanceSkeleton(container) {
  container.innerHTML = FinanceSkeleton();
}

// ================= STATS + CHARTS =================
function renderStats() {
  const el = document.getElementById('finance-stats');
  const s = computeFinanceStats();
  el.innerHTML = [
    StatCard({ title: 'Total balance', value: formatCurrency(s.totalBalance), icon: 'wallet', accent: 'accent' }),
    StatCard({ title: 'Income this month', value: formatCurrency(s.income), icon: 'trendingUp', accent: 'success' }),
    StatCard({ title: 'Spent this month', value: formatCurrency(s.expense), icon: 'arrowRight', accent: 'danger' }),
    StatCard({ title: 'Savings rate', value: `${s.savingsRate}%`, icon: 'piggy', accent: 'warning' }),
  ].join('');
}

function renderCharts() {
  const el = document.getElementById('finance-charts');
  const byCategory = spendingByCategory();
  const flow = cashFlowThisMonth();

  const categoryBody = byCategory.length
    ? byCategory
        .slice(0, 6)
        .map(
          (c) => `
          <div class="finance-chart-row">
            <span class="finance-chart-row__label">${CategoryChip({ category: c.category, compact: true })}<span class="finance-chart-row__count">${c.count}</span></span>
            <span class="finance-chart-row__value">${formatCurrency(c.sum)}</span>
          </div>`
        )
        .join('')
    : emptyState({ icon: 'wallet', title: 'No spending yet', description: 'Add expenses to see them by category.', size: 'sm' });

  const flowBody = `
    <div class="finance-flow">
      <div class="finance-flow__row">
        <span class="finance-flow__label">Income</span>
        <span class="finance-flow__track finance-flow__track--income"><span style="width:${flow.incomePct}%"></span></span>
        <span class="finance-flow__value">${formatCurrency(flow.income)}</span>
      </div>
      <div class="finance-flow__row">
        <span class="finance-flow__label">Spent</span>
        <span class="finance-flow__track finance-flow__track--expense"><span style="width:${flow.expensePct}%"></span></span>
        <span class="finance-flow__value">${formatCurrency(flow.expense)}</span>
      </div>
      <div class="finance-flow__net">Net this month: <strong>${flow.income - flow.expense >= 0 ? '+' : ''}${formatCurrency(flow.income - flow.expense)}</strong></div>
    </div>`;

  el.innerHTML = `
    ${SectionCard({ title: 'Spending by category', description: 'Where the money went', content: categoryBody })}
    ${SectionCard({ title: 'Cash flow this month', description: 'Income vs. spending', content: flowBody })}
  `;
}

// ================= MAIN (accounts + transactions) =================
function renderMain() {
  const el = document.getElementById('finance-main');
  const { viewMode } = getState();
  const visible = getVisibleTransactions(getState());
  const hasFilters = hasActiveFilters();

  const accountsBody = `<div class="finance-accounts">${accounts
    .map((a) => AccountCard({ account: a, balance: accountBalance(a) }))
    .join('')}</div>`;

  const txList = (list) => {
    if (!list.length) return FinanceEmptyState({ hasFilters });
    return groupByDate(list)
      .map(
        (g) => `
        <div class="tx-group-wrap">
          ${TransactionGroupHeader({ date: g.date, items: g.items })}
          ${g.items.map((t) => TransactionRow({ tx: t })).join('')}
        </div>`
      )
      .join('');
  };

  if (viewMode === 'transactions') {
    el.innerHTML = accountsBody + `<div class="finance-list">${txList(visible)}</div>`;
    return;
  }

  const recent = visible.slice(0, 8);
  el.innerHTML =
    accountsBody +
    `
    <div class="finance-list">
      <div class="finance-list__heading">
        <h3>Recent transactions</h3>
        <button type="button" class="btn btn--secondary" data-view-all="transactions">${icon('arrowRight', { size: 15 })}<span>View all</span></button>
      </div>
      ${txList(recent)}
    </div>`;
}

function hasActiveFilters() {
  const f = getState();
  return Boolean(f.search || f.accountFilter.size || f.categoryFilter.size || f.statusFilter.size || f.typeFilter || f.favoritesOnly);
}

// ================= VIEW SWITCHER =================
function initViewSwitcher() {
  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setState({ viewMode: btn.dataset.view });
      document.querySelectorAll('[data-view]').forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', String(active));
      });
      renderMain();
    });
  });
  document.getElementById('finance-main')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-view-all]');
    if (btn) {
      setState({ viewMode: btn.dataset.viewAll });
      document.querySelectorAll('[data-view]').forEach((b) => {
        const active = b.dataset.view === btn.dataset.viewAll;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', String(active));
      });
      renderMain();
    }
  });
}

// ================= TOOLBAR =================
function initToolbar() {
  const searchInput = document.getElementById('finance-search');
  searchInput.addEventListener('input', () => {
    setState({ search: searchInput.value });
    renderMain();
  });

  document.getElementById('finance-new').addEventListener('click', () => {
    openTransactionDialog('create', null, refreshAll);
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

function typeRadio(value, checked, label) {
  return `
    <label class="menu__item filter-checkbox">
      <input type="radio" name="tx-type" data-filter-type="type" value="${value || ''}" ${checked ? 'checked' : ''} />
      <span>${label}</span>
    </label>`;
}

function toggleSetFilter(key, value, checked) {
  const current = new Set(getState()[key]);
  if (checked) current.add(value);
  else current.delete(value);
  setState({ [key]: current });
}

function initFilterPopover() {
  const trigger = document.getElementById('finance-filter-trigger');
  const panel = document.getElementById('finance-filter-panel');

  function render() {
    const f = getState();
    panel.innerHTML = `
      <div class="menu__label">Type</div>
      ${typeRadio('', !f.typeFilter, 'All')}
      ${typeRadio('income', f.typeFilter === 'income', 'Income')}
      ${typeRadio('expense', f.typeFilter === 'expense', 'Expense')}
      <div class="menu__divider"></div>
      <div class="menu__label">Account</div>
      ${accounts.map((a) => filterCheckbox('account', a.id, f.accountFilter.has(a.id), a.name)).join('')}
      <div class="menu__divider"></div>
      <div class="menu__label">Income</div>
      ${INCOME_CATEGORIES.map((c) => filterCheckbox('category', c, f.categoryFilter.has(c), CATEGORY_CONFIG[c].label)).join('')}
      <div class="menu__label">Expenses</div>
      ${EXPENSE_CATEGORIES.map((c) => filterCheckbox('category', c, f.categoryFilter.has(c), CATEGORY_CONFIG[c].label)).join('')}
      <div class="menu__divider"></div>
      <div class="menu__label">Status</div>
      ${filterCheckbox('status', 'cleared', f.statusFilter.has('cleared'), 'Cleared')}
      ${filterCheckbox('status', 'pending', f.statusFilter.has('pending'), 'Pending')}
      <div class="menu__divider"></div>
      ${filterCheckbox('favoritesOnly', '', f.favoritesOnly, 'Favorites only')}
      <div class="menu__divider"></div>
      <button type="button" class="menu__item" id="finance-filter-clear">${icon('x', { size: 16 })}<span>Clear filters</span></button>
    `;
  }

  createPopover({ trigger, panel, onOpenRender: render });

  panel.addEventListener('change', (e) => {
    const input = e.target;
    const type = input.dataset.filterType;
    if (type === 'type') setState({ typeFilter: input.value || null });
    else if (type === 'account') toggleSetFilter('accountFilter', input.value, input.checked);
    else if (type === 'category') toggleSetFilter('categoryFilter', input.value, input.checked);
    else if (type === 'status') toggleSetFilter('statusFilter', input.value, input.checked);
    else if (type === 'favoritesOnly') setState({ favoritesOnly: input.checked });
    renderMain();
    updateFilterCount();
  });

  panel.addEventListener('click', (e) => {
    if (e.target.closest('#finance-filter-clear')) {
      resetFilters();
      render();
      renderMain();
      updateFilterCount();
    }
  });
}

function updateFilterCount() {
  const f = getState();
  const count = f.accountFilter.size + f.categoryFilter.size + f.statusFilter.size + (f.typeFilter ? 1 : 0) + (f.favoritesOnly ? 1 : 0);
  const badge = document.getElementById('finance-filter-count');
  badge.hidden = count === 0;
  badge.textContent = String(count);
}

function initSortPopover() {
  const trigger = document.getElementById('finance-sort-trigger');
  const panel = document.getElementById('finance-sort-panel');

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
      renderMain();
      popover.close();
    }
  });
}

function initMorePopover() {
  const trigger = document.getElementById('finance-more-trigger');
  const panel = document.getElementById('finance-more-panel');

  function render() {
    panel.innerHTML = `<button type="button" class="menu__item" id="finance-more-shortcuts">${icon('search', { size: 16 })}<span>Keyboard shortcuts</span></button>`;
  }

  const popover = createPopover({ trigger, panel, onOpenRender: render });

  panel.addEventListener('click', (e) => {
    if (e.target.closest('#finance-more-shortcuts')) {
      popover.close();
      document.getElementById('search-trigger').click();
    }
  });
}

function refreshAll() {
  invalidateVisibleTransactionsCache();
  renderStats();
  renderCharts();
  renderMain();
}

// ================= LIST INTERACTIONS (delegated — survives re-render) =================
function initListInteractions() {
  const main = document.getElementById('finance-main');
  main.addEventListener('click', (e) => {
    const star = e.target.closest('.tx-row__favorite');
    if (star) {
      e.stopPropagation();
      const row = star.closest('.tx-row');
      const tx = transactions.find((t) => t.id === row.dataset.id);
      if (tx) {
        tx.favorite = !tx.favorite;
        saveTransactions();
        invalidateVisibleTransactionsCache();
        renderMain();
      }
      return;
    }
    const row = e.target.closest('.tx-row');
    if (row) {
      const tx = transactions.find((t) => t.id === row.dataset.id);
      if (tx) openTransactionDialog('edit', tx, refreshAll);
      return;
    }
    const card = e.target.closest('.account-card');
    if (card) openAccountDetail(card.dataset.id);
  });
  main.addEventListener('keydown', (e) => {
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t.classList.contains('tx-row')) {
      e.preventDefault();
      const tx = transactions.find((x) => x.id === t.dataset.id);
      if (tx) openTransactionDialog('edit', tx, refreshAll);
    } else if ((e.key === 'Enter' || e.key === ' ') && t.classList.contains('account-card')) {
      e.preventDefault();
      openAccountDetail(t.dataset.id);
    }
  });
}

// ================= ACCOUNT DETAIL PANEL =================
let lastFocusedBeforeDetail = null;

function initDetailPanel() {
  const overlay = document.getElementById('account-detail-overlay');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDetail();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) closeDetail();
  });
}

function openAccountDetail(accountId) {
  const a = accounts.find((x) => x.id === accountId);
  if (!a) return;
  lastFocusedBeforeDetail = document.activeElement;
  const overlay = document.getElementById('account-detail-overlay');
  const panel = document.getElementById('account-detail-panel');
  panel.dataset.accountId = a.id;
  panel.innerHTML = renderAccountDetail(a);
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  panel.querySelector('#account-detail-close').addEventListener('click', closeDetail);
  panel.querySelector('#account-detail-close').focus();
}

function closeDetail() {
  const overlay = document.getElementById('account-detail-overlay');
  overlay.hidden = true;
  document.body.style.overflow = '';
  lastFocusedBeforeDetail?.focus?.();
}

function renderAccountDetail(a) {
  const balance = accountBalance(a);
  const txList = transactions
    .filter((t) => t.accountId === a.id)
    .sort((x, y) => new Date(y.date) - new Date(x.date));

  const spent = txList.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const earned = txList.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

  const body = txList.length
    ? txList.map((t) => TransactionRow({ tx: t })).join('')
    : emptyState({ icon: 'wallet', title: 'No activity here yet', description: 'Transactions for this account will appear here.', size: 'sm' });

  return `
    <button type="button" class="icon-btn account-detail-panel__close" id="account-detail-close" aria-label="Close panel">${icon('x', { size: 18 })}</button>
    <div class="account-detail-panel__scroll">
      ${AccountHeader({ account: a, balance })}

      <div class="account-detail-panel__stats-grid">
        ${statBlock(formatCurrency(spent), 'Spent')}
        ${statBlock(formatCurrency(earned), 'Earned')}
        ${statBlock(String(txList.filter((t) => t.status === 'pending').length), 'Pending')}
        ${statBlock(String(txList.length), 'Transactions')}
      </div>

      <section class="account-detail-panel__section">
        <h4>Activity</h4>
        <div class="account-detail-panel__list">${body}</div>
      </section>
    </div>
  `;
}

function statBlock(value, label) {
  return `<div class="account-detail-panel__stat"><span class="account-detail-panel__stat-value">${value}</span><span class="account-detail-panel__stat-label">${label}</span></div>`;
}

// Panel-level favorite toggles — same behavior as the list, but re-renders only the panel.
function initPanelInteractions() {
  const panel = document.getElementById('account-detail-panel');
  if (panel.dataset.interactions) return;
  panel.dataset.interactions = '1';

  panel.addEventListener('click', (e) => {
    const star = e.target.closest('.tx-row__favorite');
    if (star) {
      const row = star.closest('.tx-row');
      const tx = transactions.find((t) => t.id === row.dataset.id);
      if (tx) {
        tx.favorite = !tx.favorite;
        saveTransactions();
        invalidateVisibleTransactionsCache();
        const scrollEl = panel.querySelector('.account-detail-panel__scroll');
        const scrollTop = scrollEl?.scrollTop || 0;
        const accountId = panel.dataset.accountId;
        panel.innerHTML = renderAccountDetail(accounts.find((x) => x.id === accountId));
        panel.querySelector('#account-detail-close').addEventListener('click', closeDetail);
        if (scrollEl) scrollEl.scrollTop = scrollTop;
        renderMain();
      }
    }
  });
}

// Atlas — Finance page state.
// Uses shared list-state.js for filtering/sorting/memoization.
// This file only defines Finance-specific config and enrichments.

import { formatDate, timeAgo, todayKey } from '../date-utils.js';
import { createListState, createFilterFn, createSortFn } from '../list-state.js';
import { accounts, transactions, CATEGORY_CONFIG } from './data.js';

// ---- Page-scoped state ----
const initialState = {
  search: '',
  accountFilter: new Set(),
  categoryFilter: new Set(),
  statusFilter: new Set(),
  typeFilter: null, // 'income' | 'expense' | null
  favoritesOnly: false,
  sortBy: 'recentlyAdded',
  viewMode: 'overview', // 'overview' | 'transactions'
};

const listeners = new Set();
let state = { ...initialState };

// ---- Money formatting (shared by components) ----
const moneyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function formatCurrency(amount) {
  return moneyFmt.format(amount);
}

const moneyFmtWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
export function formatCurrencyWhole(amount) {
  return moneyFmtWhole.format(amount);
}

// ---- Balance — derived from opening balance + signed transactions ----
export function accountBalance(account) {
  const signed = (t) => (t.type === 'income' ? t.amount : -t.amount);
  const sum = transactions.filter((t) => t.accountId === account.id).reduce((acc, t) => acc + signed(t), 0);
  return account.openingBalance + sum;
}

export function accountBalanceSigned(account) {
  const b = accountBalance(account);
  return b >= 0 ? b : Math.abs(b);
}

// ---- Monthly stats (pure) ----
const thisMonthKey = () => todayKey().slice(0, 7);

export function computeFinanceStats() {
  const monthKey = thisMonthKey();
  const monthTx = transactions.filter((t) => t.date.startsWith(monthKey));
  const income = monthTx.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = monthTx.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalBalance = accounts.reduce((sum, a) => sum + accountBalance(a), 0);
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
  const pendingCount = transactions.filter((t) => t.status === 'pending').length;
  return { totalBalance, income, expense, net: income - expense, savingsRate, pendingCount };
}

// ---- Spending by category (pure) — excludes income, respects account filter ----
export function spendingByCategory() {
  const order = [];
  const map = new Map();
  transactions.forEach((t) => {
    if (t.type !== 'expense') return;
    if (!map.has(t.category)) {
      map.set(t.category, { category: t.category, sum: 0, count: 0 });
      order.push(t.category);
    }
    const entry = map.get(t.category);
    entry.sum += t.amount;
    entry.count += 1;
  });
  const rows = order.map((c) => {
    const e = map.get(c);
    return { category: c, sum: e.sum, count: e.count };
  });
  rows.sort((a, b) => b.sum - a.sum);
  return rows;
}

// ---- Cash flow this month (income vs expense) ----
export function cashFlowThisMonth() {
  const monthKey = thisMonthKey();
  const monthTx = transactions.filter((t) => t.date.startsWith(monthKey));
  const income = monthTx.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = monthTx.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const max = Math.max(income, expense, 1);
  return { income, expense, incomePct: Math.round((income / max) * 100), expensePct: Math.round((expense / max) * 100) };
}

// ---- Filtering (pure) ----
function matchesTransaction(t, f) {
  const q = f.search.trim().toLowerCase();
  if (q && !t.description.toLowerCase().includes(q)) return false;
  if (f.typeFilter && t.type !== f.typeFilter) return false;
  if (f.favoritesOnly && !t.favorite) return false;
  if (f.accountFilter.size && !f.accountFilter.has(t.accountId)) return false;
  if (f.categoryFilter.size && !f.categoryFilter.has(t.category)) return false;
  if (f.statusFilter.size && !f.statusFilter.has(t.status)) return false;
  return true;
}

// ---- Sorting (pure) ----
const comparators = {
  amountHigh: (a, b) => b.amount - a.amount,
  amountLow: (a, b) => a.amount - b.amount,
  category: (a, b) => (CATEGORY_CONFIG[a.category].label || a.category).localeCompare(CATEGORY_CONFIG[b.category].label || b.category),
  oldest: (a, b) => new Date(a.date) - new Date(b.date),
  recentlyAdded: (a, b) => new Date(b.date) - new Date(a.date),
};

const SORT_OPTIONS = [
  { id: 'recentlyAdded', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'amountHigh', label: 'Amount (high → low)' },
  { id: 'amountLow', label: 'Amount (low → high)' },
  { id: 'category', label: 'Category' },
];

// ---- Build cache key ----
function buildKey(f) {
  return {
    search: f.search,
    account: [...f.accountFilter].sort(),
    category: [...f.categoryFilter].sort(),
    status: [...f.statusFilter].sort(),
    type: f.typeFilter,
    fav: f.favoritesOnly,
    sort: f.sortBy,
  };
}

// ---- Create the shared list state ----
const listState = createListState({
  moduleName: 'finance',
  initialState,
  sortOptions: SORT_OPTIONS,
  filterFn: createFilterFn(matchesTransaction),
  sortFn: createSortFn(comparators, 'recentlyAdded'),
  buildKey: (f) => buildKey(f), // finance doesn't use list length in key
  resetKeys: ['search', 'accountFilter', 'categoryFilter', 'statusFilter', 'typeFilter', 'favoritesOnly'],
});

// ---- Re-export standard API ----
export const {
  getState,
  setState,
  subscribe,
  resetFilters,
  filter: filterTransactions,
  sort: sortTransactions,
  getVisible: getVisibleTransactions,
  invalidateCache: invalidateVisibleTransactionsCache,
} = listState;

export { SORT_OPTIONS };

// ---- Re-export date utils for view.js ----
export { formatDate, timeAgo, todayKey };

// ---- Group transactions by date for the grouped list ----
export function groupByDate(list) {
  const order = [];
  const map = new Map();
  list.forEach((t) => {
    if (!map.has(t.date)) {
      map.set(t.date, { date: t.date, items: [] });
      order.push(t.date);
    }
    map.get(t.date).items.push(t);
  });
  return order.map((d) => ({ date: d, items: map.get(d).items }));
}
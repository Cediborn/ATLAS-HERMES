// Atlas — Finance page state. Page-scoped (not the global store), same shape
// as goals/learning state: balances/stats/filtering are pure functions, nothing
// here touches the DOM.

import { formatDate, timeAgo, todayKey } from '../date-utils.js';
import { accounts, transactions, CATEGORY_CONFIG } from './data.js';

const listeners = new Set();

let state = {
  search: '',
  accountFilter: new Set(),
  categoryFilter: new Set(),
  statusFilter: new Set(),
  typeFilter: null, // 'income' | 'expense' | null
  favoritesOnly: false,
  sortBy: 'recentlyAdded',
  viewMode: 'overview', // 'overview' | 'transactions'
};

export function getState() {
  return state;
}

export function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetFilters() {
  setState({ search: '', accountFilter: new Set(), categoryFilter: new Set(), statusFilter: new Set(), typeFilter: null, favoritesOnly: false });
}

export { formatDate, timeAgo, todayKey };

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
export function filterTransactions(f) {
  const q = f.search.trim().toLowerCase();
  return transactions.filter((t) => {
    if (q && !t.description.toLowerCase().includes(q)) return false;
    if (f.typeFilter && t.type !== f.typeFilter) return false;
    if (f.favoritesOnly && !t.favorite) return false;
    if (f.accountFilter.size && !f.accountFilter.has(t.accountId)) return false;
    if (f.categoryFilter.size && !f.categoryFilter.has(t.category)) return false;
    if (f.statusFilter.size && !f.statusFilter.has(t.status)) return false;
    return true;
  });
}

// ---- Sorting (pure) ----
export function sortTransactions(list, sortBy) {
  const arr = [...list];
  switch (sortBy) {
    case 'amountHigh':
      return arr.sort((a, b) => b.amount - a.amount);
    case 'amountLow':
      return arr.sort((a, b) => a.amount - b.amount);
    case 'category':
      return arr.sort((a, b) => (CATEGORY_CONFIG[a.category].label || a.category).localeCompare(CATEGORY_CONFIG[b.category].label || b.category));
    case 'oldest':
      return arr.sort((a, b) => new Date(a.date) - new Date(b.date));
    case 'recentlyAdded':
    default:
      return arr.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
}

export const SORT_OPTIONS = [
  { id: 'recentlyAdded', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'amountHigh', label: 'Amount (high \u2192 low)' },
  { id: 'amountLow', label: 'Amount (low \u2192 high)' },
  { id: 'category', label: 'Category' },
];

// ---- Memoized filter+sort (real memoization, same approach as goals) ----
let lastKey = null;
let lastResult = null;

export function getVisibleTransactions(f) {
  const key = JSON.stringify({
    search: f.search,
    account: [...f.accountFilter].sort(),
    category: [...f.categoryFilter].sort(),
    status: [...f.statusFilter].sort(),
    type: f.typeFilter,
    fav: f.favoritesOnly,
    sort: f.sortBy,
  });
  if (key === lastKey) return lastResult;
  lastKey = key;
  lastResult = sortTransactions(filterTransactions(f), f.sortBy);
  return lastResult;
}

export function invalidateVisibleTransactionsCache() {
  lastKey = null;
}

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

// Atlas — Finance canonical data. Same discipline as projects/goals/learning:
// raw content + config maps here; everything DERIVED (balances from
// transactions, monthly stats) lives in state.js. The dashboard preview reads
// from here too.

import { dateKey } from '../date-utils.js';

// Transactions are dated relative to the real current date (same reasoning as
// habits' generated history): "income this month / spent this month" should
// still look coherent whenever the app is actually opened, not just on the day
// the mock was authored.
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateKey(d);
}

// ---- Accounts ----
export const ACCOUNT_TYPE_CONFIG = {
  checking: { label: 'Checking', icon: 'wallet', color: 'blue' },
  savings: { label: 'Savings', icon: 'landmark', color: 'emerald' },
  credit: { label: 'Credit', icon: 'creditCard', color: 'rose' },
  cash: { label: 'Cash', icon: 'banknote', color: 'amber' },
};
export const ACCOUNT_TYPES = Object.keys(ACCOUNT_TYPE_CONFIG);

// `openingBalance` is the baseline; current balance = opening + all signed
// transaction amounts. Uniform rule for every account type: income adds to the
// balance, expense subtracts. Credit accounts therefore start negative (money
// owed) and spending makes them more negative — displayed as "owed".
export const accounts = [
  { id: 'a1', name: 'Everyday Checking', institution: 'Chase', type: 'checking', openingBalance: 3240.5, createdAt: '2026-01-01' },
  { id: 'a2', name: 'High-Yield Savings', institution: 'Marcus', type: 'savings', openingBalance: 12000, createdAt: '2026-01-01' },
  { id: 'a3', name: 'Travel Rewards', institution: 'Amex', type: 'credit', openingBalance: -1540.25, createdAt: '2026-03-15' },
  { id: 'a4', name: 'Cash Wallet', institution: 'Cash', type: 'cash', openingBalance: 220, createdAt: '2026-01-01' },
];

// ---- Categories (income vs expense) ----
export const CATEGORY_CONFIG = {
  // income
  salary: { label: 'Salary', type: 'income', icon: 'briefcase', color: 'blue' },
  freelance: { label: 'Freelance', type: 'income', icon: 'code', color: 'violet' },
  interest: { label: 'Interest', type: 'income', icon: 'trendingUp', color: 'emerald' },
  gift: { label: 'Gift', type: 'income', icon: 'gift', color: 'amber' },
  // expense
  housing: { label: 'Housing', type: 'expense', icon: 'home', color: 'blue' },
  food: { label: 'Food & Groceries', type: 'expense', icon: 'utensils', color: 'amber' },
  transport: { label: 'Transport', type: 'expense', icon: 'car', color: 'slate' },
  subscriptions: { label: 'Subscriptions', type: 'expense', icon: 'repeat', color: 'violet' },
  shopping: { label: 'Shopping', type: 'expense', icon: 'shoppingBag', color: 'rose' },
  health: { label: 'Health', type: 'expense', icon: 'heart', color: 'emerald' },
  utilities: { label: 'Utilities', type: 'expense', icon: 'lightbulb', color: 'amber' },
  entertainment: { label: 'Entertainment', type: 'expense', icon: 'sparkle', color: 'violet' },
  personal: { label: 'Personal', type: 'expense', icon: 'users', color: 'teal' },
};
export const TRANSACTION_CATEGORIES = Object.keys(CATEGORY_CONFIG);
export const INCOME_CATEGORIES = TRANSACTION_CATEGORIES.filter((c) => CATEGORY_CONFIG[c].type === 'income');
export const EXPENSE_CATEGORIES = TRANSACTION_CATEGORIES.filter((c) => CATEGORY_CONFIG[c].type === 'expense');

// ---- Transactions ----
// { id, date, description, type: 'income'|'expense', category, amount, accountId, status: 'cleared'|'pending', favorite }
// `amount` is always positive; `type` decides the sign in balance math.
export const transactions = [
  // Income
  { id: 't1', date: daysAgo(2), description: 'Salary — August', type: 'income', category: 'salary', amount: 5200, accountId: 'a1', status: 'cleared', favorite: true },
  { id: 't2', date: daysAgo(30), description: 'Salary — July', type: 'income', category: 'salary', amount: 5200, accountId: 'a1', status: 'cleared', favorite: false },
  { id: 't3', date: daysAgo(9), description: 'Freelance — migration consulting', type: 'income', category: 'freelance', amount: 850, accountId: 'a1', status: 'cleared', favorite: true },
  { id: 't4', date: daysAgo(1), description: 'High-yield interest', type: 'income', category: 'interest', amount: 31.42, accountId: 'a2', status: 'cleared', favorite: false },
  { id: 't5', date: daysAgo(21), description: 'Birthday gift', type: 'income', category: 'gift', amount: 100, accountId: 'a4', status: 'cleared', favorite: false },
  // Housing
  { id: 't6', date: daysAgo(3), description: 'Rent — August', type: 'expense', category: 'housing', amount: 1850, accountId: 'a1', status: 'cleared', favorite: true },
  { id: 't7', date: daysAgo(33), description: 'Rent — July', type: 'expense', category: 'housing', amount: 1850, accountId: 'a1', status: 'cleared', favorite: false },
  // Food
  { id: 't8', date: daysAgo(0), description: 'Whole Foods', type: 'expense', category: 'food', amount: 86.4, accountId: 'a1', status: 'cleared', favorite: false },
  { id: 't9', date: daysAgo(2), description: 'Trader Joe\u2019s', type: 'expense', category: 'food', amount: 54.3, accountId: 'a1', status: 'cleared', favorite: false },
  { id: 't10', date: daysAgo(6), description: 'Lunch at the deli', type: 'expense', category: 'food', amount: 14.5, accountId: 'a4', status: 'cleared', favorite: false },
  // Transport
  { id: 't11', date: daysAgo(5), description: 'Fuel', type: 'expense', category: 'transport', amount: 48.2, accountId: 'a1', status: 'cleared', favorite: false },
  { id: 't12', date: daysAgo(12), description: 'Metro monthly pass', type: 'expense', category: 'transport', amount: 127, accountId: 'a1', status: 'cleared', favorite: false },
  // Subscriptions
  { id: 't13', date: daysAgo(4), description: 'Netflix', type: 'expense', category: 'subscriptions', amount: 15.49, accountId: 'a1', status: 'cleared', favorite: false },
  { id: 't14', date: daysAgo(4), description: 'Spotify', type: 'expense', category: 'subscriptions', amount: 10.99, accountId: 'a1', status: 'cleared', favorite: false },
  { id: 't15', date: daysAgo(4), description: 'iCloud+', type: 'expense', category: 'subscriptions', amount: 2.99, accountId: 'a1', status: 'cleared', favorite: false },
  // Shopping / health / utilities / entertainment / personal
  { id: 't16', date: daysAgo(8), description: 'Uniqlo', type: 'expense', category: 'shopping', amount: 72.4, accountId: 'a3', status: 'pending', favorite: false },
  { id: 't17', date: daysAgo(7), description: 'Pharmacy', type: 'expense', category: 'health', amount: 23.75, accountId: 'a1', status: 'cleared', favorite: false },
  { id: 't18', date: daysAgo(10), description: 'Electric bill', type: 'expense', category: 'utilities', amount: 118.6, accountId: 'a1', status: 'cleared', favorite: false },
  { id: 't19', date: daysAgo(13), description: 'Cinema night', type: 'expense', category: 'entertainment', amount: 32, accountId: 'a4', status: 'cleared', favorite: false },
  { id: 't20', date: daysAgo(14), description: 'Books & Kindle', type: 'expense', category: 'personal', amount: 41.99, accountId: 'a3', status: 'pending', favorite: true },
];

export function accountById(id) {
  return accounts.find((a) => a.id === id) || null;
}

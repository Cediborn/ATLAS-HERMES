// Atlas — Finance components. Presentation-only functions returning markup —
// no DOM queries, no listeners, no state reads. view.js wires behavior on top.

import { icon } from '../icons.js';
import { emptyState } from '../components.js';
import { CATEGORY_CONFIG, ACCOUNT_TYPE_CONFIG } from './data.js';
import { formatCurrency, formatDate, todayKey } from './state.js';

// ---- CategoryChip — icon + label, tinted with the category's identity color ----
export function CategoryChip({ category, compact = false }) {
  const cfg = CATEGORY_CONFIG[category] || { label: category, icon: 'moreHorizontal', color: 'slate' };
  return `<span class="tx-category tx-category--${cfg.color}${compact ? ' tx-category--compact' : ''}">${icon(cfg.icon, { size: compact ? 12 : 13 })}<span>${cfg.label}</span></span>`;
}

// ---- TypeIcon — income / expense tinted icon square ----
export function TypeIcon({ type, category, size = 17 }) {
  const cfg = CATEGORY_CONFIG[category] || { icon: 'moreHorizontal', color: 'slate' };
  return `<span class="tx-icon tx-icon--${type} tx-icon--${cfg.color}">${icon(cfg.icon, { size })}</span>`;
}

// ---- TransactionStatusBadge ----
export function TransactionStatusBadge({ status }) {
  return `<span class="tx-status tx-status--${status === 'pending' ? 'warning' : 'success'}">${status[0].toUpperCase() + status.slice(1)}</span>`;
}

// ---- AccountTypeChip ----
export function AccountTypeChip({ type }) {
  const cfg = ACCOUNT_TYPE_CONFIG[type] || { label: type, icon: 'wallet' };
  return `<span class="account-type-chip">${icon(cfg.icon, { size: 12 })}${cfg.label}</span>`;
}

// ---- TransactionGroupHeader — date label + day total ----
export function TransactionGroupHeader({ date, items }) {
  const today = todayKey();
  const label = date === today ? 'Today' : date === formatDate(today) ? 'Yesterday' : formatDate(date);
  const total = items.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
  return `
    <div class="tx-group">
      <span class="tx-group__label">${label}</span>
      <span class="tx-group__total">${total >= 0 ? '+' : ''}${formatCurrency(total)}</span>
    </div>`;
}

// ---- AccountCard — the accounts grid unit ----
export function AccountCard({ account, balance }) {
  const cfg = ACCOUNT_TYPE_CONFIG[account.type] || { label: account.type, icon: 'wallet', color: 'slate' };
  const isCredit = account.type === 'credit';
  const label = isCredit ? 'Balance owed' : 'Balance';
  return `
    <article class="account-card" data-id="${account.id}" tabindex="0" role="button" aria-label="Open ${account.name}">
      <div class="account-card__top">
        <span class="account-card__icon account-card__icon--${cfg.color}">${icon(cfg.icon, { size: 16 })}</span>
        <span class="account-card__name">${account.name}</span>
      </div>
      <div class="account-card__institution">${account.institution} · ${cfg.label}</div>
      <div class="account-card__balance">
        <span class="account-card__balance-value${balance < 0 ? ' account-card__balance-value--negative' : ''}">${formatCurrency(balance < 0 ? -balance : balance)}</span>
        <span class="account-card__balance-label">${label}</span>
      </div>
    </article>`;
}

// ---- TransactionRow — the transactions list unit ----
export function TransactionRow({ tx }) {
  return `
    <div class="tx-row" data-id="${tx.id}" role="button" tabindex="0" aria-label="Transaction ${tx.description}">
      ${TypeIcon({ type: tx.type, category: tx.category })}
      <span class="tx-row__body">
        <span class="tx-row__title">${tx.description}</span>
        <span class="tx-row__meta">${CategoryChip({ category: tx.category, compact: true })}${tx.status === 'pending' ? TransactionStatusBadge({ status: tx.status }) : ''}</span>
      </span>
      <span class="tx-row__amount tx-row__amount--${tx.type}">${tx.type === 'income' ? '+' : '\u2212'}${formatCurrency(tx.amount)}</span>
      <button type="button" class="tx-row__favorite${tx.favorite ? ' is-active' : ''}" role="checkbox" aria-checked="${tx.favorite}" aria-label="${tx.favorite ? 'Remove from favorites' : 'Add to favorites'}">
        ${icon('star', { size: 15 })}
      </button>
    </div>`;
}

// ---- AccountHeader — reused atop the account detail panel ----
export function AccountHeader({ account, balance }) {
  const cfg = ACCOUNT_TYPE_CONFIG[account.type] || { label: account.type, icon: 'wallet', color: 'slate' };
  const isCredit = account.type === 'credit';
  const negative = balance < 0;
  return `
    <div class="account-header">
      <span class="account-header__icon account-header__icon--${cfg.color}">${icon(cfg.icon, { size: 20 })}</span>
      <div class="account-header__titles">
        <h3 class="account-header__title">${account.name}</h3>
        <div class="account-header__badges">${AccountTypeChip({ type: account.type })}<span class="account-header__institution">${account.institution}</span></div>
      </div>
    </div>
    <div class="account-header__balance account-header__balance--${negative ? 'negative' : 'positive'}">
      ${formatCurrency(balance < 0 ? -balance : balance)}
      <span>${isCredit ? 'owed on this card' : negative ? 'overdrawn' : 'available'}</span>
    </div>`;
}

// ---- FinanceEmptyState — thin wrapper around the app-wide emptyState() ----
export function FinanceEmptyState({ hasFilters }) {
  return hasFilters
    ? emptyState({ icon: 'search', title: 'No transactions match', description: 'Try adjusting your filters or search.', size: 'md' })
    : emptyState({ icon: 'wallet', title: 'No transactions yet', description: 'Add an income or expense to start tracking.', size: 'md' });
}

// ---- FinanceSkeleton ------------------------------------------------------
export function FinanceSkeleton() {
  return `
    <div class="finance-page">
      <div class="finance-stats">
        ${Array.from({ length: 4 }, () => '<div class="skeleton-block skeleton-block--stat"></div>').join('')}
      </div>
      <div class="finance-accounts">
        ${Array.from({ length: 4 }, () => '<div class="skeleton-block skeleton-block--card"></div>').join('')}
      </div>
      <div class="finance-list">
        ${Array.from({ length: 5 }, () => '<div class="skeleton-block skeleton-block--row"></div>').join('')}
      </div>
    </div>`;
}

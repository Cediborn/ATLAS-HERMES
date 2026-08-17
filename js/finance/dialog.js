// Atlas — Transaction create/edit/delete dialog. Thin wrapper over the shared form dialog.

import { openFormDialog } from '../form-dialog.js';
import { saveTransactions } from '../persistence.js';
import { transactions, accounts, createTransactionId, CATEGORY_CONFIG, TRANSACTION_CATEGORIES } from './data.js';

export function openTransactionDialog(mode, tx, onSaved) {
  const isEdit = mode === 'edit';
  const today = new Date().toISOString().slice(0, 10);

  const fields = [
    { key: 'date', label: 'Date', type: 'date', required: true, half: true },
    { key: 'type', label: 'Type', type: 'select', options: ['income', 'expense'].map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1) })), half: true },
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      options: TRANSACTION_CATEGORIES.map((c) => ({ value: c, label: `${CATEGORY_CONFIG[c].label} (${CATEGORY_CONFIG[c].type})` })),
      half: true,
    },
    { key: 'accountId', label: 'Account', type: 'select', options: accounts.map((a) => ({ value: a.id, label: a.name })), half: true },
    { key: 'description', label: 'Description', type: 'text', placeholder: 'e.g. Groceries', required: true },
    { key: 'amount', label: 'Amount', type: 'number', min: 0.01, step: 0.01, required: true, half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['cleared', 'pending'].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) })), half: true },
  ];

  openFormDialog({
    title: isEdit ? 'Edit transaction' : 'New transaction',
    fields,
    values: isEdit ? { ...tx } : { date: today, type: 'expense', category: 'food', accountId: accounts[0]?.id || '', status: 'cleared' },
    saveLabel: isEdit ? 'Save changes' : 'Add transaction',
    deleteLabel: 'Delete transaction',
    onDelete: isEdit ? () => {
      const idx = transactions.findIndex((t) => t.id === tx.id);
      if (idx !== -1) transactions.splice(idx, 1);
      saveTransactions();
      onSaved?.();
    } : undefined,
    onSave: (values) => {
      if (isEdit) {
        Object.assign(tx, values);
        saveTransactions();
      } else {
        const t = {
          ...values,
          id: createTransactionId(),
          amount: Number(values.amount),
          favorite: false,
        };
        transactions.push(t);
        saveTransactions();
      }
      onSaved?.();
      return true;
    },
  });
}

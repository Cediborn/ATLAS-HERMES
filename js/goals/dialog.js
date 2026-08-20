// Atlas — Goal create/edit/delete dialog. Thin wrapper over the shared form dialog.

import { openFormDialog } from '../form-dialog.js';
import { saveGoals } from '../persistence.js';
import { goals, createGoalId, GOAL_TYPES, GOAL_STATUSES, GOAL_CATEGORIES, CATEGORY_CONFIG, PRIORITIES } from './data.js';
import { resources } from '../learning/data.js';

export function openGoalDialog(mode, goal, onSaved) {
  const isEdit = mode === 'edit';
  const fields = [
    { key: 'title', label: 'Title', type: 'text', placeholder: 'e.g. Run a half marathon', required: true },
    { key: 'description', label: 'Description', type: 'textarea', rows: 2 },
    { key: 'type', label: 'Type', type: 'select', options: GOAL_TYPES.map((t) => ({ value: t.id, label: t.label })), half: true },
    { key: 'category', label: 'Category', type: 'select', options: GOAL_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_CONFIG[c].label })), half: true },
    { key: 'status', label: 'Status', type: 'select', options: GOAL_STATUSES, half: true },
    { key: 'priority', label: 'Priority', type: 'select', options: PRIORITIES, half: true },
    { key: 'startDate', label: 'Start date', type: 'date', half: true },
    { key: 'deadline', label: 'Deadline', type: 'date', half: true },
    { key: 'linkedResourceIds', label: 'Linked learning', type: 'select', options: [{ value: '', label: 'None' }, ...resources.map((r) => ({ value: r.id, label: r.title }))], half: true },
  ];

  openFormDialog({
    title: isEdit ? 'Edit goal' : 'New goal',
    fields,
    values: isEdit ? goal : {},
    saveLabel: isEdit ? 'Save changes' : 'Create goal',
    deleteLabel: 'Delete goal',
    onDelete: isEdit ? () => {
      const idx = goals.findIndex((g) => g.id === goal.id);
      if (idx !== -1) goals.splice(idx, 1);
      saveGoals();
      onSaved?.();
    } : undefined,
    onSave: (values) => {
      if (isEdit) {
        Object.assign(goal, values);
        goal.updatedAt = new Date().toISOString().slice(0, 10);
        saveGoals();
      } else {
        const today = new Date().toISOString().slice(0, 10);
        const g = {
          ...values,
          id: createGoalId(),
          milestones: [],
          linkedProjects: [],
          linkedHabits: [],
          linkedResourceIds: values.linkedResourceIds ? [values.linkedResourceIds] : [],
          favorite: false,
          archived: false,
          createdAt: today,
          updatedAt: today,
        };
        goals.unshift(g);
        saveGoals();
      }
      onSaved?.();
      return true;
    },
  });
}

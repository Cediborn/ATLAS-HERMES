// Atlas — Learning resource create/edit/delete dialog. Thin wrapper over the shared form dialog.

import { openFormDialog } from '../form-dialog.js';
import { saveResources } from '../persistence.js';
import { resources, createResourceId, RESOURCE_TYPES, LEARNING_STATUSES, LEARNING_SUBJECTS, SUBJECT_CONFIG, PRIORITIES } from './data.js';

export function openResourceDialog(mode, resource, onSaved) {
  const isEdit = mode === 'edit';
  const fields = [
    { key: 'title', label: 'Title', type: 'text', placeholder: 'e.g. Deep Work', required: true },
    { key: 'author', label: 'Author / source', type: 'text', half: true },
    { key: 'type', label: 'Type', type: 'select', options: RESOURCE_TYPES.map((t) => ({ value: t.id, label: t.label })), half: true },
    { key: 'subject', label: 'Subject', type: 'select', options: LEARNING_SUBJECTS.map((s) => ({ value: s, label: SUBJECT_CONFIG[s].label })), half: true },
    { key: 'status', label: 'Status', type: 'select', options: LEARNING_STATUSES, half: true },
    { key: 'priority', label: 'Priority', type: 'select', options: PRIORITIES, half: true },
    { key: 'dueDate', label: 'Due date', type: 'date', half: true },
    { key: 'estimatedMinutes', label: 'Est. minutes', type: 'number', min: 0, step: 15, half: true },
    { key: 'description', label: 'Description', type: 'textarea', rows: 2 },
  ];

  openFormDialog({
    title: isEdit ? 'Edit resource' : 'Add resource',
    fields,
    values: isEdit ? resource : {},
    saveLabel: isEdit ? 'Save changes' : 'Add resource',
    deleteLabel: 'Delete resource',
    onDelete: isEdit ? () => {
      const idx = resources.findIndex((r) => r.id === resource.id);
      if (idx !== -1) resources.splice(idx, 1);
      saveResources();
      onSaved?.();
    } : undefined,
    onSave: (values) => {
      if (isEdit) {
        Object.assign(resource, values);
        resource.updatedAt = new Date().toISOString().slice(0, 10);
        saveResources();
      } else {
        const today = new Date().toISOString().slice(0, 10);
        const r = {
          ...values,
          id: createResourceId(),
          units: [],
          tags: [],
          favorite: false,
          archived: false,
          linkedGoalIds: [],
          linkedProjectIds: [],
          linkedHabitIds: [],
          createdAt: today,
          updatedAt: today,
        };
        resources.unshift(r);
        saveResources();
      }
      onSaved?.();
      return true;
    },
  });
}

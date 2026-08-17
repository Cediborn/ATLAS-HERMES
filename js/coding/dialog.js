// Atlas — Coding item create/edit/delete dialog. Thin wrapper over the shared form dialog.

import { openFormDialog } from '../form-dialog.js';
import { saveCodingItems } from '../persistence.js';
import { codingItems, createCodingItemId, CODING_STATUSES, DIFFICULTIES, CODING_LANGUAGES, CODING_SOURCES, CODING_TOPICS, TOPIC_CONFIG } from './data.js';

const KIND_OPTIONS = [
  { value: 'problem', label: 'Problem' },
  { value: 'build', label: 'Build' },
];

export function openCodingDialog(mode, item, onSaved) {
  const isEdit = mode === 'edit';
  const fields = [
    { key: 'title', label: 'Title', type: 'text', placeholder: 'e.g. LRU Cache', required: true },
    { key: 'kind', label: 'Kind', type: 'select', options: KIND_OPTIONS, half: true },
    { key: 'source', label: 'Source', type: 'select', options: CODING_SOURCES, half: true },
    { key: 'difficulty', label: 'Difficulty', type: 'select', options: DIFFICULTIES, half: true },
    { key: 'status', label: 'Status', type: 'select', options: CODING_STATUSES, half: true },
    { key: 'languages', label: 'Languages', type: 'tags', placeholder: 'Comma-separated, e.g. JavaScript, Python', half: true },
    { key: 'topics', label: 'Topics', type: 'tags', placeholder: 'Comma-separated, e.g. algorithms, sql', half: true },
    { key: 'timeSpentMin', label: 'Time spent (min)', type: 'number', min: 0, step: 5, half: true },
    { key: 'notes', label: 'Notes', type: 'textarea', rows: 2 },
  ];

  openFormDialog({
    title: isEdit ? 'Edit item' : 'New item',
    fields,
    values: isEdit ? item : {},
    saveLabel: isEdit ? 'Save changes' : 'Add item',
    deleteLabel: 'Delete item',
    onDelete: isEdit ? () => {
      const idx = codingItems.findIndex((c) => c.id === item.id);
      if (idx !== -1) codingItems.splice(idx, 1);
      saveCodingItems();
      onSaved?.();
    } : undefined,
    onSave: (values) => {
      if (isEdit) {
        Object.assign(item, values);
        item.languages = item.languages.length ? item.languages : ['JavaScript'];
        item.topics = item.topics || [];
        saveCodingItems();
      } else {
        const today = new Date().toISOString().slice(0, 10);
        const c = {
          ...values,
          id: createCodingItemId(),
          languages: values.languages?.length ? values.languages : ['JavaScript'],
          topics: values.topics || [],
          steps: [],
          lastPracticed: null,
          favorite: false,
          linkedGoals: [],
          linkedProjects: [],
          linkedHabits: [],
          timeSpentMin: values.timeSpentMin || 0,
          createdAt: today,
        };
        codingItems.unshift(c);
        saveCodingItems();
      }
      onSaved?.();
      return true;
    },
  });
}

// Atlas — Project create/edit/delete dialog. Built on the shared form dialog;
// this file only declares the project field schema and the persistence hooks.

import { openFormDialog } from '../form-dialog.js';
import { saveProjects } from '../persistence.js';
import { projects, STATUSES, PRIORITIES, PROJECT_COLORS, PROJECT_ICONS, createProjectId, newProjectDefaults, recomputeProjectProgress } from './data.js';
import { goals } from '../goals/data.js';
import { resources } from '../learning/data.js';

export function openProjectDialog(mode, project, onSaved) {
  const isEdit = mode === 'edit';

  const fields = [
    { key: 'title', label: 'Title', type: 'text', placeholder: 'e.g. Build Atlas', required: true },
    { key: 'description', label: 'Description', type: 'textarea', rows: 2 },
    { key: 'status', label: 'Status', type: 'select', options: STATUSES },
    { key: 'priority', label: 'Priority', type: 'select', options: PRIORITIES, half: true },
    { key: 'deadline', label: 'Deadline', type: 'date', half: true },
    { key: 'color', label: 'Color', type: 'select', options: PROJECT_COLORS.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) })), half: true },
    { key: 'icon', label: 'Icon', type: 'select', options: PROJECT_ICONS, half: true },
    { key: 'tags', label: 'Tags', type: 'tags', placeholder: 'Comma-separated, e.g. Atlas, Design' },
    { key: 'linkedGoalId', label: 'Linked goal', type: 'select', options: [{ value: '', label: 'None' }, ...goals.map((g) => ({ value: g.id, label: g.title }))], half: true },
    { key: 'linkedResourceIds', label: 'Linked learning', type: 'select', options: [{ value: '', label: 'None' }, ...resources.map((r) => ({ value: r.id, label: r.title }))], half: true },
  ];

  openFormDialog({
    title: isEdit ? 'Edit project' : 'New project',
    fields,
    values: isEdit ? project : {},
    saveLabel: isEdit ? 'Save changes' : 'Create project',
    deleteLabel: 'Delete project',
    onDelete: isEdit ? () => {
      const idx = projects.findIndex((p) => p.id === project.id);
      if (idx !== -1) projects.splice(idx, 1);
      saveProjects();
      onSaved?.();
    } : undefined,
    onSave: (values) => {
      if (isEdit) {
        Object.assign(project, values);
        project.updatedAt = new Date().toISOString().slice(0, 10);
        recomputeProjectProgress(project);
        saveProjects();
      } else {
        const p = {
          ...newProjectDefaults(),
          ...values,
          id: createProjectId(),
          tasks: [],
          linkedGoalId: values.linkedGoalId || null,
          linkedResourceIds: values.linkedResourceIds ? [values.linkedResourceIds] : [],
        };
        recomputeProjectProgress(p);
        projects.unshift(p);
        saveProjects();
      }
      onSaved?.();
      return true;
    },
  });
}

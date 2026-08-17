// Atlas — Shared form dialog.
//
// One schema-driven modal for create/edit/delete across the modules that
// previously had no real forms (Projects, Goals, Learning, Books, Coding,
// Finance). Same shell pattern and classes as the existing habit dialog
// (`.habit-dialog-shell` etc.) so it looks native, but the fields are declared
// per module instead of hand-written per module — six bespoke dialogs with
// identical focus-trap/validation plumbing would be six copies of the same
// bug surface.
//
// Usage:
//   openFormDialog({
//     title: 'New Project',
//     fields: [
//       { key: 'title', label: 'Title', type: 'text', required: true },
//       { key: 'status', label: 'Status', type: 'select', options: ['Not Started', 'In Progress'] },
//       { key: 'tags', label: 'Tags', type: 'tags' },
//     ],
//     values: existingProject,       // omit for create
//     onSave: (values) => { ...mutate data + persist...; return true; },
//     onDelete: () => { ... },       // presence of this callback shows Delete
//     deleteLabel: 'Delete project',
//   });

import { icon } from './icons.js';

let els = null;
let lastFocused = null;
let current = null;

function ensureShell() {
  if (els) return;
  const root = document.body;
  root.insertAdjacentHTML(
    'beforeend',
    '<div class="overlay habit-dialog-overlay" id="form-dialog-overlay" hidden><div class="habit-dialog-shell" id="form-dialog-shell" role="dialog" aria-modal="true"></div></div>'
  );
  els = { overlay: document.getElementById('form-dialog-overlay'), shell: document.getElementById('form-dialog-shell') };
  els.overlay.addEventListener('click', (e) => {
    if (e.target === els.overlay) closeFormDialog();
  });
  document.addEventListener('keydown', (e) => {
    if (els.overlay.hidden) return;
    if (e.key === 'Escape') closeFormDialog();
    else if (e.key === 'Tab') trapFocus(e);
  });
}

function trapFocus(e) {
  const focusable = els.shell.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

export function closeFormDialog() {
  if (!els) return;
  els.overlay.hidden = true;
  document.body.style.overflow = '';
  if (lastFocused) lastFocused.focus();
  current = null;
}

function escAttr(str) {
  return String(str ?? '').replace(/"/g, '&quot;');
}

function normalizeOptions(options) {
  return options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
}

function fieldMarkup(field, value) {
  const v = value == null ? '' : value;
  switch (field.type) {
    case 'textarea':
      return `<textarea id="fd-${field.key}" rows="${field.rows || 3}" ${field.placeholder ? `placeholder="${escAttr(field.placeholder)}"` : ''}>${escAttr(v)}</textarea>`;
    case 'number':
      return `<input id="fd-${field.key}" type="number" ${field.min != null ? `min="${field.min}"` : ''} ${field.step != null ? `step="${field.step}"` : ''} value="${escAttr(v)}" />`;
    case 'date':
      return `<input id="fd-${field.key}" type="date" value="${escAttr(v)}" />`;
    case 'time':
      return `<input id="fd-${field.key}" type="time" value="${escAttr(v)}" />`;
    case 'checkbox':
      return `<label class="habit-dialog__checkbox"><input id="fd-${field.key}" type="checkbox" ${v ? 'checked' : ''} /> ${escAttr(field.checkLabel || field.label)}</label>`;
    case 'select': {
      const options = normalizeOptions(field.options || []);
      const sel = (field.value ?? v) ?? (field.default ?? '');
      return `<select id="fd-${field.key}">${options
        .map((o) => `<option value="${escAttr(o.value)}" ${String(sel) === String(o.value) ? 'selected' : ''}>${escAttr(o.label)}</option>`)
        .join('')}</select>`;
    }
    case 'tags': {
      const list = Array.isArray(v) ? v.join(', ') : String(v || '');
      return `<input id="fd-${field.key}" type="text" value="${escAttr(list)}" placeholder="${escAttr(field.placeholder || 'Comma-separated')}" />`;
    }
    case 'text':
    default:
      return `<input id="fd-${field.key}" type="text" value="${escAttr(v)}" ${field.placeholder ? `placeholder="${escAttr(field.placeholder)}"` : ''} />`;
  }
}

export function openFormDialog({ title, fields, values = {}, onSave, onDelete, deleteLabel = 'Delete', saveLabel = 'Save' }) {
  ensureShell();
  current = { fields, onSave, onDelete };
  lastFocused = document.activeElement;
  els.overlay.hidden = false;
  document.body.style.overflow = 'hidden';

  els.shell.setAttribute('aria-label', title);
  els.shell.innerHTML = `
    <form class="habit-dialog" id="form-dialog-form" novalidate>
      <header class="habit-dialog__header">
        <h2>${escAttr(title)}</h2>
        <button type="button" class="icon-btn" id="fd-close" aria-label="Close">${icon('x', { size: 18 })}</button>
      </header>

      <div class="habit-dialog__body">
        ${fields
          .map((f) => {
            const value = f.key === 'id' ? values.id : values[f.key];
            if (f.type === 'checkbox') {
              return `<div class="field">${fieldMarkup(f, value)}</div>`;
            }
            if (f.half) {
              // `half: true` pairs with the next field into a two-column row.
              return `<div class="field" data-half="${f.key}"><label for="fd-${f.key}">${escAttr(f.label)}</label>${fieldMarkup(f, value)}</div>`;
            }
            return `<div class="field"><label for="fd-${f.key}">${escAttr(f.label)}</label>${fieldMarkup(f, value)}</div>`;
          })
          .join('')}
      </div>

      <footer class="habit-dialog__footer">
        ${onDelete ? `<button type="button" class="btn btn--secondary" id="fd-delete">${icon('trash', { size: 15 })}<span>${escAttr(deleteLabel)}</span></button>` : '<span></span>'}
        <div class="habit-dialog__footer-right">
          <button type="button" class="btn btn--secondary" id="fd-cancel">Cancel</button>
          <button type="submit" class="btn btn--primary" id="fd-save">${escAttr(saveLabel)}</button>
        </div>
      </footer>
    </form>`;

  // Group consecutive `half` fields into two-column rows without breaking
  // the flat field order in the DOM.
  const body = els.shell.querySelector('.habit-dialog__body');
  const halfFields = body.querySelectorAll('[data-half]');
  if (halfFields.length) {
    const toWrap = [];
    for (const el of body.children) {
      if (el.hasAttribute('data-half')) toWrap.push(el);
    }
    for (let i = 0; i < toWrap.length; i += 2) {
      const a = toWrap[i];
      const b = toWrap[i + 1];
      if (!b) break;
      const row = document.createElement('div');
      row.className = 'habit-dialog__row';
      a.parentNode.insertBefore(row, a);
      row.appendChild(a);
      row.appendChild(b);
    }
  }

  wireEvents();
  const firstFocus = els.shell.querySelector('#fd-' + (fields[0]?.key || ''));
  (firstFocus || els.shell.querySelector('input, select, textarea'))?.focus();
}

function wireEvents() {
  const form = document.getElementById('form-dialog-form');
  document.getElementById('fd-close').addEventListener('click', closeFormDialog);
  document.getElementById('fd-cancel').addEventListener('click', closeFormDialog);

  const deleteBtn = document.getElementById('fd-delete');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      const proceed = window.confirm('Delete this item? This can\u2019t be undone.');
      if (!proceed) return;
      closeFormDialog();
      current?.onDelete?.();
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!current) return;
    const values = {};
    let valid = true;
    for (const field of current.fields) {
      if (field.type === 'checkbox') {
        values[field.key] = document.getElementById(`fd-${field.key}`).checked;
        continue;
      }
      const el = document.getElementById(`fd-${field.key}`);
      let val = el.value;
      if (field.type === 'number') {
        val = val === '' ? null : Number(val);
        if (field.min != null && val != null && val < field.min) {
          el.focus();
          valid = false;
          break;
        }
      }
      if (field.type === 'tags') {
        val = val.split(',').map((t) => t.trim()).filter(Boolean);
      }
      values[field.key] = val;
      if (field.required && (!val || (Array.isArray(val) && !val.length))) {
        showFieldError(field, 'This field is required.');
        el.focus();
        valid = false;
        break;
      }
      clearFieldError(field);
    }
    if (!valid) return;
    const keepOpen = current.onSave(values);
    if (keepOpen === false) return; // caller wants to keep the dialog open
    closeFormDialog();
  });
}

function showFieldError(field, message) {
  const el = document.getElementById(`fd-${field.key}`);
  el?.closest('.field')?.querySelector('.form-dialog__error')?.remove();
  const err = document.createElement('p');
  err.className = 'habit-dialog__error form-dialog__error';
  err.textContent = message;
  el?.closest('.field')?.appendChild(err);
}

function clearFieldError(field) {
  document.getElementById(`fd-${field.key}`)?.closest('.field')?.querySelector('.form-dialog__error')?.remove();
}

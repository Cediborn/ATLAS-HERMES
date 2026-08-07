// Atlas — Habit create/edit dialog. Same shell pattern as
// calendar/event-panel.js (overlay + role="dialog" + focus trap) — a
// second, independent implementation rather than importing calendar's,
// since the two forms share nothing but the container shape.

import { icon } from '../icons.js';
import { CATEGORY_CONFIG, CATEGORIES, PRIORITIES, FREQUENCIES, FREQUENCY_CONFIG, WEEKDAY_LABELS, HABIT_COLORS } from './data.js';
import { createHabit, updateHabit, deleteHabit } from './state.js';
import { projects } from '../projects/data.js';

const ICON_CHOICES = ['flame', 'sun', 'moon', 'heart', 'bookOpen', 'book', 'code', 'sparkle', 'target', 'wallet', 'fileText', 'repeat'];

let els = null;
let lastFocused = null;
let onSavedCallback = null;

function ensureShell() {
  if (els) return;
  const root = document.body;
  root.insertAdjacentHTML(
    'beforeend',
    '<div class="overlay habit-dialog-overlay" id="habit-dialog-overlay" hidden><div class="habit-dialog-shell" id="habit-dialog-shell" role="dialog" aria-modal="true"></div></div>'
  );
  els = { overlay: document.getElementById('habit-dialog-overlay'), shell: document.getElementById('habit-dialog-shell') };
  els.overlay.addEventListener('click', (e) => {
    if (e.target === els.overlay) closeHabitDialog();
  });
  document.addEventListener('keydown', (e) => {
    if (els.overlay.hidden) return;
    if (e.key === 'Escape') closeHabitDialog();
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

export function closeHabitDialog() {
  if (!els) return;
  els.overlay.hidden = true;
  document.body.style.overflow = '';
  if (lastFocused) lastFocused.focus();
}

function openOverlay() {
  ensureShell();
  lastFocused = document.activeElement;
  els.overlay.hidden = false;
  document.body.style.overflow = 'hidden';
}

export function openHabitDialog(mode, existingOrNull, onSaved) {
  openOverlay();
  onSavedCallback = onSaved || null;
  renderDialog(mode, existingOrNull);
}

function renderDialog(mode, existing) {
  const isEdit = mode === 'edit';
  const base = isEdit
    ? existing
    : {
        id: null, title: '', description: '', category: 'morning', icon: 'flame', color: 'blue',
        frequency: 'daily', customDays: [], reminderTime: null, goal: null, priority: 'Medium',
        tags: [], notes: '', favorite: false, archived: false, linkedProjectId: null,
      };

  els.shell.setAttribute('aria-label', isEdit ? 'Edit habit' : 'New habit');
  els.shell.innerHTML = `
    <form class="habit-dialog" id="habit-dialog-form" novalidate>
      <header class="habit-dialog__header">
        <h2>${isEdit ? 'Edit habit' : 'New habit'}</h2>
        <button type="button" class="icon-btn" id="hd-close" aria-label="Close">${icon('x', { size: 18 })}</button>
      </header>

      <div class="habit-dialog__body">
        <div class="field"><label for="hd-title">Title</label><input id="hd-title" type="text" value="${escapeAttr(base.title)}" placeholder="e.g. Morning run" required /></div>
        <p class="habit-dialog__error" id="hd-title-error" hidden>Title is required.</p>

        <div class="field"><label for="hd-description">Description</label><textarea id="hd-description" rows="2" placeholder="Optional">${escapeAttr(base.description)}</textarea></div>

        <div class="habit-dialog__row">
          <div class="field"><label for="hd-category">Category</label>
            <select id="hd-category">${CATEGORIES.map((c) => `<option value="${c}" ${c === base.category ? 'selected' : ''}>${CATEGORY_CONFIG[c].label}</option>`).join('')}</select>
          </div>
          <div class="field"><label for="hd-icon">Icon</label>
            <select id="hd-icon">${ICON_CHOICES.map((i) => `<option value="${i}" ${i === base.icon ? 'selected' : ''}>${i}</option>`).join('')}</select>
          </div>
          <div class="field"><label for="hd-color">Color</label>
            <select id="hd-color">${HABIT_COLORS.map((c) => `<option value="${c}" ${c === base.color ? 'selected' : ''}>${c[0].toUpperCase()}${c.slice(1)}</option>`).join('')}</select>
          </div>
        </div>

        <div class="field"><label for="hd-frequency">Frequency</label>
          <select id="hd-frequency">${FREQUENCIES.map((f) => `<option value="${f}" ${f === base.frequency ? 'selected' : ''}>${FREQUENCY_CONFIG[f].label}</option>`).join('')}</select>
        </div>
        <div class="habit-dialog__day-picker" id="hd-days-row" ${base.frequency === 'custom' ? '' : 'hidden'}>
          ${WEEKDAY_LABELS.map((label, i) => `
            <label class="habit-dialog__day"><input type="checkbox" value="${i}" ${(base.customDays || []).includes(i) ? 'checked' : ''} /> ${label}</label>`).join('')}
        </div>
        <p class="habit-dialog__error" id="hd-days-error" hidden>Pick at least one day.</p>

        <div class="habit-dialog__row">
          <label class="habit-dialog__checkbox"><input type="checkbox" id="hd-reminder-enabled" ${base.reminderTime ? 'checked' : ''} /> Reminder</label>
          <div class="field" id="hd-reminder-time-wrap" ${base.reminderTime ? '' : 'hidden'}><input id="hd-reminder-time" type="time" value="${base.reminderTime || '09:00'}" /></div>
        </div>

        <div class="habit-dialog__row">
          <label class="habit-dialog__checkbox"><input type="checkbox" id="hd-goal-enabled" ${base.goal ? 'checked' : ''} /> Goal</label>
          <div class="field" id="hd-goal-wrap" ${base.goal ? '' : 'hidden'}>
            <div class="habit-dialog__goal-inputs">
              <input id="hd-goal-value" type="number" min="1" step="1" value="${base.goal ? base.goal.targetValue : 1}" placeholder="Amount" />
              <input id="hd-goal-unit" type="text" value="${escapeAttr(base.goal ? base.goal.unit : '')}" placeholder="unit, e.g. pages" />
            </div>
          </div>
        </div>

        <div class="habit-dialog__row">
          <div class="field"><label for="hd-priority">Priority</label>
            <select id="hd-priority">${PRIORITIES.map((p) => `<option value="${p}" ${p === base.priority ? 'selected' : ''}>${p}</option>`).join('')}</select>
          </div>
          <div class="field"><label for="hd-project">Linked project</label>
            <select id="hd-project">
              <option value="">None</option>
              ${projects.map((p) => `<option value="${p.id}" ${p.id === base.linkedProjectId ? 'selected' : ''}>${p.title}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="field"><label for="hd-tags">Tags</label><input id="hd-tags" type="text" value="${escapeAttr((base.tags || []).join(', '))}" placeholder="Comma-separated, e.g. Wellness, Morning" /></div>
        <div class="field"><label for="hd-notes">Notes</label><textarea id="hd-notes" rows="2">${escapeAttr(base.notes)}</textarea></div>

        ${isEdit ? `<label class="habit-dialog__checkbox"><input type="checkbox" id="hd-archived" ${base.archived ? 'checked' : ''} /> Archived</label>` : ''}
      </div>

      <footer class="habit-dialog__footer">
        ${isEdit ? `<button type="button" class="btn btn--secondary" id="hd-delete">Delete</button>` : '<span></span>'}
        <div class="habit-dialog__footer-right">
          <button type="button" class="btn btn--secondary" id="hd-cancel">Cancel</button>
          <button type="submit" class="btn btn--primary" id="hd-save">Save</button>
        </div>
      </footer>
    </form>`;

  wireDialogEvents(mode, base);
  document.getElementById('hd-title').focus();
}

function escapeAttr(str) {
  return String(str ?? '').replace(/"/g, '&quot;');
}

function wireDialogEvents(mode, base) {
  const isEdit = mode === 'edit';
  const form = document.getElementById('habit-dialog-form');
  const freqSelect = document.getElementById('hd-frequency');
  const daysRow = document.getElementById('hd-days-row');
  const reminderBox = document.getElementById('hd-reminder-enabled');
  const reminderWrap = document.getElementById('hd-reminder-time-wrap');
  const goalBox = document.getElementById('hd-goal-enabled');
  const goalWrap = document.getElementById('hd-goal-wrap');

  document.getElementById('hd-close').addEventListener('click', closeHabitDialog);
  document.getElementById('hd-cancel').addEventListener('click', closeHabitDialog);

  freqSelect.addEventListener('change', () => {
    daysRow.hidden = freqSelect.value !== 'custom';
  });
  reminderBox.addEventListener('change', () => {
    reminderWrap.hidden = !reminderBox.checked;
  });
  goalBox.addEventListener('change', () => {
    goalWrap.hidden = !goalBox.checked;
  });

  if (isEdit) {
    document.getElementById('hd-delete').addEventListener('click', () => {
      deleteHabit(base.id);
      closeHabitDialog();
      onSavedCallback?.();
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitDialog(mode, base);
  });
}

function submitDialog(mode, base) {
  const title = document.getElementById('hd-title').value.trim();
  const titleError = document.getElementById('hd-title-error');
  titleError.hidden = Boolean(title);
  if (!title) {
    document.getElementById('hd-title').focus();
    return;
  }

  const frequency = document.getElementById('hd-frequency').value;
  let customDays = null;
  if (frequency === 'custom') {
    customDays = Array.from(document.querySelectorAll('#hd-days-row input:checked')).map((el) => Number(el.value));
    const daysError = document.getElementById('hd-days-error');
    daysError.hidden = customDays.length > 0;
    if (!customDays.length) return;
  }

  const reminderEnabled = document.getElementById('hd-reminder-enabled').checked;
  const reminderTime = reminderEnabled ? document.getElementById('hd-reminder-time').value || '09:00' : null;

  const goalEnabled = document.getElementById('hd-goal-enabled').checked;
  const goal = goalEnabled
    ? { targetValue: Math.max(1, Number(document.getElementById('hd-goal-value').value) || 1), unit: document.getElementById('hd-goal-unit').value.trim() || 'times' }
    : null;

  const tags = document.getElementById('hd-tags').value.split(',').map((t) => t.trim()).filter(Boolean);
  const linkedProjectId = document.getElementById('hd-project').value || null;

  const payload = {
    title,
    description: document.getElementById('hd-description').value.trim(),
    category: document.getElementById('hd-category').value,
    icon: document.getElementById('hd-icon').value,
    color: document.getElementById('hd-color').value,
    frequency, customDays,
    reminderTime, goal,
    priority: document.getElementById('hd-priority').value,
    tags,
    notes: document.getElementById('hd-notes').value.trim(),
    linkedProjectId,
  };

  if (mode === 'edit') {
    payload.archived = document.getElementById('hd-archived').checked;
    updateHabit(base.id, payload);
  } else {
    createHabit(payload);
  }

  closeHabitDialog();
  onSavedCallback?.();
}

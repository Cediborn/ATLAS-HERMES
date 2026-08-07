// Atlas — Full-screen note editor. The one interaction in Notes that has no
// Projects equivalent: a true viewport takeover (not a side panel), with its
// own focus trap since it has several focusable controls, not just one input.

import { icon } from '../icons.js';
import { CATEGORIES } from './data.js';
import { wordCount, charCount, readingTime, timeAgo } from './state.js';
import { renderMarkdown } from './markdown.js';

let els = {};
let currentNote = null;
let lastFocused = null;
let saveTimer = null;
let initialSnapshot = '';
let onChangeCb = null;
let onDiscardEmptyCb = null;

export function initEditor(root, { onChange, onDiscardEmpty } = {}) {
  onChangeCb = onChange;
  onDiscardEmptyCb = onDiscardEmpty;
  root.insertAdjacentHTML('beforeend', editorMarkup());
  cacheEls();
  wireEvents();
}

function editorMarkup() {
  return `
    <div class="overlay note-editor-overlay" id="note-editor-overlay" hidden>
      <div class="note-editor" role="dialog" aria-modal="true" aria-label="Note editor">
        <header class="note-editor__topbar">
          <button type="button" class="icon-btn" id="editor-close" aria-label="Close editor">${icon('x', { size: 20 })}</button>
          <input type="text" class="note-editor__title-input" id="editor-title" placeholder="Untitled note" aria-label="Note title" />
          <div class="note-editor__topbar-actions">
            <select id="editor-category" class="note-editor__category-select" aria-label="Category">
              ${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('')}
            </select>
            <button type="button" class="icon-btn" id="editor-pin" aria-label="Pin note" aria-pressed="false">${icon('pin', { size: 17 })}</button>
            <button type="button" class="icon-btn" id="editor-favorite" aria-label="Favorite note" aria-pressed="false">${icon('star', { size: 17 })}</button>
            <button type="button" class="icon-btn" id="editor-archive" aria-label="Archive note" aria-pressed="false">${icon('archive', { size: 17 })}</button>
          </div>
        </header>

        <div class="note-editor__tabs" role="tablist" aria-label="Editor mode">
          <button type="button" class="note-editor__tab is-active" data-tab="edit" role="tab" aria-selected="true" id="editor-tab-edit">Edit</button>
          <button type="button" class="note-editor__tab" data-tab="preview" role="tab" aria-selected="false" id="editor-tab-preview">Preview</button>
          <span class="note-editor__save-status" id="editor-save-status" aria-live="polite">Saved</span>
        </div>

        <div class="note-editor__body">
          <textarea id="editor-textarea" class="note-editor__textarea" placeholder="Start writing in Markdown\u2026" aria-label="Note content"></textarea>
          <div id="editor-preview" class="note-editor__preview md-preview" hidden></div>
        </div>

        <footer class="note-editor__footer">
          <span id="editor-word-count">0 words</span>
          <span aria-hidden="true">\u00b7</span>
          <span id="editor-char-count">0 characters</span>
          <span aria-hidden="true">\u00b7</span>
          <span id="editor-reading-time">1 min read</span>
          <span class="note-editor__footer-spacer"></span>
          <span id="editor-last-edited"></span>
        </footer>
      </div>
    </div>`;
}

function cacheEls() {
  els = {
    overlay: document.getElementById('note-editor-overlay'),
    close: document.getElementById('editor-close'),
    title: document.getElementById('editor-title'),
    category: document.getElementById('editor-category'),
    pin: document.getElementById('editor-pin'),
    favorite: document.getElementById('editor-favorite'),
    archive: document.getElementById('editor-archive'),
    tabEdit: document.getElementById('editor-tab-edit'),
    tabPreview: document.getElementById('editor-tab-preview'),
    saveStatus: document.getElementById('editor-save-status'),
    textarea: document.getElementById('editor-textarea'),
    preview: document.getElementById('editor-preview'),
    wordCountEl: document.getElementById('editor-word-count'),
    charCountEl: document.getElementById('editor-char-count'),
    readingTimeEl: document.getElementById('editor-reading-time'),
    lastEditedEl: document.getElementById('editor-last-edited'),
  };
}

function wireEvents() {
  els.close.addEventListener('click', closeEditor);
  els.overlay.addEventListener('click', (e) => {
    if (e.target === els.overlay) closeEditor();
  });

  document.addEventListener('keydown', (e) => {
    if (els.overlay.hidden) return;
    if (e.key === 'Escape') closeEditor();
    else if (e.key === 'Tab') trapFocus(e);
  });

  els.title.addEventListener('input', scheduleSave);
  els.textarea.addEventListener('input', () => {
    updateMetrics();
    scheduleSave();
  });

  els.category.addEventListener('change', () => {
    if (currentNote) {
      currentNote.category = els.category.value;
      onChangeCb?.();
    }
  });

  els.pin.addEventListener('click', () => toggleFlag('pinned', els.pin));
  els.favorite.addEventListener('click', () => toggleFlag('favorite', els.favorite));
  els.archive.addEventListener('click', () => toggleFlag('archived', els.archive));

  els.tabEdit.addEventListener('click', () => switchTab('edit'));
  els.tabPreview.addEventListener('click', () => switchTab('preview'));
}

function trapFocus(e) {
  const focusable = Array.from(els.overlay.querySelectorAll('button, input, select, textarea, a[href]'))
    .filter((el) => !el.disabled && el.offsetParent !== null);
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

function toggleFlag(field, buttonEl) {
  if (!currentNote) return;
  currentNote[field] = !currentNote[field];
  buttonEl.setAttribute('aria-pressed', String(currentNote[field]));
  buttonEl.classList.toggle('is-active', currentNote[field]);
  onChangeCb?.();
}

function switchTab(tab) {
  const isEdit = tab === 'edit';
  els.tabEdit.classList.toggle('is-active', isEdit);
  els.tabEdit.setAttribute('aria-selected', String(isEdit));
  els.tabPreview.classList.toggle('is-active', !isEdit);
  els.tabPreview.setAttribute('aria-selected', String(!isEdit));
  els.textarea.hidden = !isEdit;
  els.preview.hidden = isEdit;
  if (!isEdit) {
    const html = renderMarkdown(els.textarea.value);
    els.preview.innerHTML = html || '<p class="note-editor__preview-empty">Nothing to preview yet.</p>';
  }
}

function scheduleSave() {
  showStatus('saving');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(commitNow, 600);
}

function commitNow() {
  if (!currentNote) return;
  const snapshot = JSON.stringify({ title: els.title.value, content: els.textarea.value });
  if (snapshot !== initialSnapshot) {
    currentNote.title = els.title.value;
    currentNote.content = els.textarea.value;
    currentNote.updatedAt = new Date().toISOString().slice(0, 10);
    initialSnapshot = snapshot;
    updateLastEdited();
    onChangeCb?.();
  }
  showStatus('saved');
}

function showStatus(status) {
  els.saveStatus.textContent = status === 'saving' ? 'Saving\u2026' : 'Saved';
  els.saveStatus.classList.toggle('is-saving', status === 'saving');
}

function updateMetrics() {
  const text = els.textarea.value;
  els.wordCountEl.textContent = `${wordCount(text)} words`;
  els.charCountEl.textContent = `${charCount(text)} characters`;
  els.readingTimeEl.textContent = `${readingTime(text)} min read`;
}

function updateLastEdited() {
  els.lastEditedEl.textContent = currentNote ? `Edited ${timeAgo(currentNote.updatedAt)}` : '';
}

export function openEditor(note) {
  currentNote = note;
  lastFocused = document.activeElement;
  initialSnapshot = JSON.stringify({ title: note.title, content: note.content });

  els.title.value = note.title;
  els.category.value = note.category;
  els.textarea.value = note.content;

  els.pin.setAttribute('aria-pressed', String(note.pinned));
  els.pin.classList.toggle('is-active', note.pinned);
  els.favorite.setAttribute('aria-pressed', String(note.favorite));
  els.favorite.classList.toggle('is-active', note.favorite);
  els.archive.setAttribute('aria-pressed', String(note.archived));
  els.archive.classList.toggle('is-active', note.archived);

  switchTab('edit');
  updateMetrics();
  updateLastEdited();
  showStatus('saved');

  els.overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  els.title.focus();
}

export function closeEditor() {
  if (els.overlay.hidden) return;
  clearTimeout(saveTimer);
  commitNow();

  const isEmpty = currentNote && !currentNote.title.trim() && !currentNote.content.trim();
  const closingNote = currentNote;

  els.overlay.hidden = true;
  document.body.style.overflow = '';
  currentNote = null;
  lastFocused?.focus?.();

  if (isEmpty) onDiscardEmptyCb?.(closingNote);
}

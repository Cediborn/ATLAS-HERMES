// Atlas — Book create/edit/delete dialog. Thin wrapper over the shared form dialog.

import { openFormDialog } from '../form-dialog.js';
import { saveBooks } from '../persistence.js';
import { books, createBookId, BOOK_STATUSES, BOOK_GENRES, GENRE_CONFIG, BOOK_FORMATS, FORMAT_CONFIG } from './data.js';

export function openBookDialog(mode, book, onSaved) {
  const isEdit = mode === 'edit';
  const fields = [
    { key: 'title', label: 'Title', type: 'text', placeholder: 'e.g. Deep Work', required: true },
    { key: 'author', label: 'Author', type: 'text', required: true, half: true },
    { key: 'genre', label: 'Genre', type: 'select', options: BOOK_GENRES.map((g) => ({ value: g, label: GENRE_CONFIG[g].label })), half: true },
    { key: 'format', label: 'Format', type: 'select', options: BOOK_FORMATS.map((f) => ({ value: f, label: FORMAT_CONFIG[f].label })), half: true },
    { key: 'status', label: 'Status', type: 'select', options: BOOK_STATUSES, half: true },
    { key: 'pages', label: 'Pages', type: 'number', min: 0, step: 1, half: true },
    { key: 'pagesRead', label: 'Pages read', type: 'number', min: 0, step: 1, half: true },
    { key: 'rating', label: 'Rating (1–5)', type: 'number', min: 0, max: 5, step: 1, half: true },
    { key: 'notes', label: 'Notes', type: 'textarea', rows: 2 },
  ];

  openFormDialog({
    title: isEdit ? 'Edit book' : 'New book',
    fields,
    values: isEdit ? book : {},
    saveLabel: isEdit ? 'Save changes' : 'Add book',
    deleteLabel: 'Delete book',
    onDelete: isEdit ? () => {
      const idx = books.findIndex((b) => b.id === book.id);
      if (idx !== -1) books.splice(idx, 1);
      saveBooks();
      onSaved?.();
    } : undefined,
    onSave: (values) => {
      if (isEdit) {
        Object.assign(book, values);
        // Keep status/stamps coherent with pages read.
        if (book.pagesRead > 0 && !book.startedAt && book.status === 'Want to Read') {
          book.startedAt = new Date().toISOString().slice(0, 10);
          book.status = 'Reading';
        }
        if (book.pages && book.pagesRead >= book.pages && book.status === 'Reading') {
          book.status = 'Finished';
          book.finishedAt = book.finishedAt || new Date().toISOString().slice(0, 10);
        }
        saveBooks();
      } else {
        const today = new Date().toISOString().slice(0, 10);
        const b = {
          ...values,
          id: createBookId(),
          rating: values.rating || null,
          favorite: false,
          notes: values.notes || '',
          startedAt: null,
          finishedAt: null,
          linkedGoals: [],
          linkedHabits: [],
        };
        if (b.pagesRead > 0) {
          b.startedAt = today;
          if (b.status === 'Want to Read') b.status = 'Reading';
        }
        if (b.pages && b.pagesRead >= b.pages) {
          b.status = 'Finished';
          b.finishedAt = today;
        }
        books.unshift(b);
        saveBooks();
      }
      onSaved?.();
      return true;
    },
  });
}

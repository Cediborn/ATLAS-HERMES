// Atlas — Books components. Presentation-only functions returning markup —
// no DOM queries, no listeners, no state reads. view.js wires behavior on top.

import { icon } from '../icons.js';
import { Progress as BaseProgress, ProgressRing, emptyState, Badge } from '../components.js';
import { BOOK_STATUS_CONFIG, GENRE_CONFIG, FORMAT_CONFIG } from './data.js';
import { computeBookProgress, formatDate } from './state.js';

// ---- BookStatusBadge ------------------------------------------------------
export function BookStatusBadge({ status }) {
  const cfg = BOOK_STATUS_CONFIG[status] || { color: 'neutral' };
  return `<span class="book-status book-status--${cfg.color}">${status}</span>`;
}

// ---- BookGenre — icon + label, tinted with the genre's identity color ----
export function BookGenre({ genre, compact = false }) {
  const cfg = GENRE_CONFIG[genre] || { label: genre, icon: 'bookOpen', color: 'slate' };
  return `<span class="book-genre book-genre--${cfg.color}${compact ? ' book-genre--compact' : ''}">${icon(cfg.icon, { size: compact ? 12 : 13 })}<span>${cfg.label}</span></span>`;
}

// ---- BookFormat chip ------------------------------------------------------
export function BookFormat({ format }) {
  const cfg = FORMAT_CONFIG[format] || { label: format, icon: 'book' };
  return `<span class="book-format">${icon(cfg.icon, { size: 12 })}${cfg.label}</span>`;
}

// ---- BookRating — filled/empty star row ----
export function BookRating({ rating, size = 14 }) {
  if (typeof rating !== 'number' || rating < 1) return `<span class="book-rating book-rating--none">Not rated</span>`;
  const full = Math.round(rating);
  return `
    <span class="book-rating" role="img" aria-label="${rating} out of 5 stars">
      ${[1, 2, 3, 4, 5].map((n) => `<span class="book-rating__star${n <= full ? ' is-filled' : ''}">${icon('star', { size })}</span>`).join('')}
    </span>`;
}

// ---- BookProgress — 'bar' for cards/rows; 'ring' for the detail panel ----
export function BookProgress({ book, variant = 'bar', color = 'accent', size = 56 }) {
  const pct = computeBookProgress(book);
  if (variant === 'bar') return BaseProgress({ percentage: pct, color });
  return ProgressRing({ percentage: pct, color, size, showValue: true });
}

// ---- BookHeader — reused atop the card and the detail panel ----
export function BookHeader({ book }) {
  const genre = GENRE_CONFIG[book.genre] || { icon: 'bookOpen', color: 'slate' };
  return `
    <div class="book-header">
      <span class="book-header__icon book-header__icon--${genre.color}">${icon(genre.icon, { size: 20 })}</span>
      <div class="book-header__titles">
        <h3 class="book-header__title">${book.title}</h3>
        <div class="book-header__sub">by ${book.author}</div>
        <div class="book-header__badges">${BookStatusBadge({ status: book.status })}${BookFormat({ format: book.format })}${BookGenre({ genre: book.genre, compact: true })}</div>
      </div>
    </div>`;
}

// ---- BookCard — the Grid view's unit ----
export function BookCard({ book }) {
  const genre = GENRE_CONFIG[book.genre] || { icon: 'bookOpen', color: 'slate' };
  const progressColor = book.status === 'Finished' ? 'success' : book.status === 'Reading' ? 'accent' : 'neutral';
  return `
    <article class="book-card" data-id="${book.id}" tabindex="0" role="button" aria-label="Open ${book.title}">
      <div class="book-card__top">
        <span class="book-card__icon book-card__icon--${genre.color}">${icon(genre.icon, { size: 16 })}</span>
        <h3 class="book-card__title">${book.title}</h3>
        ${book.favorite ? `<span class="book-card__favorite">${icon('star', { size: 15 })}</span>` : ''}
      </div>
      <div class="book-card__author">${book.author}</div>
      <p class="book-card__desc">${book.notes ? book.notes : `${book.pages} pages \u00b7 ${GENRE_CONFIG[book.genre].label}`}</p>
      <div class="book-card__badges">${BookStatusBadge({ status: book.status })}${BookGenre({ genre: book.genre, compact: true })}</div>
      <div class="book-card__progress">
        ${BookProgress({ book, variant: 'bar', color: progressColor })}
        <span class="book-card__progress-value">${book.progress}%</span>
      </div>
      <div class="book-card__footer">
        <span class="book-card__pages">${icon('book', { size: 13 })}${book.pagesRead}/${book.pages} pages</span>
        ${typeof book.rating === 'number' ? BookRating({ rating: book.rating }) : ''}
      </div>
    </article>`;
}

// ---- BookRow — the List view's unit ----
export function BookRow({ book }) {
  const genre = GENRE_CONFIG[book.genre] || { icon: 'bookOpen', color: 'slate' };
  const progressColor = book.status === 'Finished' ? 'success' : book.status === 'Reading' ? 'accent' : 'neutral';
  return `
    <div class="book-row" data-id="${book.id}" tabindex="0" role="button" aria-label="Open ${book.title}">
      <span class="book-row__icon book-row__icon--${genre.color}">${icon(genre.icon, { size: 15 })}</span>
      <div class="book-row__body">
        <div class="book-row__title">${book.title}</div>
        <div class="book-row__meta">${book.author} · ${BookGenre({ genre: book.genre, compact: true })}</div>
      </div>
      <div class="book-row__progress">
        ${BookProgress({ book, variant: 'bar', color: progressColor })}
        <span class="book-row__pages">${book.pagesRead}/${book.pages}</span>
      </div>
      ${typeof book.rating === 'number' ? BookRating({ rating: book.rating }) : ''}
      <span class="book-row__status">${BookStatusBadge({ status: book.status })}</span>
      ${icon('chevronRight', { size: 16, className: 'book-row__chevron' })}
    </div>`;
}

// ---- BookEmptyState — thin wrapper around the app-wide emptyState() ----
export function BookEmptyState({ hasFilters }) {
  return hasFilters
    ? emptyState({ icon: 'search', title: 'No books match', description: 'Try adjusting your filters or search.', size: 'md' })
    : emptyState({ icon: 'book', title: 'No books yet', description: 'Add your first book to start a shelf.', size: 'md' });
}

// ---- BookSkeleton ---------------------------------------------------------
export function BookSkeleton({ count = 6 }) {
  return Array.from(
    { length: count },
    () => `
    <div class="book-card book-card--skeleton" aria-hidden="true">
      <div class="skeleton-block skeleton-block--title"></div>
      <div class="skeleton-block skeleton-block--text" style="width:60%"></div>
      <div class="skeleton-block skeleton-block--text"></div>
      <div class="skeleton-block skeleton-block--footer"></div>
    </div>`
  ).join('');
}

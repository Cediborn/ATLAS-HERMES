// Atlas — Notes components. Presentation-only, same discipline as the
// Projects module: no DOM queries, no event listeners here.

import { icon } from '../icons.js';
import { Tag, emptyState, ActionMenu } from '../components.js';
import { CATEGORY_CONFIG } from './data.js';
import { timeAgo } from './state.js';
import { stripMarkdown } from './markdown.js';

// ---- CategoryBadge ---------------------------------------------------------
export function CategoryBadge({ category }) {
  const cfg = CATEGORY_CONFIG[category] || { icon: 'fileText', color: 'slate' };
  return `<span class="category-badge category-badge--${cfg.color}">${icon(cfg.icon, { size: 13 })}<span>${category}</span></span>`;
}

// ---- NoteCard — the Grid (masonry) view's unit ----------------------------
export function NoteCard({ note: n }) {
  const cfg = CATEGORY_CONFIG[n.category] || { color: 'slate' };
  return `
    <article class="note-card note-card--${cfg.color}" data-id="${n.id}" tabindex="0" role="button" aria-label="Open ${n.title}">
      <div class="note-card__top">
        ${CategoryBadge({ category: n.category })}
        <div class="note-card__indicators">
          ${n.pinned ? `<span class="note-card__indicator" title="Pinned">${icon('pin', { size: 13 })}</span>` : ''}
          ${n.favorite ? `<span class="note-card__indicator note-card__indicator--favorite" title="Favorite">${icon('star', { size: 13 })}</span>` : ''}
        </div>
        ${ActionMenu({ id: n.id, itemLabel: n.title, favorite: n.favorite, pinned: n.pinned, archived: n.archived })}
      </div>
      <h3 class="note-card__title">${n.title}</h3>
      <p class="note-card__preview">${stripMarkdown(n.content, 220)}</p>
      <div class="note-card__tags">${n.tags.map((t) => Tag({ label: t })).join('')}</div>
      <div class="note-card__footer"><span class="note-card__updated">${timeAgo(n.updatedAt)}</span></div>
    </article>`;
}

// ---- NoteListRow — the List view's unit -----------------------------------
export function NoteListRow({ note: n }) {
  const cfg = CATEGORY_CONFIG[n.category] || { color: 'slate' };
  const visibleTags = n.tags.slice(0, 2);
  const overflow = n.tags.length - visibleTags.length;
  return `
    <div class="note-list-row" data-id="${n.id}" tabindex="0" role="button" aria-label="Open ${n.title}">
      <span class="note-list-row__dot note-list-row__dot--${cfg.color}" aria-hidden="true"></span>
      <span class="note-list-row__title">
        ${n.title}
        ${n.pinned ? icon('pin', { size: 12, className: 'note-list-row__pin' }) : ''}
        ${n.favorite ? icon('star', { size: 12, className: 'note-list-row__favorite' }) : ''}
      </span>
      <span class="note-list-row__category">${n.category}</span>
      <span class="note-list-row__tags">
        ${visibleTags.map((t) => Tag({ label: t })).join('')}
        ${overflow > 0 ? `<span class="note-list-row__tag-overflow">+${overflow}</span>` : ''}
      </span>
      <span class="note-list-row__updated">${timeAgo(n.updatedAt)}</span>
      ${ActionMenu({ id: n.id, itemLabel: n.title, favorite: n.favorite, pinned: n.pinned, archived: n.archived })}
    </div>`;
}

// ---- Empty state — thin wrapper around the app-wide emptyState() --------
export function NoteEmptyState({ hasFilters }) {
  return hasFilters
    ? emptyState({ icon: 'search', title: 'No notes match', description: 'Try adjusting your filters or search.', size: 'md' })
    : emptyState({ icon: 'fileText', title: 'No notes yet', description: 'Capture your ideas.', size: 'md' });
}

// ---- Skeleton — varying heights on purpose, to hint at the masonry layout
// even while loading ----
const SKELETON_HEIGHTS = [128, 176, 96, 152, 200, 112, 164, 136];

export function NoteSkeleton({ count = 8 }) {
  return Array.from(
    { length: count },
    (_, i) => `
    <div class="note-card note-card--skeleton" aria-hidden="true" style="height:${SKELETON_HEIGHTS[i % SKELETON_HEIGHTS.length]}px">
      <div class="skeleton-block skeleton-block--title"></div>
      <div class="skeleton-block skeleton-block--text"></div>
      <div class="skeleton-block skeleton-block--text" style="width:80%"></div>
    </div>`
  ).join('');
}

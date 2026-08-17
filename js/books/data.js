// Atlas — Books canonical data. Same discipline as goals/data.js: raw content
// and config maps live here; everything DERIVED (reading progress from pages,
// library stats, filtering/sorting) lives in state.js. The dashboard preview
// reads from here too.

export const BOOK_STATUS_CONFIG = {
  'Want to Read': { color: 'neutral' },
  Reading: { color: 'accent' },
  Finished: { color: 'success' },
  DNF: { color: 'archived' },
};
export const BOOK_STATUSES = Object.keys(BOOK_STATUS_CONFIG);

export const GENRE_CONFIG = {
  programming: { label: 'Programming', icon: 'code', color: 'blue' },
  fiction: { label: 'Fiction', icon: 'bookOpen', color: 'violet' },
  business: { label: 'Business', icon: 'briefcase', color: 'amber' },
  history: { label: 'History', icon: 'book', color: 'slate' },
  science: { label: 'Science', icon: 'target', color: 'teal' },
  design: { label: 'Design & Creativity', icon: 'sparkle', color: 'rose' },
  'self-improvement': { label: 'Self-improvement', icon: 'trendingUp', color: 'emerald' },
  psychology: { label: 'Psychology', icon: 'lightbulb', color: 'amber' },
};
export const BOOK_GENRES = Object.keys(GENRE_CONFIG);

export const FORMAT_CONFIG = {
  print: { label: 'Print', icon: 'book' },
  ebook: { label: 'Ebook', icon: 'monitor' },
  audio: { label: 'Audiobook', icon: 'clock' },
};
export const BOOK_FORMATS = Object.keys(FORMAT_CONFIG);

// ---- Book shape ----
// { id, title, author, genre, format, pages, pagesRead, status, rating?, favorite,
//   notes?, startedAt?, finishedAt?, linkedGoals?: [], linkedHabits?: [] }
// Progress is DERIVED from pagesRead / pages in state.js — never stored.

export let books = [
  {
    id: 'b1', title: 'Deep Work', author: 'Cal Newport', genre: 'self-improvement', format: 'print',
    pages: 304, pagesRead: 304, status: 'Finished', rating: 5, favorite: true,
    notes: 'The four-hour deep blocks completely rework how I plan a week. Re-read every winter.',
    startedAt: '2026-01-12', finishedAt: '2026-02-20',
    linkedGoals: [], linkedHabits: ['h2'],
  },
  {
    id: 'b2', title: 'The Pragmatic Programmer', author: 'Dave Thomas & Andy Hunt', genre: 'programming', format: 'ebook',
    pages: 352, pagesRead: 352, status: 'Finished', rating: 4, favorite: true,
    notes: 'Tracer bullets chapter is the best 10 pages on software delivery I have read.',
    startedAt: '2026-03-02', finishedAt: '2026-04-14',
    linkedGoals: ['g1'], linkedHabits: ['h5'],
  },
  {
    id: 'b3', title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', genre: 'programming', format: 'print',
    pages: 616, pagesRead: 412, status: 'Reading', rating: null, favorite: true,
    notes: 'Working through the indexing chapter now — pairs with the Postgres internals goal.',
    startedAt: '2026-06-01', finishedAt: null,
    linkedGoals: ['g8'], linkedHabits: ['h5'],
  },
  {
    id: 'b4', title: 'Atomic Habits', author: 'James Clear', genre: 'self-improvement', format: 'print',
    pages: 320, pagesRead: 320, status: 'Finished', rating: 4, favorite: false,
    startedAt: '2026-02-01', finishedAt: '2026-02-28',
    linkedGoals: [], linkedHabits: ['h2'],
  },
  {
    id: 'b5', title: 'The Midnight Library', author: 'Matt Haig', genre: 'fiction', format: 'ebook',
    pages: 288, pagesRead: 288, status: 'Finished', rating: 3, favorite: false,
    startedAt: '2026-05-10', finishedAt: '2026-05-24',
    linkedGoals: [], linkedHabits: ['h2'],
  },
  {
    id: 'b6', title: 'Sapiens', author: 'Yuval Noah Harari', genre: 'history', format: 'audio',
    pages: 443, pagesRead: 187, status: 'Reading', rating: null, favorite: false,
    notes: 'Listening on the commute — the agriculture chapter re-framed everything.',
    startedAt: '2026-07-15', finishedAt: null,
    linkedGoals: [], linkedHabits: [],
  },
  {
    id: 'b7', title: 'The Creative Act', author: 'Rick Rubin', genre: 'design', format: 'print',
    pages: 432, pagesRead: 96, status: 'Reading', rating: null, favorite: true,
    startedAt: '2026-07-28', finishedAt: null,
    linkedGoals: ['g10'], linkedHabits: [],
  },
  {
    id: 'b8', title: 'Clean Code', author: 'Robert C. Martin', genre: 'programming', format: 'ebook',
    pages: 464, pagesRead: 0, status: 'Want to Read', rating: null, favorite: false,
    startedAt: null, finishedAt: null,
    linkedGoals: ['g1'], linkedHabits: [],
  },
  {
    id: 'b9', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', genre: 'psychology', format: 'print',
    pages: 499, pagesRead: 499, status: 'Finished', rating: 5, favorite: true,
    startedAt: '2026-03-20', finishedAt: '2026-05-05',
    linkedGoals: [], linkedHabits: [],
  },
  {
    id: 'b10', title: 'Project Hail Mary', author: 'Andy Weir', genre: 'fiction', format: 'audio',
    pages: 476, pagesRead: 0, status: 'Want to Read', rating: null, favorite: false,
    startedAt: null, finishedAt: null,
    linkedGoals: [], linkedHabits: ['h2'],
  },
  {
    id: 'b11', title: 'The Hard Thing About Hard Things', author: 'Ben Horowitz', genre: 'business', format: 'ebook',
    pages: 304, pagesRead: 88, status: 'DNF', rating: null, favorite: false,
    notes: 'Too bro-y for the moment. May come back to the ops chapters later.',
    startedAt: '2026-04-02', finishedAt: '2026-04-20',
    linkedGoals: [], linkedHabits: [],
  },
  {
    id: 'b12', title: 'The Design of Everyday Things', author: 'Don Norman', genre: 'design', format: 'print',
    pages: 368, pagesRead: 368, status: 'Finished', rating: 4, favorite: false,
    startedAt: '2026-06-20', finishedAt: '2026-07-10',
    linkedGoals: ['g10'], linkedHabits: [],
  },
];

export function bookById(id) {
  return books.find((b) => b.id === id) || null;
}

// Hydration hook — see projects/data.js for why this replaces in place.
export function setBooks(list) {
  books.splice(0, books.length, ...list);
}

let bookIdCounter = 1000;
export function createBookId() {
  bookIdCounter += 1;
  return `b${bookIdCounter}-${Date.now()}`;
}

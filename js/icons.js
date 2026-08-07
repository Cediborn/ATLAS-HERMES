// Atlas — Icon registry.
// Hand-built line icons (24px grid, 2px stroke, round caps) so the app has
// zero runtime icon dependency. One name -> one glyph, used everywhere.

const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  fileText: '<path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M9 13h6M9 17h6M14 3v5h5"/>',
  flame: '<path d="M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c1.5 1 2 2.7 2 4.2A5.2 5.2 0 0 1 12 20a5.5 5.5 0 0 1-5.5-5.5C6.5 10 9 8 9 5.5 9 4 10 2.8 12 2Z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  bookOpen: '<path d="M12 6.5c-1.6-1.6-4.2-2-8-2v12.5c3.8 0 6.4.4 8 2 1.6-1.6 4.2-2 8-2V4.5c-3.8 0-6.4.4-8 2Z"/><path d="M12 6.5v12.5"/>',
  wallet: '<path d="M3 7.5a2 2 0 0 1 2-2h12a1 1 0 0 1 1 1v2"/><path d="M3 7.5v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1h-4.5a2.5 2.5 0 0 1 0-5H20a1 1 0 0 0 1-1"/><circle cx="16" cy="13.5" r="1"/>',
  book: '<path d="M5 3h11a2 2 0 0 1 2 2v14.5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2V5a2 2 0 0 1 2-2Z"/><path d="M18 3a2 2 0 0 1 2 2v14.5a2 2 0 0 0-2-2"/>',
  code: '<path d="m9 8-4 4 4 4M15 8l4 4-4 4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13a8 8 0 0 0 0-2l2-1.5-2-3.4-2.3.9a8 8 0 0 0-1.7-1L15 3.5h-6l-.4 2.1a8 8 0 0 0-1.7 1l-2.3-.9-2 3.4L4.6 11a8 8 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9a8 8 0 0 0 1.7 1l.4 2.1h6l.4-2.1a8 8 0 0 0 1.7-1l2.3.9 2-3.4-2-1.5Z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  bell: '<path d="M6 8.5a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
  moon: '<path d="M20 14.3A8.5 8.5 0 1 1 9.7 4a7 7 0 0 0 10.3 10.3Z"/>',
  monitor: '<rect x="3" y="4.5" width="18" height="12" rx="1.5"/><path d="M8 20.5h8M12 16.5v4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  layers: '<path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z"/><path d="m4 12 8 4.5 8-4.5"/><path d="m4 16.5 8 4.5 8-4.5"/>',
  moreHorizontal: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  pin: '<path d="M9 4h6l-1 6 3 3v2H7v-2l3-3-1-6Z"/><path d="M12 15v6"/>',
  star: '<path d="m12 3 2.6 5.6 6.2.7-4.6 4.3 1.2 6.1L12 16.9l-5.4 2.8 1.2-6.1-4.6-4.3 6.2-.7Z"/>',
  archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"/><path d="M10 13h4"/>',
  filter: '<path d="M4 5h16M7 12h10M10 19h4"/>',
  sort: '<path d="M7 15V3M4 12l3 3 3-3M17 9V21M14 12l3-3 3 3"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="8" r="2.5"/><path d="M16 14.5c2.8.4 5 2.6 5 5.5"/>',
  lightbulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.6 1 1.4 1 2.5h6c0-1.1.3-1.9 1-2.5A6 6 0 0 0 12 3Z"/>',
  checklist: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3 6 1.5 1.5L7 5"/><path d="m3 12 1.5 1.5L7 11"/><path d="m3 18 1.5 1.5L7 17"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><rect x="5" y="12" width="14" height="9" rx="1"/><path d="M12 8v13"/><path d="M12 8c-1.2-3-5-3.3-5-1.2C7 8.3 9.5 8 12 8Z"/><path d="M12 8c1.2-3 5-3.3 5-1.2C17 8.3 14.5 8 12 8Z"/>',
  clipboardCheck: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="m9 13 2 2 4-4"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  // ---- Added for Habits ----
  plus: '<path d="M12 5v14M5 12h14"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 5H4.5A2.5 2.5 0 0 0 5 10h.5M16 5h3.5A2.5 2.5 0 0 1 19 10h-.5"/><path d="M12 13v3M9 20h6M9.5 20c0-2 1-2.5 2.5-3 1.5.5 2.5 1 2.5 3"/>',
  edit: '<path d="M4 20h4L19.5 8.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z"/><path d="m14 6 4 4"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M10 11v6M14 11v6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  heart: '<path d="M12 20.5S3.5 15.4 3.5 9.4A4.4 4.4 0 0 1 12 7.2a4.4 4.4 0 0 1 8.5 2.2c0 6-8.5 11.1-8.5 11.1Z"/>',
  upload: '<path d="M12 16V4M12 4 7 9M12 4l5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  download: '<path d="M12 4v12M12 16 7 11M12 16l5-5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  // ---- Added for Goals ----
  flag: '<path d="M5 21V4"/><path d="M5 4c6-2.5 9 2.5 14 0v9c-5 2.5-8-2.5-14 0"/>',
  trendingUp: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>',
  // ---- Added for Finance ----
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  utensils: '<path d="M5 3v7a2 2 0 0 0 2 2v9M9 3v7a2 2 0 0 1-2 2"/><path d="M17 3c0 5 4 6 4 9 0 4-3 6-3 9h-3V3Z"/>',
  car: '<path d="M4 11 6.5 5.5A2 2 0 0 1 8.4 4.4h7.2a2 2 0 0 1 1.9 1.1L20 11"/><path d="M4 11h16v6H4z"/><circle cx="7.5" cy="16" r="1.3"/><circle cx="16.5" cy="16" r="1.3"/>',
  shoppingBag: '<path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  landmark: '<path d="M3 9.5 12 4l9 5.5V21H3V9.5Z"/><path d="M3 21h18"/><path d="M8 17v-4M12 17v-4M16 17v-4"/>',
  creditCard: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M2.5 10h19"/>',
  banknote: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 12h.01M17.5 12h.01"/>',
  piggy: '<path d="M19 10.5c1.7 0 2 1.6 2 2.7 0 1.8-1.4 3.1-3.2 3.3L17 20h-3l-.5-2.5h-3.5l-.5 2.5h-3l-.8-3.4A6 6 0 0 1 10 5c0-1.5.3-2.5 2-2.5 1.4 0 1.7 1 2.7 1.4A6.5 6.5 0 0 1 19 4a5 5 0 0 1-1.2 2.3A5.2 5.2 0 0 1 19 10.5Z"/><circle cx="15.5" cy="10.5" r="1"/>',
  // ---- Added for Books ----
  minus: '<path d="M5 12h14"/>',
  chevronUp: '<path d="m6 15 6-6 6 6"/>',
};

export function icon(name, { size = 20, strokeWidth = 2, className = '' } = {}) {
  const inner = paths[name] || paths.x;
  const cls = className ? ` class="${className}"` : '';
  return `<svg${cls} viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

export const iconNames = Object.keys(paths);

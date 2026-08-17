# Atlas — Build Log

Complete record of everything built so far: every file, every decision and why, every component's exact props, every data field, every accessibility feature, every bug caught during validation, and everything deliberately deferred. Written as project documentation, not just a chat recap — meant to be readable on its own by you or a future session.

Current state: **31 files, ~9,290 lines of HTML/CSS/JS.** Static site, zero build step, zero backend, deployable to GitHub Pages as-is.

> **Note on this log's own gap:** this file stopped at §1.5 (Projects M1), but the repository itself already contained working Notes and Calendar modules (`js/notes/`, `js/calendar/`) that were never written up here — the code shipped, the log entry didn't. That's a documentation lag, not a missing feature. §1.6 below picks up from the actual current state rather than pretending Notes/Calendar don't exist (§9 previously made that same stale claim). Sections 2/4/5 are updated with Habits' own additions; the Notes/Calendar entries those sections are still missing are a separate backfill this log doesn't attempt, since reconstructing another module's design decisions after the fact isn't something to invent.

---

## 1. Timeline

### 1.1 — Landing page + application shell
No landing page existed anywhere in the project or uploads at the time — checked `/mnt/project` and `/mnt/user-data/uploads` directly rather than assuming, per the standing rule to verify before building. Built one from scratch using the design tokens already specified in `ATLAS_FOUNDATION.md` §7, plus the full app shell: sidebar, top nav, workspace switcher, command palette, dashboard, settings.

Key decisions made here, still load-bearing for everything after:
- **Hash-based routing** (`#/dashboard`, `#/projects`, …) instead of path-based routing — a client-routed static SPA with path-based routes 404s on hard refresh under GitHub Pages unless you add server rewrite rules, which a no-build static site can't easily do. Hash routing sidesteps this entirely.
- **Native ES modules**, one file per responsibility, no bundler — chosen specifically so the code maps 1:1 onto future React components/hooks when Atlas eventually moves to Next.js per the Foundation roadmap, without pretending this is React today.
- **Hand-built inline SVG icons** (24px grid, 2px stroke, round caps — Lucide's visual language, not its exact path data) instead of a CDN icon font/library — zero runtime dependency, zero icon-flash on load.
- **A small custom observable store** (`store.js`) instead of any state library — get/set/subscribe, backed by `localStorage` for theme, workspace, and sidebar-collapsed state (deliberately *not* persisting whether the mobile drawer is open).
- **Signature accent color** `#3654E0` — chosen deliberately over the two most common "this looks AI-generated" defaults (warm-cream-and-terracotta, or near-black-and-neon) and over generic Tailwind-indigo. Paired with a warm-tinted neutral gray scale rather than cold gray.
- **The command palette as the one signature moment** — real ARIA combobox/listbox semantics (not a fake lookalike), arrow-key navigation, unified so the topbar's search pill and ⌘K open the exact same overlay instead of two competing systems.
- Landing page hero **shows** the product's ambient-AI/quick-capture pillar instead of describing it — a live typewriter demo cycling through example inputs ("call sarah tomorrow 3pm" → parsed task) rather than a generic hero stat block.

### 1.2 — GitHub Pages upload issue
Screenshot showed the whole `atlas-site` folder nested one level inside the repo instead of its contents sitting at the root, so `index.html` wasn't where Pages looks for it. Diagnosed as a drag-and-drop artifact (uploaded the outer folder instead of its contents) and flagged that `.nojekyll` is a dotfile some file pickers hide from drag-and-drop, so it may not have made it in.

### 1.3 — Real landing page wiring
You uploaded the actual pre-existing `atlas-landing.html` — a full marketing/waitlist page that hadn't been visible to me in step 1.1. Found both CTAs (`nav__cta` line 1115 "Get early access", hero `btn-primary` line 1143 "Start building") pointing at `#cta`, an email-capture anchor, instead of the app. Gave the exact two-line fix (`href="app/index.html"`) and flagged that this file is fully self-contained (styles/script inlined) and doesn't touch the `css/`/`js/`/`assets/` folders at all.

### 1.4 — Dashboard rebuilt on reusable components ("Day 6")
You gave a full component-system spec (StatCard, SectionCard, 5 list-item types, Progress, Badge, QuickActionButton, EmptyState) with "take every part of the prompt easily, don't assume anything." Four real ambiguities in that spec were resolved explicitly rather than silently:
1. **Quick Actions: 4 items or 6?** The component spec's examples listed 6; the actual dashboard-layout section listed 4 and required a clean 2×2 grid on mobile. 6 doesn't tile into 2×2; 4 does — went with 4.
2. **TaskItem's "due time"** wasn't in the component's own prop list but was required by the layout section — added as an extra optional prop rather than dropped.
3. **Habit "completion ring or progress"** — ambiguous phrase. Implemented *both* readings: a weekly completion Progress bar and a separate daily "done today" toggle, rather than guessing one.
4. **Empty-state duplication** — unified the existing full-page empty state and a new compact in-card one into a single `emptyState()` function with a `size` variant, instead of two parallel implementations.

Built `js/components.js` as the shared library; rewrote `views.js` entirely around it; renamed `.panel`→`.section-card` and `*-row`→`*-item` throughout for naming consistency (checked afterward that no old names were left anywhere). Built a real 12-column CSS Grid for the desktop layout with three genuine responsive tiers (not one breakpoint doing double duty). Refactored the Settings page to also use `SectionCard`, proving the components work outside the dashboard too.

Two real bugs caught by validation and fixed: a dead `--space-20` CSS variable that always fell back to `--space-16` anyway (simplified to just use `--space-16`), and a missing `.quick-action__label` CSS rule.

### 1.5 — Projects module, Milestone 1
Spec was written in React vocabulary (`<ProjectCard>`, hooks, memoization, lazy-loaded views) for a project that's still plain HTML/CSS/JS. Translated rather than ignored: components → functions(props); hooks/state → the same store pattern; memoization → a real cache, not a claim; lazy-loaded views → a genuine dynamic `import()`.

Scope was split into a milestone rather than attempting all 22 named components, 3 views, and drag-and-drop shallowly in one pass (per your own instruction not to exhaust the response budget recklessly, and the standing project rule to break oversized requests into milestones). Built completely: data model + 14 realistic projects, both color systems, all 4 Progress variants, 11 of the Projects components, the Grid view, a full toolbar (search/new/view-switcher/filter/sort), and a real slide-in detail panel. Explicitly deferred: List/Kanban views, drag-and-drop, the New Project form, Import/Export, and several filter facets (see §9).

Consolidated the dashboard's "Recent Projects" section to read live from this new canonical dataset instead of keeping a second, separately-maintained copy that had already drifted (its old mock statuses, "Active"/"Paused", didn't even match the new official 7-status list).

One real bug caught and fixed during validation: the filter/sort memoization cache didn't invalidate when a project's own data mutated (e.g. archiving a card from its action menu), so toggling archive while "show archived" was off wouldn't actually have removed it from the grid. Added an explicit `invalidateVisibleProjectsCache()` call at the one place that mutates project data.

### 1.6 — Habits module, Milestone 1
Spec was written for a stack this project doesn't use — React components, TypeScript models, Framer Motion — same situation as Projects (§1.5) and (presumably) Calendar. Translated the same way: components → `functions(props)`; TypeScript interfaces → JSDoc `@typedef` comments; Framer Motion → CSS transitions/keyframes on the existing motion tokens (already covered by the global `prefers-reduced-motion` override in `base.css`, so no extra per-component handling was needed); "virtualized history lists" / "code splitting" → the same genuine dynamic `import()` code-splitting Projects/Notes/Calendar already use (true list virtualization is moot this milestone since the History/Timeline view is deferred, see §8).

**Three things flagged and decided explicitly rather than silently picked:**
1. **Gamification tension.** The landing page's own Habits pillar copy says *"simple daily and weekly streaks, without a gamified layer getting in the way"* — but the spec asks for a full Achievements/badge-unlock system with unlock animations and "micro confetti." Built the streak/heatmap/stats mechanics (closer to GitHub-contributions data visualization than gamification) but deferred the Achievements system entirely rather than build something the product's own stated positioning argues against. The CompletionButton still has a small satisfying pop on completion (checkmark draw + scale), just not confetti or unlockable badges.
2. **A second calendar would duplicate the first one.** The spec's own `CalendarView` ask (Week/Month/Day views inside Habits) would re-implement what the real Calendar module already does — and Calendar's `repository.js` was *specifically* built with a `{ id, getEvents(start,end) }` adapter seam for exactly this case. Registered Habits as a real source there instead (see Integrations below) and did not build a second calendar UI. Weekly Overview and the monthly heatmap are a different thing (completion-history visualization, not scheduling) and are Habits' own.
3. **"Today's Habits" + "Habit Categories" are the same list, not two.** Rendered as one list grouped by category with collapsible section headers — covers both spec sections without maintaining two parallel views of the same 11 habits.

**Built completely:** data model (`Habit`, `HabitCompletion`, category/frequency/priority config) + 11 mock habits spanning all 9 categories with a *generated* (not hand-authored) ~90-day completion history — a deliberate difference from Projects/Notes/Calendar's static-dated mock data, since a habit's history is a time series that should still look coherent whenever the app is actually opened, not just on the day it was authored. Streak math (current/longest, with 'skipped' as a non-breaking grace day), 30-day success rate, week-over-week trend, a 12-metric dashboard, rolling 7-day weekly overview (click a day for a detail breakdown), a GitHub-style monthly heatmap with month/year navigation, current+longest streak leaderboards, full search/filter(category/priority/status/favorites)/sort(8 options), and a complete create/edit dialog (frequency incl. custom weekday picker, optional reminder, optional goal, priority, tags, linked project, archive toggle).

**Integrations — real, not simulated:**
- **Dashboard.** "Current Streaks" section and the Habit Streak stat card now compute live from this module (retiring the old hardcoded 2-habit array and its static "12 days" stat value).
- **Calendar.** `adaptHabitReminders` in `calendar/repository.js` — which previously had to synthesize a fake per-habit reminder time because Habits had no real schedule data yet — now reads each habit's actual `frequency`/`reminderTime`, respecting weekdays/weekends/custom schedules instead of assuming daily for everything.
- **Projects.** Optional `linkedProjectId` field, surfaced as a dropdown in the create/edit dialog.
- **Goals, Learning (as an integration target), AI Assistant, Notifications, Analytics.** None of these exist as real modules yet (Goals isn't built at all; Learning/AI Assistant/Notifications/Analytics have no engine to integrate with) — no fake integration was built against them. The data model does carry an unused, nullable `goalId` so a future Goals module can link without a schema migration.

**Also promoted `ProgressRing` to the shared component library** (`js/components.js`) — it previously existed only as one branch of Projects' own `ProjectProgress('ring')`. Habits needed the identical ring for several rings on its header, so the SVG logic itself moved up (Projects' `ProjectProgress` now delegates to it) rather than getting a second copy. Same reasoning as the existing `dateKey`/`monthGridDays` family, which made the identical move from `calendar/state.js` into the shared `date-utils.js` this same milestone, once Habits' heatmap needed the exact same month-grid math Calendar's month view already had.

**Two real bugs caught by validation, not hypothetical ones:** `habit-dialog.js` was scroll-locking the body via a CSS class (`overlay-open`) that doesn't exist anywhere in the stylesheet — the actually-established pattern (used by both `calendar/event-panel.js` and `projects/view.js`) is a direct `document.body.style.overflow` toggle; fixed to match it. Separately, the weekly-overview day-detail popover referenced seven per-color icon-chip classes (`weekly-overview__detail-icon--blue`, etc.) that were never defined — added all seven.

**This milestone's validation also added a step beyond §7's existing methodology:** actually executing `habits/data.js` + `habits/state.js` in Node against the real generated mock data (streak math, dashboard stats, heatmap, weekly overview, filter/sort, full CRUD round-trip, the completion click-cycle) rather than relying on static analysis alone. Worth keeping for future modules with this much computed logic — static checks catch wiring mistakes, not wrong math.

---

## 2. Complete file tree

```
/index.html                     Landing page (hero demo, philosophy, 8 pillars, Launch Atlas CTA)
/app/index.html                 App shell: sidebar + topbar + command palette + view root
/.nojekyll                      Tells GitHub Pages not to run this through Jekyll
/README.md                      Structure, local-preview instructions, deploy steps
/docs/BUILD_LOG.md              This file

/assets/favicon.svg             Geometric "A" monogram, reused as the landing nav logo

/css/tokens.css                 Every design token: color (light+dark), type, spacing, radius, motion, elevation
/css/base.css                   Reset, focus states, skip link, reduced-motion override, scrollbar styling
/css/components.css             Shared atoms: buttons, badges, menus/dropdowns, avatar, empty state, progress bar, inputs
/css/app-shell.css              Sidebar, topbar, workspace switcher, command palette layout, responsive rules
/css/dashboard.css              Hero, StatCard, quick actions, 12-col grid, SectionCard, all 5 list-item types
/css/landing.css                Landing-page-only layout (hero, philosophy strip, pillar cards, footer)
/css/projects.css               Status/priority indicators, ring/percentage/milestone progress, cards, toolbar, detail panel
/css/habits.css                 Header/toolbar, 12-card stat grid, habit card + completion button states, weekly overview, heatmap, streak leaderboard, create/edit dialog
/* css/notes.css and css/calendar.css both exist and are loaded in app/index.html but predate this log's own record-keeping — not reconstructed here, see the note under "Current state" above. */

/js/icons.js                    Icon registry — one hand-built inline SVG per name, no external dependency
/js/store.js                    ~30-line observable store (theme, workspace, sidebar state) + localStorage
/js/theme.js                    Resolves light/dark/system, applies data-theme, reacts to system changes
/js/mock-data.js                User, workspaces, nav config, notifications, dashboard content (tasks/events/habits/notes/learning), quick actions
/js/popover.js                  One shared dropdown behavior, reused by workspace switcher / notifications / profile menu
/js/sidebar.js                  Nav rendering, mobile drawer, desktop collapse, workspace switcher logic
/js/topbar.js                   Date, page title, notifications dropdown, profile dropdown
/js/command-palette.js          ⌘K/Ctrl+K palette — real ARIA combobox pattern, arrow-key nav, unified search+actions
/js/components.js               Shared component library: Badge, Progress, emptyState, StatCard, SectionCard, QuickActionButton, TaskItem, EventItem, ProjectItem, NoteItem, HabitItem
/js/views.js                    Dashboard, Settings, and full-page empty-state renderers — assembled entirely from components.js
/js/router.js                   Hash router; dynamically imports the Projects module only when visited
/js/main.js                     App bootstrap — the one file that wires every module together
/js/landing.js                  Landing-page-only script: hero typewriter demo, philosophy/pillar rendering

/js/projects/data.js            Canonical project data — 14 projects, people roster, status/priority config
/js/projects/state.js           Pure filter/sort functions, page-local reactive state, date helpers, memoized selector
/js/projects/components.js      ProjectStatusBadge, ProjectPriority, ProjectProgress, ProjectDeadline, ProjectAvatarGroup, ProjectTag, ProjectEmptyState, ProjectSkeleton, ProjectActionMenu, ProjectHeader, ProjectCard
/js/projects/view.js             Page controller: toolbar, grid, detail panel — the only file in the module that touches the DOM

/* js/notes/*.js and js/calendar/*.js both exist (data.js/state.js/components.js/view.js each, plus calendar's month-view.js, agenda-view.js, mini-calendar.js, upcoming-panel.js, event-panel.js, repository.js) and are wired into router.js/sidebar.js — not reconstructed here, see the note under "Current state" above. */

/js/habits/data.js               Habit model (JSDoc typedefs), category/priority/frequency config, 11 mock habits, deterministic ~90-day generated completion history
/js/habits/state.js              Streak/stats/heatmap/weekly-overview math, search/filter/sort UI state + memoized selector, CRUD
/js/habits/components.js         CompletionButton, HabitCard, HabitActionMenu, CategoryHeader, StreakCard, WeeklyOverview, HeatmapGrid, skeleton/empty states
/js/habits/habit-dialog.js       Create/edit dialog — same modal shell pattern as calendar/event-panel.js, independent implementation
/js/habits/view.js               Page controller: header/toolbar, dashboard stat grid, category-grouped list, insights panel (weekly overview, heatmap, streak leaderboard)
```

---

## 3. Design tokens (`css/tokens.css`)

| Category | Values |
|---|---|
| Type | Inter (UI), JetBrains Mono (code/data), loaded via Google Fonts with `font-display:swap` |
| Type scale | 12 / 14 / 16 / 18 / 20 / 24 / 32 / 40px (`--text-xs` → `--text-3xl`) |
| Spacing | 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96px, named directly by pixel value |
| Radius | 6px inputs/buttons, 12px cards, 20px modals, plus a full-pill radius |
| Motion | 120ms micro, 200ms standard, 320ms panel — `cubic-bezier(0.16, 1, 0.3, 1)` easing throughout |
| Elevation | Two shadow tokens (`--shadow-float`, `--shadow-modal`); everything else uses 1px hairline borders, not shadows |

**Light theme:** bg `#FAFAF9`, bg-inset `#F2F1EE`, surface `#FFFFFF`, text `#14151A`, accent-solid `#3654E0`, success `#0F6B3D`, warning `#8A5210`, danger `#B02A2A`.

**Dark theme:** bg `#0B0C0F`, surface `#16181F`, text `#F5F5F3`, accent-text `#7C97FF` (lighter tint for contrast against near-black — accent-*solid* stays `#3654E0` in both themes since filled buttons need the same fill regardless of page theme; only the text/icon-on-background version needs to lighten).

**Added for the Projects module:** `--color-planning` (`#6D4FC4` light / `#A78BFA` dark), `--color-archived` (`#8A7B6C` light / `#B8AA9A` dark) — added only because nothing existing fit; everything else in the 7-status system reuses accent/success/warning/danger. Plus 7 project-*identity* colors (independent of status): blue `#3B82F6`, violet `#8B5CF6`, teal `#14B8A6`, amber `#F59E0B`, rose `#F43F5E`, emerald `#10B981`, slate `#64748B`.

**Layout constants:** sidebar 260px expanded / 72px collapsed, topbar 64px tall.

---

## 4. Component library

### 4.1 — `js/components.js` (app-wide)
| Component | Props |
|---|---|
| `Badge` | `label`, `variant?` — auto-maps status words to a color if `variant` isn't given |
| `Progress` | `percentage`, `label?`, `color?` |
| `ProgressRing` | `percentage`, `label?`, `color?`, `size?`, `showValue?` — promoted out of Projects' own `ProjectProgress('ring')` once Habits needed the identical ring; Projects now delegates to this instead of keeping its own copy |
| `emptyState` | `icon`, `title`, `description?`, `size?` ('sm' for in-card, default for full-page), `badge?` |
| `StatCard` | `title`, `value`, `icon`, `trend?`, `accent?` |
| `SectionCard` + `sectionAction` | `title`, `description?`, `action?`, `content` |
| `QuickActionButton` | `icon`, `label`, `id` |
| `TaskItem` | `id`, `title`, `category`, `priority?`, `dueTime?`, `done` |
| `EventItem` | `id`, `time`, `title`, `location?`, `color` |
| `ProjectItem` | `id`, `name`, `status`, `lastUpdated`, `progress?` — the dashboard's lightweight preview row, distinct from the Projects module's `ProjectCard` |
| `NoteItem` | `id`, `title`, `editedDate`, `tag?` |
| `HabitItem` | `id`, `name`, `icon?`, `streak`, `completedToday?`, `weeklyProgress?` — the dashboard's lightweight preview row; now fed live data from `js/habits`, no longer a static array |

`.menu__item--danger` was also added to `components.css` this milestone (a plain additive rule — a destructive item like Habits' "Delete" didn't have a styled option before; Projects/Calendar's own delete actions turned out to just use unstyled `.btn--secondary`, so this is a small net-new capability, not a fix).

### 4.2 — `js/projects/components.js` (Projects module)
`ProjectStatusBadge`, `ProjectPriority` (Critical = High's exact hue rendered solid instead of tinted — escalates by weight, not a 5th color), `ProjectProgress` (4 variants: bar *reuses* the app-wide `Progress` directly rather than reimplementing it; ring now delegates to the shared `ProgressRing`; percentage/milestone are Projects-only), `ProjectDeadline` (none / normal / soon / overdue, computed live against today's date), `ProjectAvatarGroup` (overlapping stack + overflow count), `ProjectTag` (clickable — filters the grid), `ProjectEmptyState`, `ProjectSkeleton`, `ProjectActionMenu` (favorite / pin / archive), `ProjectHeader` (reused by both the card and the detail panel), `ProjectCard`.

### 4.3 — `js/habits/components.js` (Habits module)
`CompletionButton` (5 states: incomplete/done/skipped/missed/locked — locked = not due this day per the habit's own schedule, so no actionable control is shown), `HabitCard`, `HabitActionMenu` (Edit/Duplicate/Favorite/Archive/Delete — a separate menu from the shared app-wide `ActionMenu`, since that one's Pin action doesn't apply to habits), `CategoryHeader` (collapsible; also satisfies the spec's separate "Habit Categories" ask — see §1.6), `StreakCard` (shared by both the Current and Longest leaderboards via a `kind` prop), `WeeklyOverview`, `HeatmapGrid`, `HabitSkeleton`, `HabitsEmptyState`.

---

## 5. Data models

**`mock-data.js`:** `currentUser` (name/email/initials), `workspaces` (3: Personal/University/Startup), `navItems` (11: Dashboard, Projects, Calendar, Notes, Habits, Goals, Learning, Finance, Books, Coding, Settings — each with an optional roadmap `phase`), `notifications` (3), `dashboardData` (stats/tasks/events/habits/notes/learning), `quickActions` (4: Task/Note/Project/Event).

**`projects/data.js`:** 6-person roster (Alex Morgan, Sarah Chen, Jordan Lee, Priya Patel, Marcus Webb, Nina Ortiz), 7 statuses (Not Started, Planning, In Progress, Blocked, Review, Completed, Archived), 4 priorities (Low, Medium, High, Critical), 7 project-identity colors, and **14 projects**, each carrying: `id`, `title`, `description`, `icon` (emoji), `status`, `priority`, `deadline`, `estimatedCompletion`, `progress`, `owner`, `members[]`, `color`, `createdAt`, `updatedAt`, `lastActivity`, `tags[]`, `taskCount`, `completedTaskCount`, `attachmentsCount`, `notesCount`, `favorite`, `pinned`, `cover` (boolean — cover images are CSS gradients built from the project's own color via `color-mix()`, not external image files).

**Sort options (9, all real comparators):** Recently updated (default), Recently created, Newest, Oldest, Deadline, Alphabetical, Progress, Priority, Most active. (Note: "Newest" and "Recently created" are both `createdAt` descending — the spec listed them as two separate options, so both exist as labels even though they produce identical ordering.)

**Filters:** search text, status, priority, tags, favorites-only, show-archived (archived projects are hidden by default — a deliberate, stated default, not a silent one).

**`habits/data.js`:** 9 categories (Morning/Afternoon/Evening/Health/Learning/Fitness/Reading/Coding/Custom), 3 priorities (Low/Medium/High), 4 frequency types (daily/weekdays/weekends/custom-days), 7 identity colors (same set as Projects), and **11 habits**, each carrying: `id`, `title`, `description`, `category`, `icon`, `color`, `frequency`, `customDays[]` (only for 'custom'), `reminderTime` (nullable), `goal` (nullable `{targetValue, unit}`), `priority`, `tags[]`, `notes`, `favorite`, `archived`, `linkedProjectId` (nullable), `goalId` (nullable, unused — reserved for a future Goals module), `createdAt`, `updatedAt`. Completion history is a flat `{habitId, date, status}` list where `status` is only ever `'done'` or `'skipped'` — `'missed'` is never stored, it's inferred for any past due-date with no entry, same "don't store what's derivable" reasoning as everywhere else in this codebase.

**Sort options (8):** Current streak (default), Longest streak, Completion %, Alphabetical, Priority, Category, Newest, Recently updated. (Manual drag-order is not among them — see §8.)

**Filters:** search text, category, priority, favorites-only, status (active/archived/all — active is the default).

---

## 6. Accessibility

Skip-to-content link · `:focus-visible` rings everywhere (not `:focus`, so mouse users don't see rings on click) · global `prefers-reduced-motion` override that zeroes every animation/transition · real ARIA: `role="dialog" aria-modal="true"` on the command palette and the project detail panel, a genuine `combobox`/`listbox` pattern on the command palette (not a lookalike — `aria-expanded`, `aria-controls`, `aria-autocomplete`, `aria-activedescendant`), `role="checkbox" aria-checked` on the custom task/habit toggles, `aria-current="page"` on the active nav link, `aria-haspopup`/`aria-expanded` on every dropdown trigger · focus management: command palette and detail panel both save and restore focus on open/close; the mobile drawer moves focus to its first link on open and back to the hamburger on close · full keyboard support: Escape closes any open overlay, arrow keys navigate the command palette and sort menu, Enter/Space activate the custom checkbox controls.

**Habits adds:** the same `role="dialog" aria-modal="true"` + focus-trap + save/restore-focus pattern for its own create/edit dialog (independent implementation, same shell shape as the command palette/detail panel/event dialog). `CompletionButton` is `role="checkbox" aria-checked`, consistent with the existing task/habit toggle convention, and is genuinely `disabled` (not just visually dimmed) in its locked/missed states. Heatmap cells with real data are individually focusable (`tabindex="0"`) with a descriptive `aria-label` (date, percentage, count) doubling as the hover tooltip; empty/future/out-of-month cells are `aria-hidden`. A visually-hidden `aria-live="polite"` region announces the result of every completion click ("Morning Run marked complete — 12 day streak") for screen-reader users, since the visual checkmark-draw animation alone wouldn't reach them. The three deferred header buttons (Import/Export/Settings) are genuinely `disabled` with an explanatory `title`, not clickable-but-broken.

---

## 7. Validation methodology (used at the end of every milestone)

Every JS file syntax-checked as a real ES module (`node --check` via stdin, not just as a script). Every `import { x }` cross-referenced against the actual `export` list of its target file, including path resolution across subfolders. Every dynamic `import()` target confirmed to exist. Every `getElementById` call cross-referenced against every id that exists anywhere — including ids that JS itself generates via template strings, not just the two static HTML files. Every CSS class used in JS cross-referenced against actual CSS rules. Every `var(--x)` used anywhere cross-referenced against `tokens.css` definitions. Both HTML files parsed for tag balance. **Added this milestone:** for modules with real computed logic (streaks, stats, heatmap math), the data/state layer is actually executed in Node against the real mock data — not just statically checked — since wiring mistakes and wrong math are different failure classes and static analysis alone only catches the first one.

**Real bugs this caught, not hypothetical ones:** a dead `--space-20` CSS fallback, a missing `.quick-action__label` rule, a missing `.badge--planning`/`.badge--archived` pair, a stale-cache bug where archiving a project while "show archived" was off wouldn't have actually removed it from the grid, a body-scroll-lock in the new habit dialog that referenced a CSS class (`overlay-open`) that didn't exist anywhere (the established pattern is a direct `style.overflow` toggle — fixed to match it), and seven missing per-color icon-chip classes for the weekly-overview day-detail popover.

---

## 8. What's deliberately deferred (and why)

- **List and Kanban views + drag-and-drop.** The toolbar's view-switcher shows them as `disabled` with a tooltip, not clickable-but-broken. Kanban specifically still needs a decision about where Not Started/Blocked/Archived projects live, since the brief's 4 Kanban columns (Planning/In Progress/Review/Done) don't cover all 7 statuses.
- **Actually creating or editing a project** (`ProjectModal`/`ProjectForm`). No backend exists to persist one, so "New Project" opens the command palette instead of a fake or dead button.
- **Import/Export.** Needs real file I/O; not stubbed.
- **Deadline-range, completion%, owner, member, and color filters.** Status/priority/tags/favorites/archived are built; these five are not yet.
- **Keyboard shortcuts and right-click context menus specific to Projects.**

**Habits:**
- **The Achievements/badge-unlock system.** Cuts against the landing page's own "without a gamified layer" positioning for this feature — see §1.6. Worth a real product decision before building, not a default yes.
- **History/Timeline view with infinite scroll.** The heatmap and weekly overview cover recent activity; a full chronological log across all habits is a bigger, separate piece of scope, and true list virtualization is only worth building once that view exists.
- **A second in-module calendar (`CalendarView`).** Would duplicate the real Calendar module — see §1.6. Habit reminders/schedules already appear on the real Calendar via `repository.js`.
- **Manual drag-to-reorder.** Same reasoning as Projects deferring drag-and-drop for its views — not among the 8 sort options this milestone.
- **Import/Export and a dedicated Habit Settings surface.** Same as Projects' Import/Export (§8 above) — needs real file I/O / a settings architecture that doesn't exist yet. The three header buttons exist and are visibly `disabled` rather than omitted or faked.
- **A styled delete-confirmation dialog.** Uses the browser's native `confirm()` for now — functional, just not custom-styled; the rest of the app has no existing modal-confirmation pattern to match against.

---

## 9. Known limitations

- Everything is in-memory. Reloading the page resets task/habit checkbox toggles, Habits' own completion/CRUD changes, and any Projects-module edits (favorite/pin/archive) back to the seed data — only theme, workspace selection, and sidebar-collapsed state persist, via `localStorage`.
- ES module scripts don't execute over `file://` in Chrome (a browser restriction, not a bug here) — local preview needs `python3 -m http.server`, not double-clicking the file. Doesn't affect GitHub Pages, which serves over real HTTPS.
- Dashboard, Projects, Notes, Calendar, and now Habits are all real pages backed by live data. Goals, Finance, Books, and Coding are still the honest empty-state placeholders from the very first milestone, each tagged with its roadmap phase where one exists.
- The dashboard's own habit-completion toggle is a simple binary (done / not done) — the richer 3-state cycle (done/skipped/undo) only exists on the Habits page itself. A deliberate scope difference for a small preview widget, not an inconsistency to fix later without also redesigning `HabitItem`'s markup.
- Habits' 90-day completion history is generated at page-load time relative to the real current date (see §1.6), not stored — reloading regenerates the same shape (same seeds) but "today" shifts forward with it, so streak numbers will very gradually change build-to-build as real time passes, which is intended, not a bug.

---

### 1.7 — Persistent data layer + full CRUD across every module ("Atlas becomes real")

The milestone that turned Atlas from a beautifully interactive prototype into an application
whose data actually survives a reload. The requirement: create/edit/delete anything and have
it persist; refreshing or closing the browser must not reset to mock data; the dashboard must
show real computed numbers; workspaces must be real data scopes.

**Architecture (the whole point — nothing below the seam changed):**

```
UI (view.js) → logic (state.js / repository.js, in-memory arrays)
             → persistence (js/persistence.js) → IndexedDB (js/db.js)
```

- `js/db.js` — thin promise wrapper over IndexedDB. One database (`atlas-db`), one object
  store per collection, every record carries a `workspaceId` (so workspaces are data scopes,
  not a renamed label). Deliberately dependency-free and small so a future backend adapter
  can replace it without touching a single view.
- `js/persistence.js` — the seam. Three jobs: (1) first-run seeding from the module
  `data.js` files, which are now *seed data* rather than the source of truth (tag/calendar
  names map each seed record to its workspace); (2) hydration of the in-memory arrays from
  the store for the active workspace, **in place** (`splice`-based setters) so every existing
  `import { projects }` reference keeps working and no view became async; (3) write-through
  `save*()` helpers called at every mutation site, queued per store so rapid successive
  mutations persist in order, failures logged not thrown.
- Every module's `data.js` gained a `setX(list)` hydration hook.
- `js/config.js` — the app's static config (workspaces, nav, quick actions) split out of
  `mock-data.js`, which is now landing-page content only.

**What became real this milestone:**

- **Projects:** a real create/edit/delete dialog (schema-driven, shared `js/form-dialog.js`
  reusing the habit-dialog shell/classes), real task management in the detail panel
  (add/toggle/delete tasks with due dates), persistence on every mutation.
- **Calendar:** create/edit/delete events persist (recurrence already worked — it was pure,
  now it's persisted). Calendar visibility prefs persist per workspace.
- **Notes:** save/toggle/delete persist; the editor gained a Delete action.
- **Habits:** CRUD + completion toggles persist; the flat `completions` array (the persisted
  representation) and the in-memory `completionIndex` stay in sync; streaks/heatmaps were
  already computed — now they're computed from *stored* history.
- **Goals / Learning / Books / Coding / Finance:** all had polished UI with no way to create
  or edit anything ("New X" opened the command palette). Each got a real dialog (thin
  wrappers over `form-dialog.js`) plus real sub-item management (milestones, units, coding
  steps) and persistence. Finance got a proper transaction dialog with validation.
- **Dashboard:** every number is now computed from live data — tasks due (from real project
  tasks + deadlines), habit streak (from stored completion history), events today (calendar
  incl. recurring + habit-reminder adapters), notes this week, top goals, reading progress,
  coding, finance. No hard-coded values remain.
- **Command palette:** searches real user content across modules (projects, tasks, notes,
  events, goals, books, learning) and navigates on selection — same design, real engine.
- **Notifications:** generated from real data (upcoming events, overdue projects, approaching
  goal deadlines, unfinished tasks, habits due today) instead of 3 hardcoded rows.
- **Settings:** profile (name/email) persists via the `meta` store; Reset demo data wipes
  every store and re-seeds; workspace list is real.
- **Workspaces:** switching hydrates the active workspace's data from IndexedDB — separate
  data contexts, not a label change.

**One real bug caught by validation:** the new shared form dialog populated its shell but
never unhid the overlay (`openFormDialog` was missing the `overlay.hidden = false` that the
habit dialog's `openOverlay()` had always done) — the dialog rendered invisible. Caught by
the end-to-end UI driver clicking "New Project" and asserting the overlay was visible.

**Validation (two new harnesses in `tests/`):**
- `run-tests.js`/`run-tests.html` — a persistence round-trip against the real data layer:
  seed → mutate (create project with tasks, habit completions, event, note, goal, book,
  transaction, resource, coding item + session) → flush → "reload" (second Chrome run in
  the same profile) → verify everything survived → delete → verify deletions stuck →
  verify workspace scoping. 23/23 checks pass.
- `ui-driver.mjs` — drives the real app through CDP Input events: navigate to Projects,
  open the dialog, type a title, submit, confirm the project renders, **reload**, confirm it
  persisted, find it via the command palette, and see it on the dashboard. 9/9 checks,
  no page exceptions.

**Remaining known limitations** (unchanged from §9 unless stated): all storage is local to
the browser — there's still no auth or cloud sync; the cloud path is documented in the
README and deliberately kept as the `db.js`/`persistence.js` seam.

### 1.8 — Feature polish: PWA, browser notifications, demo data

- **PWA / offline:** `app/manifest.webmanifest` (installable, standalone) + `app/sw.js`
  (cache-first assets with background refresh, network-first navigations, offline
  fallback to the cached shell). Registered in `js/main.js` for secure contexts.
- **Browser notifications:** opt-in toggle in Settings → Notifications. Permission is
  requested only when the user turns it on; system notifications mirror the same
  real, data-computed items as the in-app panel and deep-link to the module
  (`js/browser-notifications.js`).
- **Demo data on demand:** Settings → Data → *Load demo data* re-adds the sample
  dataset alongside user data (`loadDemoData()` in `js/persistence.js`); seed ids
  never collide with user-created ids. *Reset demo data* unchanged.
- **Onboarding:** one-time dismissible welcome banner on the dashboard.
- **`.nojekyll`:** added at the repo root so GitHub Pages serves the static files
  as-is instead of running the Jekyll build (removes the entire class of
  Jekyll/Liquid build failures; the theme stylesheet it previously emitted was
  never referenced).
- Verified in headless Chrome: `tests/polish-driver.mjs` (12/12 — welcome banner,
  manifest, SW registration/control, offline render from cache, notification
  toggle, demo-data restore) plus the existing route sweep (11/11) and UI e2e (9/9).

### 1.9 — LUNA collapsible + landing page refresh

- **LUNA is now collapsible:** the floating assistant shrinks to a compact
  icon-only dot via a collapse notch on the FAB or a minimize button in the
  panel header. The collapsed state persists (`atlas:lunaCollapsed`), and the
  compact dot expands it back. `js/luna.js` + `css/luna.css`.
- **Landing page matches the real app:** hero now leads with persistence
  (badges: persistent by default, offline PWA, real workspaces, LUNA AI);
  the pillar grid is the actual twelve-capability set (nine data modules,
  workspaces, command palette, LUNA) instead of the old roadmap copy; the
  hero palette demo types real searches ("build atlas", "atomic habits",
  "team sync", "pay rent"); philosophy highlights local-first persistence,
  workspaces, global search, and LUNA. `index.html`, `js/landing.js`,
  `js/mock-data.js`, `css/landing.css`.
- Verified in headless Chrome: `tests/luna-landing-driver.mjs` (14/14 —
  collapse/persist/expand, minimize, hero badges, 12 cards, palette demo)
  plus the existing route sweep (11/11) and UI e2e (9/9).

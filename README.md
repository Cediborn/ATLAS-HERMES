# Atlas

Personal operating system — a plain HTML/CSS/JS application with **real, persistent data**.
No build step, no framework, no backend required. Deployable to GitHub Pages as-is.

Every module — Projects, Calendar, Notes, Habits, Goals, Learning, Finance, Books, Coding —
is fully functional with real CRUD, and **all data persists in the browser** (IndexedDB).
Refresh the page, close and reopen the browser: your data is still there.

## Running locally

Module scripts (`<script type="module">`) don't execute over `file://` in Chrome — the
browser blocks it as a cross-origin request. Serve the folder instead of double-clicking it:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/app/index.html
```

## Structure

```
/index.html           Public landing page
/app/index.html       Atlas application shell (sidebar, topbar, dashboard, command palette)
/css                  tokens → base → components → app-shell/dashboard/landing + module styles
/js                   one ES module per responsibility (see below)
/assets               favicon / logo mark (SVG + PWA icon PNGs)
/tests                Headless-Chrome test harness (persistence round-trip + UI e2e)
```

### Architecture

The app follows a clean layered architecture — the UI never talks to storage directly:

```
UI (views) → application logic (state.js / repository.js, in-memory arrays)
           → persistence layer (js/persistence.js)
           → IndexedDB (js/db.js)
```

The in-memory arrays in each module's `data.js` are still what every view reads (so the UI
code never became async), but they are **hydrated from IndexedDB on boot** and every mutation
is **written through** to IndexedDB via `save*()` helpers. `data.js` is now *seed data* —
it only populates the database on first run.

`/js` breakdown:

| File | Owns |
|---|---|
| `db.js` | Thin promise wrapper over IndexedDB — one database, one object store per collection, every record scoped by `workspaceId` |
| `persistence.js` | First-run seeding, hydration (DB → arrays), write-through (`save*()`), workspace switching, profile, reset |
| `store.js` | Tiny observable state (theme, workspace, sidebar) + localStorage for UI preferences only |
| `theme.js` | Light/dark/system resolution, applies `data-theme` |
| `icons.js` | Inline SVG icon registry (no icon-font/CDN dependency) |
| `config.js` | App config split out of the old mock data — workspaces, nav, quick actions |
| `form-dialog.js` | One schema-driven create/edit/delete dialog, reused by Projects, Goals, Learning, Books, Coding, Finance |
| `notifications.js` | Notifications generated from real data (upcoming events, overdue projects, approaching goal deadlines, unfinished tasks) |
| `popover.js` | Shared dropdown behavior (workspace switcher, notifications, profile) |
| `sidebar.js` / `topbar.js` | Shell chrome |
| `command-palette.js` | ⌘K / Ctrl+K palette — searches user content across modules + actions |
| `router.js` | Hash-based routing (`#/dashboard`, `#/projects`, …) with lazy-loaded modules |
| `views.js` | Dashboard (all stats computed live), settings, and empty-state renderers |
| `main.js` | Bootstraps everything — hydrates data before routing |
| `landing.js` | Landing-page-only script (hero demo, pillar/philosophy render) |

Per-module (`js/<module>/`): `data.js` (model + seed), `state.js` (pure logic),
`components.js` (markup), `view.js` (page controller), plus module-specific pieces
(`calendar/repository.js` with recurrence + adapters, `notes/editor.js`, `habits/habit-dialog.js`,
`finance/dialog.js`, per-module `dialog.js` CRUD forms).

## Data persistence

- **Storage:** IndexedDB (database `atlas-db`), one object store per collection: `projects`,
  `events`, `notes`, `habits`, `habitCompletions`, `goals`, `resources`, `transactions`,
  `books`, `codingItems`, `codingSessions`, plus a `meta` store for profile/seed flags.
- **Workspaces are real data scopes.** Every record carries a `workspaceId`; switching
  workspaces hydrates that workspace's data. Projects, notes, goals, etc. belong to their
  workspace — it's not just a renamed label.
- **localStorage** is used only for lightweight UI preferences (theme, sidebar state),
  never for application data.
- **First run:** the database is seeded from the module `data.js` files (tag/calendar
  names map seed records to workspaces). After that, the database is the source of truth.
- **Reset:** Settings → Data → "Reset demo data" wipes every store and re-seeds.
  To clear manually: DevTools → Application → IndexedDB → `atlas-db` → Delete database.

### What persists

Projects (with tasks) · calendar events (incl. recurrence) · notes · habit completions and
streaks · goals (with milestones) · learning resources (with units) · financial transactions ·
books (reading progress) · coding items and sessions · profile (name/email) · settings.

## Search

The command palette (⌘K / Ctrl+K) searches your actual content across modules — projects,
tasks, notes, calendar events, goals, books, learning items — and navigates to the
module/item when selected.

## Notifications

Generated from real data: upcoming events, overdue projects, approaching goal deadlines,
unfinished tasks, habit due today. No fabricated notifications.

Optional **browser notifications** (Settings → Notifications): permission is only requested
when you flip the toggle on, and system notifications mirror the same real in-app items —
clicking one jumps to the relevant module.

## Offline & install (PWA)

Atlas is a progressive web app: `app/manifest.webmanifest` makes it installable, and
`app/sw.js` caches the app shell and assets so it keeps working offline after the first
visit (navigations go network-first, assets stale-while-revalidate). Bump `VERSION` in
`app/sw.js` when deploying a new build to force clients onto it.

## Data

Settings → Data has **Load demo data** (adds the sample dataset alongside your own data —
seed ids never collide with user-created ids) and **Reset demo data** (clears everything and
re-seeds). The dashboard also shows a one-time welcome banner on first run.

## Testing

```bash
python3 -m http.server 8123   # tests run in headless Chrome against a local server
node tests/cdp-driver.mjs "http://127.0.0.1:8123/tests/run-tests.html?run=1"
node tests/cdp-driver.mjs "http://127.0.0.1:8123/tests/run-tests.html?run=2"   # same profile = reload
node tests/ui-driver.mjs      # end-to-end: create a project through the real UI, reload, search
node tests/polish-driver.mjs  # PWA/offline, welcome banner, notification toggle, demo data
node tests/route-sweep.mjs    # visit every module, assert clean render
```

The persistence harness runs twice in the same Chrome profile: run 1 creates data, run 2
(simulated page reload) verifies everything survived, then deletes items and re-verifies.

## Deploying to GitHub Pages

1. Push this folder's contents to a repo.
2. Repo → **Settings → Pages** → Deploy from branch → pick `main` and `/ (root)`.
3. No build step, no Actions workflow required — it's already static.

`.nojekyll` is included so GitHub Pages serves files as-is without Jekyll processing.

## Future: cloud synchronization

The persistence layer was deliberately built as a seam. `db.js` is the only file that talks
to IndexedDB; `persistence.js` owns hydration/write-through and is the only module that
imports it. A future backend (e.g. tRPC/Postgres per the Foundation roadmap) can replace
`db.js` behind the same surface — views keep calling the same `save*()` functions and never
need to change. See `docs/BUILD_LOG.md` for the full architecture history.

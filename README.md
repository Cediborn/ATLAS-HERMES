# Atlas

Personal operating system — static shell (Phase 0/1 of the [Foundation doc](./ATLAS_FOUNDATION.md)).
Plain HTML/CSS/JS, no build step, no backend, no auth. Deployable to GitHub Pages as-is.

## Structure

```
/index.html          Public landing page
/app/index.html       Atlas application shell (sidebar, topbar, dashboard, command palette)
/css                  tokens → base → components → app-shell/dashboard/landing
/js                   one ES module per responsibility (see below)
/assets               favicon / logo mark
```

`/js` breakdown:

| File | Owns |
|---|---|
| `store.js` | Tiny observable state (theme, workspace, sidebar) + localStorage persistence |
| `theme.js` | Light/dark/system resolution, applies `data-theme` |
| `mock-data.js` | Single source of truth for all mock content — swap for real API calls later |
| `icons.js` | Inline SVG icon registry (no icon-font/CDN dependency) |
| `popover.js` | Shared dropdown behavior (workspace switcher, notifications, profile) |
| `sidebar.js` / `topbar.js` | Shell chrome |
| `command-palette.js` | ⌘K / Ctrl+K palette — search + actions unified |
| `router.js` | Hash-based routing (`#/dashboard`, `#/projects`, …) |
| `views.js` | Dashboard, empty-state, and settings renderers |
| `main.js` | Bootstraps everything — the only file that imports the others together |
| `landing.js` | Landing-page-only script (hero demo, pillar/philosophy render) |

## Running locally

Module scripts (`<script type="module">`) don't execute over `file://` in Chrome — the
browser blocks it as a cross-origin request. Serve the folder instead of double-clicking it:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

This has no effect on GitHub Pages, which always serves over HTTPS.

## Deploying to GitHub Pages

1. Push this folder's contents to a repo.
2. Repo → **Settings → Pages** → Deploy from branch → pick `main` (or whichever branch) and `/ (root)`.
3. No build step, no Actions workflow required — it's already static.

`.nojekyll` is included so GitHub Pages serves files as-is without Jekyll processing.

## Scope of this shell

- **Dashboard** and **Settings** are fully real (mock data, not lorem ipsum).
- The other nine sidebar items (Projects, Calendar, Notes, Habits, Goals, Learning, Finance,
  Books, Coding) render a designed empty state tagged with their Foundation §10 roadmap phase
  where one exists. Building those out is their own future milestone.
- Workspace switching, theme, and sidebar-collapsed state persist via `localStorage` only —
  there's no backend yet, per Foundation §3.2/§3.3.

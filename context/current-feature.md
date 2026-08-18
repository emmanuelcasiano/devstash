# Current Feature

Dashboard UI Phase 3

## Status

Completed

## Goals

Phase 3 of 3 for the dashboard UI layout — build out the main content area to the right of the sidebar. Use `@context/screenshots/dashboard-ui-main.png` as the visual reference and `@src/lib/mock-data.js` for data (import directly for now, until a database is implemented).

Requirements:

- The main area to the right
- Recent collections
- Pinned items
- 10 recent items
- 4 stats cards at the top for number of items, collections, favorite items, and favorite collections (not shown in the screenshot)

References:

- @context/screenshots/dashboard-ui-main.png
- @context/project-overview.md
- @src/lib/mock-data.js
- @context/features/dashboard-phase-1-spec.md
- @context/features/dashboard-phase-2-spec.md

## Notes

<!-- Any extra notes -->

## History

<!-- Keep this updated. Earliest to latest -->

- **2026-08-17** — Initial Next.js Setup: project scaffolded with Create Next App, Tailwind CSS configured.
- **2026-08-18** — Dashboard UI Phase 1: ShadCN UI initialized, `/dashboard` route added with main layout, dark mode by default, top bar (logo, search, New Collection, New Item), and sidebar/main placeholders.
- **2026-08-19** — Dashboard UI Phase 2 (Completed): collapsible sidebar with Types and Collections (favorites + recent) sections, item type links to `/items/[type]`, sidebar header ("Navigation" label + collapse toggle) and pinned user avatar footer spanning full width, drawer-based sidebar on mobile via Sheet, and a fixed-viewport-height dashboard shell (`h-screen` with internal `main` scroll) so the sidebar always fills the full screen height. Fixed a pre-existing broken `--font-sans` mapping so the app now renders with the intended Geist font. Lint and `npm run build` pass.
- **2026-08-19** — Dashboard UI Phase 3 (Completed): main dashboard content built out with 4 stats cards (items, collections, favorite items, favorite collections), a recent collections grid (name, favorite star, item count, description, type icons), a pinned items section, and a 10-item recent items list, each item/collection rendered as its own card. Added the shadcn `card` component and expanded `mock-data.ts` with more items and multi-collection assignments so collections show 2-3 distinct types. Lint and `npm run build` pass.

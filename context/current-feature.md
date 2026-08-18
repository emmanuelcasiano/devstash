# Current Feature

<!-- Feature Name -->

## Status

<!-- Not Started|In Progress|Completed -->

## Goals

<!-- Goals & requirements -->

## Notes

<!-- Any extra notes -->

## History

<!-- Keep this updated. Earliest to latest -->

- **2026-08-17** — Initial Next.js Setup: project scaffolded with Create Next App, Tailwind CSS configured.
- **2026-08-18** — Dashboard UI Phase 1: ShadCN UI initialized, `/dashboard` route added with main layout, dark mode by default, top bar (logo, search, New Collection, New Item), and sidebar/main placeholders.
- **2026-08-19** — Dashboard UI Phase 2 (Completed): collapsible sidebar with Types and Collections (favorites + recent) sections, item type links to `/items/[type]`, sidebar header ("Navigation" label + collapse toggle) and pinned user avatar footer spanning full width, drawer-based sidebar on mobile via Sheet, and a fixed-viewport-height dashboard shell (`h-screen` with internal `main` scroll) so the sidebar always fills the full screen height. Fixed a pre-existing broken `--font-sans` mapping so the app now renders with the intended Geist font. Lint and `npm run build` pass.

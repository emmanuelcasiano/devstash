# Current Feature

Seed Data

## Status

In Progress

## Goals

- Overwrite `prisma/seed.ts` to populate the database with sample data for development and demos, per `context/features/seed-spec.md`
- Seed a demo `User` (demo@devstash.io, password hashed with bcryptjs at 12 rounds, `isPro: false`, `emailVerified` set to the current date)
- Seed the 7 system `ItemType` rows (unchanged from the current setup)
- Seed 5 collections owned by the demo user, each with items per the spec: React Patterns (3 snippets), AI Workflows (3 prompts), DevOps (1 snippet, 1 command, 2 links), Terminal Commands (4 commands), Design Resources (4 links)

## Notes

- Full requirements: `context/features/seed-spec.md`
- `bcryptjs` isn't installed yet — will need to add it (and `@types/bcryptjs` if not bundled) as a dependency.
- Links should use real, working URLs per the spec (not placeholders).
- Re-running the seed script should stay idempotent — check for the demo user/existing rows before creating, same pattern as the current system-item-type seeding.
- This overwrites the existing `prisma/seed.ts` from the Prisma + Neon Postgres Setup feature; the system item type seeding logic should be preserved/merged in, not dropped.

## History

<!-- Keep this updated. Earliest to latest -->

- **2026-08-17** — Initial Next.js Setup: project scaffolded with Create Next App, Tailwind CSS configured.
- **2026-08-18** — Dashboard UI Phase 1: ShadCN UI initialized, `/dashboard` route added with main layout, dark mode by default, top bar (logo, search, New Collection, New Item), and sidebar/main placeholders.
- **2026-08-19** — Dashboard UI Phase 2 (Completed): collapsible sidebar with Types and Collections (favorites + recent) sections, item type links to `/items/[type]`, sidebar header ("Navigation" label + collapse toggle) and pinned user avatar footer spanning full width, drawer-based sidebar on mobile via Sheet, and a fixed-viewport-height dashboard shell (`h-screen` with internal `main` scroll) so the sidebar always fills the full screen height. Fixed a pre-existing broken `--font-sans` mapping so the app now renders with the intended Geist font. Lint and `npm run build` pass.
- **2026-08-19** — Dashboard UI Phase 3 (Completed): main dashboard content built out with 4 stats cards (items, collections, favorite items, favorite collections), a recent collections grid (name, favorite star, item count, description, type icons), a pinned items section, and a 10-item recent items list, each item/collection rendered as its own card. Added the shadcn `card` component and expanded `mock-data.ts` with more items and multi-collection assignments so collections show 2-3 distinct types. Lint and `npm run build` pass.
- **2026-08-22** — Prisma + Neon PostgreSQL Setup (Completed): Prisma 7 wired up with `@prisma/adapter-neon` driver adapter (v7 requires driver adapters and removed `directUrl` from the schema, so `prisma.config.ts` points the CLI at a direct/unpooled `DIRECT_URL` while the app runtime client in `src/lib/prisma.ts` uses the pooled `DATABASE_URL`). Full initial schema added (`User`, `Account`, `Session`, `VerificationToken`, `Item`, `ItemType`, `Collection`, `ItemCollection`, `Tag`) with indexes and cascade deletes per `context/features/database-spec.md`. Ran `prisma migrate dev --name init` and `prisma db seed` against the Neon dev branch (never `db push`); `prisma migrate status` confirms the schema is in sync. Lint and `npm run build` pass. Merged to `main`, branch deleted.

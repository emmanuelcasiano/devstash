# Current Feature

Prisma + Neon PostgreSQL Setup

## Status

Completed

## Goals

- Set up Prisma ORM (v7) with a Neon PostgreSQL (serverless) database
- Create the initial schema based on the data models in `context/project-overview.md` (schema will evolve over time)
- Include NextAuth models: `Account`, `Session`, `VerificationToken`
- Add appropriate indexes and cascade deletes

## Notes

- Two Neon branches will be used: a development branch (`DATABASE_URL` locally) and a production branch. Always create migrations with `prisma migrate dev`; never use `db push` or push schema changes directly.
- Prisma 7 has breaking changes vs earlier versions — read the upgrade guide (https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7) before implementing.
- Reference the Prisma Postgres quickstart for setup steps: https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/prisma-postgres
- Full requirements: `context/features/database-spec.md`
- Scaffolding is done on branch `feature/prisma-neon-setup`: `prisma.config.ts` (Prisma 7 config, driver adapters, no more `directUrl` in schema), `prisma/schema.prisma` (full model set + NextAuth models), `prisma/seed.ts`, `src/lib/prisma.ts` (Neon adapter client singleton), `.env`/`.env.example` with placeholder Neon URLs. `npx prisma generate`, `npm run build`, and `npm run lint` all pass.
- `.env` now has real Neon dev-branch connection strings (`DATABASE_URL` pooled, `DIRECT_URL` derived by dropping the `-pooler` suffix per Neon's convention). Ran `npx prisma migrate dev --name init` against the Neon dev branch — migration `20260821184403_init` applied successfully — followed by `npx prisma db seed` (7 system item types seeded). `npx prisma migrate status` confirms the database schema is in sync, and `npm run build` passes with the migration present.
## History

<!-- Keep this updated. Earliest to latest -->

- **2026-08-17** — Initial Next.js Setup: project scaffolded with Create Next App, Tailwind CSS configured.
- **2026-08-18** — Dashboard UI Phase 1: ShadCN UI initialized, `/dashboard` route added with main layout, dark mode by default, top bar (logo, search, New Collection, New Item), and sidebar/main placeholders.
- **2026-08-19** — Dashboard UI Phase 2 (Completed): collapsible sidebar with Types and Collections (favorites + recent) sections, item type links to `/items/[type]`, sidebar header ("Navigation" label + collapse toggle) and pinned user avatar footer spanning full width, drawer-based sidebar on mobile via Sheet, and a fixed-viewport-height dashboard shell (`h-screen` with internal `main` scroll) so the sidebar always fills the full screen height. Fixed a pre-existing broken `--font-sans` mapping so the app now renders with the intended Geist font. Lint and `npm run build` pass.
- **2026-08-19** — Dashboard UI Phase 3 (Completed): main dashboard content built out with 4 stats cards (items, collections, favorite items, favorite collections), a recent collections grid (name, favorite star, item count, description, type icons), a pinned items section, and a 10-item recent items list, each item/collection rendered as its own card. Added the shadcn `card` component and expanded `mock-data.ts` with more items and multi-collection assignments so collections show 2-3 distinct types. Lint and `npm run build` pass.
- **2026-08-22** — Prisma + Neon PostgreSQL Setup (Completed): Prisma 7 wired up with `@prisma/adapter-neon` driver adapter (v7 requires driver adapters and removed `directUrl` from the schema, so `prisma.config.ts` points the CLI at a direct/unpooled `DIRECT_URL` while the app runtime client in `src/lib/prisma.ts` uses the pooled `DATABASE_URL`). Full initial schema added (`User`, `Account`, `Session`, `VerificationToken`, `Item`, `ItemType`, `Collection`, `ItemCollection`, `Tag`) with indexes and cascade deletes per `context/features/database-spec.md`. Ran `prisma migrate dev --name init` and `prisma db seed` against the Neon dev branch (never `db push`); `prisma migrate status` confirms the schema is in sync. Lint and `npm run build` pass. Merged to `main`, branch deleted.

# Stripe Integration: Core Infrastructure (Phase 1)

## Overview

Lay the groundwork for DevStash Pro ($8/month or $72/year) without changing any user-facing behavior: the Stripe SDK and lazy client, the pure plan/usage-limit rules with unit tests, and a session that carries a DB-fresh `isPro` flag. Nothing here talks to Stripe over the network, and nothing is enforced yet, so this phase can be built and verified **without the Stripe CLI, a webhook, or Stripe Dashboard setup**.

Reference: `docs/stripe-integration-plan.md` (§ numbers below point into it). Phase 2 (`stripe-phase-2-spec.md`) builds webhooks, checkout, gating, and UI on top of this.

## Requirements

### 1. Package and environment

- Install `stripe` (`npm i stripe`). The plan's API types were researched against `stripe-node` v19; confirm type names against the installed version (plan §11 #10) and adjust if needed.
- `.env.example` (it already has an uncommitted `# Stripe` block, and it has no trailing newline):
    - Add `PRO_GATING_ENABLED` with an explanatory comment in the same style as `EMAIL_VERIFICATION_ENABLED` (the literal `"false"` gives everyone Pro access during development; unset or any other value keeps gating on).
    - Decide on `STRIPE_PUBLISHABLE_KEY`. Hosted Checkout doesn't use it, so either drop it or keep it with a comment that it is reserved for embedded Checkout / Stripe.js.
    - Note in the `APP_URL` comment that it is also used for Stripe return URLs.
    - End the file with a trailing newline.

### 2. Stripe client, `src/lib/stripe.ts` (plan §6.1)

- `isStripeConfigured()` returns true only when `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_MONTHLY`, and `STRIPE_PRICE_ID_YEARLY` are all set.
- `getStripe()` returns a lazily created client cached on `globalThis` (same pattern as `src/lib/prisma.ts` and `src/lib/r2.ts`) and throws a clear error when `STRIPE_SECRET_KEY` is unset.
- Do not pass `apiVersion`; the SDK's pinned default applies.
- Server-only. Never import it from a client component.

### 3. Pure plan rules, `src/lib/billing/plans.ts` (plan §6.2)

This is the "usage-limits module". It must have **no** Prisma, `auth`, or Stripe imports; anything that reaches `src/lib/prisma.ts` throws at import time under Vitest because `DATABASE_URL` is unset. Exports:

- Constants: `FREE_ITEM_LIMIT = 50`, `FREE_COLLECTION_LIMIT = 3`, `BILLING_PLANS = ["monthly", "yearly"]`, type `BillingPlan`
- `isBillingPlan(value: unknown)` type guard
- `priceIdForPlan(plan)` reads `STRIPE_PRICE_ID_MONTHLY` / `STRIPE_PRICE_ID_YEARLY`
- `isProSubscriptionStatus(status)`: `active`, `trialing`, `past_due` (grace period while Stripe retries the card)
- `isTerminalSubscriptionStatus(status)`: `canceled`, `incomplete_expired`
- `hasProAccess(isPro)`: `isPro || process.env.PRO_GATING_ENABLED === "false"`
- `GateResult` type and the three error strings `PRO_TYPE_ERROR`, `ITEM_LIMIT_ERROR`, `COLLECTION_LIMIT_ERROR` (each ends by pointing at an upgrade)
- `canCreateItem({ hasPro, itemCount, itemType })`: Pro always allowed; otherwise a file/image type is blocked first (via the existing `isProItemType`), then `itemCount >= FREE_ITEM_LIMIT` is blocked
- `canCreateCollection({ hasPro, collectionCount })`

### 4. Unit tests, `src/lib/billing/plans.test.ts`

Test file sits next to the module and is named `.test.ts`, per the Testing standard. Use the `@/*` alias and no mocks. Use `vi.stubEnv` for env-dependent cases and `vi.unstubAllEnvs()` in `afterEach` so tests don't leak state.

- `canCreateItem`
    - Pro is allowed at any count and for any type, including `file` / `image`
    - Free + `file` and free + `image` are blocked with `PRO_TYPE_ERROR`
    - Free + `snippet` at 49 items is allowed; at 50 and above it is blocked with `ITEM_LIMIT_ERROR`
    - Free + `file` at 50 items returns `PRO_TYPE_ERROR`, not the limit error (the type check runs first)
    - Each blocked result carries a non-empty `error`; allowed results have no `error`
- `canCreateCollection`: 0 and 2 allowed, 3 and above blocked with `COLLECTION_LIMIT_ERROR`, Pro allowed at any count
- `isProSubscriptionStatus`: `active` / `trialing` / `past_due` are true; `canceled` / `unpaid` / `incomplete` / `incomplete_expired` / `paused` are false
- `isTerminalSubscriptionStatus`: `canceled` and `incomplete_expired` are true; `active` / `past_due` / `unpaid` / `incomplete` are false
- `isBillingPlan`: `"monthly"` and `"yearly"` are true; `"weekly"`, `""`, `undefined`, `null`, and `42` are false
- `priceIdForPlan`: returns the env value for each plan via `vi.stubEnv`; returns `undefined` when unset
- `hasProAccess`: a free user gets `false` when `PRO_GATING_ENABLED` is unset; `"false"` gives `true` for a free user; any other value (e.g. `"true"`) does not grant access; a Pro user is `true` either way

### 5. Session carries `isPro` (plan §7.1–7.4)

- `src/types/next-auth.d.ts`: add `isPro: boolean` to `Session["user"]`, and augment `next-auth/jwt` with `isPro?: boolean`.
- `src/auth.config.ts` (edge-safe): the `session` callback also sets `session.user.isPro = token.isPro === true`. No Prisma here.
- `src/auth.ts` (Node only): add a `jwt` callback that re-reads `isPro` from the database on every call (`prisma.user.findUnique({ where: { id: token.sub }, select: { isPro: true } })`; a missing user resolves to `false`).
    - **The `callbacks` object must be `{ ...authConfig.callbacks, jwt }`.** A plain `{ jwt }` replaces the whole object and silently drops the `session` callback, so `session.user.id` becomes `undefined` and every `requireUserId()` fails.
    - Do not copy the `if (user) { token.sub = user.id }` block from the research prompt; Auth.js already sets `token.sub`.
- `src/lib/db/current-user.ts`: add `getCurrentUserIsPro()`, wrapped in `React.cache` like `getCurrentUserId()`, returning `session?.user?.isPro ?? false`.
- The edge `proxy.ts` instance never runs the `jwt` callback and re-issues whatever `isPro` is in the cookie. That is fine because the proxy makes no plan decisions. Do not touch `proxy.ts`.

### 6. Out of scope for this phase

Webhook route, subscription sync, checkout/portal actions, billing UI, limit enforcement, `PlanProvider`, delete-account cancellation, seed changes, and the DB-backed `limits.ts` helpers. All of these are Phase 2.

## Notes

- **No DB migration.** `isPro`, `stripeCustomerId`, and `stripeSubscriptionId` already exist from the `init` migration.
- **No behavior change.** `hasProAccess()` and the limit checks exist but nothing calls them yet. The only runtime difference is one extra primary-key lookup per `auth()` call from the `jwt` callback (plan §7.1 describes a throttle if that ever shows up in profiling).
- Read the relevant guides in `node_modules/next/dist/docs/` before touching auth code (per `CLAUDE.md`).
- Any DB access during testing goes to the Neon **`development`** branch only (`br-mute-feather-axce0ux5`). Toggling a test user's `isPro` is a write, so ask before running it and set it back afterward.

## Testing

- `npm test` passes with the new `plans.test.ts` (baseline is 13 files / 130 tests). Add nothing else: the Stripe client is thin SDK glue with no mocking harness in the repo, and the `jwt` / `current-user` changes are Prisma + `auth()`.
- `npm run lint` and `npm run build` pass. The build route list is unchanged.
- Manual, dev server restarted so the new dependency and env resolve:
    - Sign in with **credentials** and with **GitHub**, and confirm both still land on `/dashboard` with the sidebar user, items, and collections intact (proves the `session` callback wasn't dropped).
    - `GET /api/auth/session` returns `user.id` **and** `user.isPro: false` for a normal user.
    - After flipping a test user's `isPro` to `true` in the Neon dev branch (with permission), the next `/api/auth/session` shows `isPro: true` without signing out. Revert afterward.
    - With no `STRIPE_SECRET_KEY` set, importing `src/lib/stripe.ts` is harmless; the error is thrown only when `getStripe()` is called.

# Stripe Integration: Webhooks, Gating & UI (Phase 2)

## Overview

Build on Phase 1 to let users actually pay and be limited: the webhook that keeps `User.isPro` in sync, Stripe-hosted Checkout and the Billing Portal, free-plan limit enforcement, and the Settings billing UI plus proactive upgrade prompts in the create dialogs.

**Requires Phase 1** (`stripe-phase-1-spec.md`): the `stripe` package, `src/lib/stripe.ts`, `src/lib/billing/plans.ts`, and `session.user.isPro` / `getCurrentUserIsPro()` must already exist.

Reference: `docs/stripe-integration-plan.md` (§ numbers below point into it).

## Prerequisites (needs the Stripe CLI)

Everything in this phase is verified end to end against Stripe **test mode**:

- Stripe CLI installed and `stripe login` done
- Stripe Dashboard test-mode setup per plan §8 steps 1–3: secret key, a **DevStash Pro** product with a **$8/month** and a **$72/year** price, and the Customer Portal configured and activated (portal sessions fail without an active configuration)
- `.env` filled in: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_YEARLY`, `APP_URL`, and `STRIPE_WEBHOOK_SECRET` (the `whsec_…` printed by the command below)
- `stripe listen --forward-to localhost:3000/api/webhooks/stripe` running for the whole test session
- Dev server restarted after any `.env` change (env isn't hot-reloaded)
- Local `.env` sets `PRO_GATING_ENABLED="false"` while billing is being built and validated; flip it to unset in Part C

## Requirements

### Part A: Webhook and subscription sync

1. **`src/lib/billing/subscription-sync.ts`** (plan §6.4): `stripeId(ref)` normalizes `string | { id } | null`, and `applySubscription(subscription, knownUserId?)` is the **single write path** for plan state.
    - Resolves the user from `knownUserId` (Checkout's `client_reference_id`), else `subscription.metadata.userId`, else `stripeCustomerId`; an unknown customer logs a warning and returns without throwing.
    - Writes the *current* state, never a delta: `isPro = isProSubscriptionStatus(status)`, `stripeCustomerId`, and `stripeSubscriptionId` (set to `null` on terminal statuses). This makes every branch idempotent, so no processed-events table is needed.
    - Out-of-order guard: a non-Pro event for a subscription id that differs from the user's current `stripeSubscriptionId` is ignored, so a dead old subscription can't revoke a newer one.
    - `stripeCustomerId` is retained after cancel so the portal and a re-subscribe reuse the same customer.
2. **`src/app/api/webhooks/stripe/route.ts`** (plan §6.5): `POST` only.
    - Signature verification is the only auth (no session, no rate limit). Read the raw body with `await request.text()`; parsing JSON first breaks the signature.
    - Status codes: `503` when Stripe/webhook env is missing, `400` for a missing or invalid signature, `500` for our own failures so Stripe retries, `200` for everything handled or intentionally ignored.
    - Handle `checkout.session.completed` (subscription mode only; retrieve the subscription, then `applySubscription(sub, session.client_reference_id)`) and `customer.subscription.created` / `updated` / `deleted`. Acknowledge any other event type.
    - Do **not** widen the `proxy.ts` matcher (it is `/dashboard/:path*`); the route is never intercepted.
    - Read the Route Handlers / Webhooks guide in `node_modules/next/dist/docs/` first (per `CLAUDE.md`).

### Part B: Checkout, portal, and Billing settings UI

3. **`src/lib/billing/checkout.ts`** (plan §6.6): `createCheckoutUrl(userId, plan)` and `createPortalUrl(userId)`.
    - The Stripe customer is created **and saved before** Checkout starts (with an `idempotencyKey` such as `devstash-customer-<userId>`), so later subscription events can always be matched by `stripeCustomerId` even if they arrive before `checkout.session.completed`.
    - Checkout session: `mode: "subscription"`, `client_reference_id: userId`, `subscription_data.metadata.userId`, `allow_promotion_codes: true`, `success_url` = `<base>/settings?checkout=success`, `cancel_url` = `<base>/settings?checkout=canceled`.
    - Base URL comes from `APP_URL` (trailing slashes stripped), falling back to the request `origin` header, else a clear error. Server Actions have no `Request`, so `getAppBaseUrl(request)` from `verification.ts` can't be reused as-is.
    - `createPortalUrl` returns `null` when the user has no `stripeCustomerId`; its return URL is `<base>/settings`.
4. **`src/actions/billing.ts`** (a new `"use server"` file, `ActionResult<T>` contract): `createCheckoutSession(plan: unknown)` and `createPortalSession()`, each returning `{ url }`.
    - `requireUserId` → validate (`isBillingPlan`) → `isStripeConfigured()` → rate limit → work in try/catch with `GENERIC_ERROR`.
    - `createCheckoutSession` also refuses when the user is already Pro.
    - Return `{ url }` instead of calling `redirect()`, so failures can toast; the client does `window.location.assign(url)`.
5. **`src/lib/rate-limit.ts`**: add a `billing` limiter (10 per hour, prefix `rl:billing`, keyed on `session.user.id`), fail-open like the others.
6. **`src/lib/db/user.ts`**: extend `ProfileUser` with `isPro: boolean` and `hasStripeCustomer: boolean`. Return booleans only, never the Stripe ids.
7. **`src/components/settings/BillingSettings.tsx`** (client leaf, plan §6.8):
    - **Free user:** "Free plan" badge, usage meters `n / 50 items` and `n / 3 collections`, a Monthly $8 / Yearly $72 segmented control (yearly is the better price, save 25%), and an **Upgrade to Pro** button that calls `createCheckoutSession`.
    - **Pro user:** "Pro" badge and a **Manage subscription** button that calls `createPortalSession` (plan switching, payment method, cancel, and invoices all live in the portal; build none of that UI).
    - **Cancelled user** (has a Stripe customer, not Pro): the Free view plus a "Billing history" link that opens the portal.
    - **`?checkout=success` while not yet Pro:** the webhook may lag the redirect, so show a "Payment received, activating Pro…" notice and `router.refresh()` every ~2 s, up to ~5 attempts. Each refresh re-runs `auth()`, whose `jwt` callback re-reads `isPro`. On the first render where `isPro` is true, `toast.success("Welcome to DevStash Pro!")`.
    - **`?checkout=canceled`:** `toast("Checkout canceled. You weren't charged.")`.
    - Errors use the existing `<FormError>` **and** `toast.error`.
8. **`src/app/(app)/settings/page.tsx`**: accept `searchParams: Promise<{ checkout?: string }>`, fetch `getItemStats()` and `getCollectionStats()` in parallel with the user, and add a **Billing** section above "Account" using the same `Card > CardContent` pattern. Show the real DB value (`user.isPro`), not `hasProAccess()`, so a developer with gating disabled still sees their true plan.

### Part C: Feature gating

9. **`src/lib/billing/limits.ts`** (plan §6.3): `getItemCreationBlock(itemType)` and `getCollectionCreationBlock()` return an error string or `null`. Pro (or gating off) skips the count query.
10. **Enforce in the server actions** (plan §7.5), after `requireUserId` and Zod parsing so the parsed `type` is available: `createItem` in `src/actions/items.ts` and `createCollection` in `src/actions/collections.ts` return `{ success: false, error }` with the limit message. The existing inline `FormError` + `toast.error` in both dialogs already surface it.
11. **`POST /api/upload`** (plan §7.6): after the 401 check and **before** `isR2Configured()` / `formData()`, return `403 { error: PRO_TYPE_ERROR, code: "UPGRADE_REQUIRED" }` for non-Pro users, so a 10 MB body is never buffered or written to R2 just to be rejected.
12. **Never gate** `GET /api/items/[id]/download`, `updateItem`, `deleteItem`, or the favorite/pin toggles. A downgraded user keeps all existing data and can still download their own files; only *creating* past the free limits is blocked. Nothing is deleted or hidden on downgrade.
13. **`PlanProvider`** (`src/components/billing/plan-provider.tsx`, plan §6.7): a client context of `{ hasPro, itemCount, collectionCount }`, mounted in `src/app/(app)/layout.tsx` alongside the other providers. Derive the counts from data the layout already fetches (`getItemTypesWithCounts()` totals and the full collections list), so **no new queries**. Confirm the count field's real name on `ItemTypeWithCount`.
14. **`src/components/billing/UpgradeNotice.tsx`** (plan §6.9): a small `FormNotice`-styled block linking to `/settings` with a plain `<Link>` styled by `buttonVariants` (not `Button render={<Link/>}`, per the repo's base-ui workaround).
15. **Create dialogs** (plan §7.8): in `NewItemDialog`, show a **PRO** badge on the File/Image selector options for non-Pro, render `UpgradeNotice` instead of `FileUpload` for those types with Create disabled, and show a limit notice with Create disabled at `itemCount >= FREE_ITEM_LIMIT`. In `NewCollectionDialog`, do the same at `collectionCount >= FREE_COLLECTION_LIMIT`. This is UX on top of the server enforcement, not a replacement for it.
16. **`prisma/seed.ts`**: set `isPro: true` on the demo user and add an idempotent update in the found-user branch. It seeds 5 collections (limit 3) and would otherwise be permanently over-limit once gating is on.

### Part D: Account deletion safety

17. **`src/app/api/auth/delete-account/route.ts`** (plan §7.10): before `prisma.user.delete`, cancel the user's Stripe subscription if `stripeSubscriptionId` is set (a value import of `Stripe` is needed for the `Stripe.errors.StripeInvalidRequestError` check). Treat `resource_missing` as already gone; on any other Stripe error, log and return `500` with a clear message, and **do not delete**. An undeleted account is recoverable; a still-billing orphan is not. The Stripe *customer* is left in place for invoice history.
18. Update the delete-account dialog copy in `src/components/settings/AccountActions.tsx` to say an active subscription is cancelled immediately.

### Docs

19. Add a `context/current-feature.md` history entry when complete, and update `docs/item-crud-architecture.md` if it still describes the Pro gate as deferred.

## Out of scope

Custom types, AI features, and data export (not built; `hasProAccess()` / `getCurrentUserIsPro()` are the hook they will use later), Stripe Tax / trials, refunds (handled in the Dashboard), the optional "Upgrade" link in the sidebar dropdown (plan §7.12), and the homepage "Upgrade to Pro" button, which keeps pointing at `/register`. Live-mode setup (plan §8 / §9.6) happens at launch, not here.

## Notes

- **No DB migration**, and no new env vars beyond Phase 1's.
- **Suggested commit split** so gating can stay off while billing is validated: (1) Part A + B; (2) Part C; (3) Part D. Commit only with permission, after lint / tests / build pass, with a Conventional Commit message and no Claude attribution.
- **`PRO_GATING_ENABLED` default is ON when unset.** Decide before merging Part C: turning it on changes behavior for every existing non-Pro account. The recommendation is to keep the secure default and set `="false"` in local `.env` until launch (plan §11 #1).
- The limit check is count-then-insert, not atomic, so concurrent creates can overshoot by one. That is accepted for a soft product limit; don't build locking.
- `stripe trigger checkout.session.completed` creates fixture objects that aren't tied to a DevStash user, so it only exercises the unknown-customer path. Use a real Checkout with a test card for the happy path.
- Any DB inspection or edits use the Neon **`development`** branch only (`br-mute-feather-axce0ux5`); never production. Ask before any write, and clean up test users afterward.

## Testing

**Automated.** `npm run lint`, `npm test`, and `npm run build` pass; the build route list gains `/api/webhooks/stripe`. No new unit tests: the webhook, `subscription-sync.ts`, `checkout.ts`, `limits.ts`, and the actions are Prisma + `auth()` + Stripe glue with no mocking harness in the repo, and the decision logic they call is already covered by Phase 1's `plans.test.ts`.

**Manual: happy paths** (Stripe CLI running, test mode)

- Free user sees "Free" with `n / 50` and `n / 3` in Settings → Billing.
- Upgrade **monthly** with `4242 4242 4242 4242` → `/settings?checkout=success` → notice → the badge flips to **Pro** without a manual reload. The DB row has `isPro = true`, `stripeCustomerId`, and `stripeSubscriptionId`.
- Upgrade **yearly** on a fresh account → same result, $72 on Checkout.
- Cancel out of Checkout → `?checkout=canceled` toast, still Free, customer saved but `stripeSubscriptionId` null.
- **Manage subscription** opens the portal and the return link lands on `/settings`.
- Cancel at period end in the portal → still Pro; then cancel immediately from the Dashboard → `customer.subscription.deleted` → `isPro = false`, `stripeSubscriptionId = null`, `stripeCustomerId` retained.
- Re-subscribe after cancel reuses the same Stripe customer.

**Manual: gating** (with `PRO_GATING_ENABLED` unset)

- Free user at 50 items: New Item is blocked in the dialog and a crafted `createItem` call is rejected with the limit message; at 49 it succeeds.
- Free user at 3 collections: New Collection blocked; at 2 it succeeds.
- Free user selecting File/Image sees the PRO badge and upgrade notice; a direct `POST /api/upload` returns `403 { code: "UPGRADE_REQUIRED" }` with no R2 write.
- Pro user hits none of these blocks. The demo user (`isPro: true` after re-seeding) can still create collections.
- Downgraded user: existing over-limit items, collections, and file/image items stay visible and editable, files still download, and only creation is blocked.
- `PRO_GATING_ENABLED="false"` lets a free user create file items and exceed limits.

**Manual: webhook robustness**

- Tampered payload or wrong secret → `400`, no DB change. Missing `stripe-signature` → `400`. Missing env → `503`.
- Resending the same event from the Dashboard twice leaves identical DB state.
- An event for an unknown customer → `200` with a logged warning, no crash.
- An old subscription's `deleted` event arriving after a new one is active does **not** revoke Pro.
- Failed renewal via a Test Clock and card `4000 0000 0000 0341`: `past_due` keeps Pro, then `unpaid` / `canceled` revokes it.
- Forcing a handler error (e.g. stopping the DB) → `500`, and the Stripe CLI/Dashboard shows the retry.

**Manual: account and security**

- Delete a Pro account → the subscription is cancelled in Stripe **before** the row is deleted; simulating a Stripe failure aborts the deletion with the error message.
- Checkout / portal actions when signed out return the "sign in" error.
- Rapid repeated Checkout clicks create a single Stripe customer, and the `billing` rate limit eventually kicks in.
- `/api/auth/session` includes `user.isPro`, and dashboards still get `user.id`.
- Both a GitHub-only and a credentials user can upgrade.
- No Stripe secret or price id appears in client bundles or page source.

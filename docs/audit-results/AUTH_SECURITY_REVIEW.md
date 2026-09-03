# Auth Security Review

**Last audit:** 2026-09-03
**Scope:** NextAuth v5 auth stack — Credentials + GitHub providers, registration,
email verification, forgot-password / password reset, resend-verification, sign-out,
and the profile page account actions (change password, delete account).
**Auditor:** auth-auditor agent (run manually — the agent definition is not yet
registered as a spawnable subagent in this session)

## Summary

The auth implementation is solid on the fundamentals that are easy to get wrong:
bcrypt hashing at cost 12 everywhere, 256-bit CSPRNG tokens with enforced expiry and
single-use consumption, session-scoped mutations that never trust a client-supplied
user id, and deliberately non-enumerable `forgot-password` / `resend-verification`
responses. Eight issues were found: **1 High**, **1 Medium**, **6 Low**. The one that
matters is the complete absence of rate limiting / brute-force protection on every
auth endpoint — NextAuth does not provide this, and it leaves credential sign-in open
to online password guessing and the unauthenticated email-send routes open to abuse.
The Medium is a classic `//evil.com` open-redirect bypass on the sign-in `callbackUrl`.

## Findings

### 🟠 High

#### No rate limiting or brute-force protection on any auth endpoint
- **File:** `src/auth.ts:36` (`authorize`), `src/app/api/auth/register/route.ts:26`,
  `src/app/api/auth/forgot-password/route.ts:15`,
  `src/app/api/auth/resend-verification/route.ts:19`,
  `src/app/api/auth/reset-password/route.ts:23`,
  `src/app/api/auth/change-password/route.ts:23`
- **Issue:** There is no throttling, attempt counter, account lockout, backoff, or
  CAPTCHA anywhere in the auth stack (`grep` for rate-limit / throttle / upstash /
  lockout across `src/` returns nothing). NextAuth v5 does not add any of this — it is
  the application's responsibility.
- **Impact:**
  - *Credential stuffing / password guessing:* `POST /api/auth/callback/credentials`
    can be hammered indefinitely. `authorize` does one bcrypt compare per request and
    returns a distinguishable result; an attacker with a leaked email list can run
    unlimited online guesses against every account.
  - *Email bombing / cost amplification:* `forgot-password`, `resend-verification`,
    and `register` each trigger an outbound Resend email and are unauthenticated. A
    script can pin any victim's inbox with reset/verification mail and run up the
    Resend bill; there is no per-IP or per-address ceiling.
  - *Reset-token guessing:* `reset-password` accepts unlimited token attempts. The
    256-bit token makes this infeasible in practice, but the endpoint should still be
    capped.
  - *Registration flooding:* `register` can be used to mass-create rows.
- **Fix:** Put a shared rate-limiter in front of these handlers — e.g.
  `@upstash/ratelimit` with a sliding window keyed on client IP (from
  `request.headers.get("x-forwarded-for")`) for the unauthenticated routes, plus a
  stricter per-email limit on `forgot-password` / `resend-verification` / credential
  sign-in (e.g. 5 attempts / 15 min). For credential sign-in, enforce the limit inside
  `authorize` (throw a `CredentialsSignin` subclass with a `code` the form can show) or
  in a thin wrapper route. Add a short lockout/backoff after repeated failures for a
  single account. `change-password` is lower risk (needs a valid session) but should
  still get a modest per-user cap.

### 🟡 Medium

#### Open redirect on the sign-in page via protocol-relative `callbackUrl`
- **File:** `src/components/auth/SignInForm.tsx:29-31` (and the post-login
  `router.push(callbackUrl)` at line 91)
- **Issue:** `callbackUrl` is accepted whenever `rawCallback.startsWith("/")` is true.
  A protocol-relative URL such as `//evil.com` (or `/\evil.com`, which browsers
  normalize to `//evil.com`) passes that check, and after a successful credentials
  sign-in the code calls `router.push(callbackUrl)`, which navigates the browser to
  `https://evil.com`.
- **Impact:** A phishing link like
  `https://<app>/sign-in?callbackUrl=//evil.com` sends the user to an attacker page
  immediately after they authenticate on the real site, when they are most likely to
  trust the destination (credential re-prompt, fake "session expired", etc.). The
  GitHub button is not affected — `signIn("github", { redirectTo })` is sanitized
  server-side by Auth.js — but the credentials path does its own `router.push` with no
  such check. `src/proxy.ts` only ever writes an internal `pathname + search` value, so
  the vulnerable input is a hand-crafted query string.
- **Fix:** Reject protocol-relative and backslash-prefixed values. Replace the guard
  with something like
  `const safe = /^\/[^/\\]/.test(rawCallback ?? "") ? rawCallback! : "/dashboard";`
  or resolve and origin-check: `new URL(rawCallback, window.location.origin).origin ===
  window.location.origin`. Apply the same validation anywhere `callbackUrl` is read.
- **Verdict:** CONFIRMED (the string check is definitively insufficient; see the
  Next.js open-redirect references in Notes).

### 🟢 Low

#### `verify-email` can consume a pending password-reset token (cross-flow burn)
- **File:** `src/lib/auth/verification-token.ts:30-45` (`consumeEmailVerificationToken`)
- **Issue:** `consumePasswordResetToken` correctly refuses any token whose identifier
  lacks the `password-reset:` prefix (`password-reset-token.ts:43`), but
  `consumeEmailVerificationToken` has no matching guard — it will look up *any* token
  row by value, delete it, and return `record.identifier`. So
  `GET /api/auth/verify-email?token=<a password-reset token>` deletes the reset row
  (then fails the `user.update` on the prefixed pseudo-email and redirects to the
  invalid page).
- **Impact:** Low. Whoever holds the token can invalidate the *other* flow's pending
  link for that address. The token only exists in the user's own inbox, and reset
  links point at the `/reset-password` page (not this API route), so there is no
  realistic prefetch/scanner path that triggers it. Effect is a minor self-inflicted
  DoS on the reset link.
- **Fix:** In `consumeEmailVerificationToken`, reject rows whose `identifier` contains
  `":"` or starts with a known prefix, mirroring the reset helper's check.

#### Verification / reset tokens stored in plaintext; non-atomic consumption
- **File:** `src/lib/auth/verification-token.ts:19` and `:33-38`,
  `src/lib/auth/password-reset-token.ts:27` and `:42-47`
- **Issue:** Tokens are written to `verification_tokens.token` as-is, so a read-only
  leak of that table (backup, log, SQL injection elsewhere) yields directly usable
  links. Separately, `consume*` does `findUnique` then a second `delete` rather than a
  single atomic delete-and-return, leaving a small window where two concurrent requests
  with the same token both pass.
- **Impact:** Low. Tokens are 256-bit, single-use, and short-lived (24 h / 1 h), and
  both concurrent requests in the race would carry the same form payload, so the
  practical damage is negligible. This is defense-in-depth.
- **Fix:** Store `sha256(token)` and look up by the hash (send the raw token in the
  link only). Consume with a single `deleteMany({ where: { token, expires: { gt: now }}})`
  and treat a zero count as "invalid", removing the read-then-delete gap.

#### Email link base falls back to the request Origin when `APP_URL` is unset
- **File:** `src/lib/auth/verification.ts:26-29` (`getAppBaseUrl`)
- **Issue:** When `APP_URL` is not set, the base URL for links embedded in
  verification and password-reset emails is `new URL(request.url).origin`, which on
  some hosting/proxy setups reflects a client-controlled `Host` / `X-Forwarded-Host`
  header.
- **Impact:** Low as shipped — `APP_URL` is preferred when present and is set in
  `.env.example` / documented. If it is ever forgotten in a deployment, an attacker
  could send `forgot-password` a request with a spoofed Host so the victim receives a
  real reset token pointing at an attacker domain (reset-link poisoning / token
  capture).
- **Fix:** Make `APP_URL` (or `AUTH_URL` / `NEXTAUTH_URL`) required in production and
  throw if it is missing, instead of silently falling back to the request origin for
  security-sensitive emails.

#### No maximum password length — bcrypt silently truncates at 72 bytes
- **File:** `src/app/api/auth/register/route.ts:54`,
  `src/app/api/auth/reset-password/route.ts:50`,
  `src/app/api/auth/change-password/route.ts:53`
- **Issue:** Only a minimum length (8) is enforced. `bcryptjs` ignores input past 72
  bytes, so for a very long passphrase only the first 72 bytes are actually protected,
  and the user gets no indication.
- **Impact:** Low. Mostly a correctness / user-expectation issue; it can also make two
  different long passwords collide.
- **Fix:** Reject passwords longer than 72 bytes (or pre-hash with SHA-256 and
  base64-encode before bcrypt, consistently across all three routes and the seed).

#### `register` allows email enumeration via a distinct 409
- **File:** `src/app/api/auth/register/route.ts:70-74`
- **Issue:** A duplicate email returns `409` with
  `"An account with this email already exists."`, so an attacker can probe which
  addresses are registered — in contrast to `forgot-password` / `resend-verification`,
  which are deliberately indistinguishable.
- **Impact:** Low. This is a common, widely-accepted trade-off (the alternative hurts
  UX), but combined with the missing rate limiting it lets an attacker enumerate the
  user base quickly.
- **Fix:** At minimum, gate it behind the rate limiter from the High finding. Optionally
  return a generic success and send a "you already have an account" email instead of a
  409.

#### Timing side-channel in `authorize` for accounts with no password hash
- **File:** `src/auth.ts:48-50`
- **Issue:** When the looked-up user is missing or has `password === null`
  (GitHub-only account), `authorize` returns `null` *before* doing any bcrypt work,
  whereas a real password account always pays for one `bcrypt.compare`. The response
  time difference distinguishes "email/password account exists" from
  "unknown or OAuth-only".
- **Impact:** Low. A measurable-but-noisy oracle; only useful at scale and only paired
  with the missing rate limiting.
- **Fix:** Do a dummy `bcrypt.compare` against a fixed hash on the no-password branch so
  every path spends comparable time.

## Passed Checks

- **Password hashing** uses `bcrypt.hash(password, 12)` consistently in
  `register/route.ts:81`, `reset-password/route.ts:85`, `change-password/route.ts:98`,
  and `prisma/seed.ts:324`. Cost 12 is appropriate. Verification uses the constant-time
  `bcrypt.compare` (`auth.ts:52`, `change-password/route.ts:87`), never `===` on hashes.
- **Password hash is never exposed to the client.** `getProfileUser`
  (`src/lib/db/user.ts:24-45`) selects `password` but returns only a `hasPassword`
  boolean; `register` returns `{ id, name, email }` only; `change-password` /
  `reset-password` / `delete-account` return `{ ok: true }`.
- **Server-side password validation** (min length 8, confirm-match) is enforced in
  `register`, `reset-password`, and `change-password` independently of the React forms
  (which use `noValidate`).
- **Token generation** uses `crypto.randomBytes(32).toString("hex")` — 256 bits of
  CSPRNG entropy — for both verification (`verification-token.ts:14`) and reset
  (`password-reset-token.ts:21`).
- **Token expiry is set at creation and enforced at consumption:** 24 h for
  verification, 1 h for reset; `consume*` checks `record.expires.getTime() < Date.now()`
  and returns `null` when expired (`verification-token.ts:40`,
  `password-reset-token.ts:49`).
- **Single-use:** both `consume*` helpers `delete` the token row before returning
  success, so replaying a used link fails.
- **Token rotation:** `create*` wraps `deleteMany({ where: { identifier } })` + `create`
  in a `$transaction`, so issuing a new link invalidates the previous one for that
  address (`verification-token.ts:17-20`, `password-reset-token.ts:25-28`).
- **Flow namespacing:** reset rows use the `password-reset:` identifier prefix and
  `consumePasswordResetToken` rejects any non-prefixed token, so a reset token cannot
  be spent on the verify-email route (the reverse direction is the Low finding above).
- **Reset flow does not trust client input for identity:** `reset-password/route.ts`
  derives the target email from the consumed token, never from the request body.
- **`forgot-password` and `resend-verification` are non-enumerable:** both always return
  `{ ok: true }` on a well-formed request and swallow Resend send failures with a
  server-side log, so a registered address is indistinguishable from an unknown one
  (`forgot-password/route.ts:37-46`, `resend-verification/route.ts:42-54`).
- **Session validation on custom mutations:** `change-password` and `delete-account`
  both call `auth()` and return 401 without a session, then act **only** on
  `session.user.id` (`change-password/route.ts:24-27,68-101`,
  `delete-account/route.ts:20-23,43`). No route accepts a client-supplied user id or
  email as the acted-on identity, so there is no IDOR.
- **`delete-account` double-guards** the destructive action: the `AlertDialog` disables
  the button until the typed value matches the email, and the route independently
  re-checks `confirmation` against `session.user.email` (case-insensitive) before
  `prisma.user.delete`.
- **Account deletion cascades correctly:** `schema.prisma` sets `onDelete: Cascade` on
  `Account`, `Session`, `Item`, `Collection`, `ItemType`, and `ItemCollection`, so
  deleting the user row removes all owned data and sign-in links.
- **`change-password` verifies the current password** with `bcrypt.compare` before
  writing the new hash, and returns a typed `code: "NoPassword"` for GitHub-only
  accounts rather than erroring opaquely.
- **`/profile` self-guards.** It is outside the `proxy.ts` matcher (`/dashboard/:path*`)
  and its page component calls `auth()` and redirects to `/sign-in?callbackUrl=/profile`
  when there is no session, with a second redirect if the row is gone
  (`src/app/profile/page.tsx:23-37`). It is `force-dynamic`, so the guard is not
  cached.
- **Sign-in UI does not leak which factor failed** — a bad email and a bad password
  both render "Invalid email or password." (`SignInForm.tsx:86`).
- **HTML email templates escape the user-controlled name** via `escapeHtml` before
  interpolation (`verification-email.ts:31`, `password-reset-email.ts:31`); the
  interpolated URLs are built server-side from `APP_URL` + an `encodeURIComponent`'d
  hex token, with no user input.
- **`proxy.ts` writes only an internal redirect target** (`pathname + search`) and runs
  the edge-safe, adapter-free `auth.config.ts`, keeping DB access out of the edge
  middleware.
- **`.env` is gitignored** (`.gitignore` lines 34-36: `.env`, `.env.*`,
  `!.env.example`); no secrets are committed.
- **GitHub OAuth-only accounts cannot be password-reset or password-changed into
  existence:** `forgot-password` only sends when `user.password` is set, and
  `authorize` returns `null` when `user.password` is null.

## Notes / Out of Scope

- **Handled by NextAuth v5 — not audited / not flagged:** CSRF protection on the
  `/api/auth/*` handler routes, session-cookie flags (`httpOnly` / `secure` /
  `sameSite`) and cookie-name prefixes, JWT signing/encryption and `AUTH_SECRET`
  handling, OAuth `state` + PKCE for the GitHub provider (the register-flow history
  confirms PKCE is present), and OAuth `redirect_uri` validation.
- The `jwt` session strategy is a deliberate choice for edge compatibility (so
  `proxy.ts` never hits the DB), not a defect. The `authorize: () => null` placeholder
  in `auth.config.ts` is the documented split-config pattern; the real implementation
  is in `auth.ts` (Node runtime).
- **Not in the project spec, so their absence is not a finding:** 2FA / MFA, a
  dedicated account-lockout table, an auth audit log, passwordless/magic-link sign-in.
  (Rate limiting *is* reported above because it protects flows that already ship.)
- The `EMAIL_VERIFICATION_ENABLED="false"` escape hatch (`verification.ts:18-20`) is
  intentional for the current Resend-sandbox situation and defaults to *on* for any
  value other than the literal `"false"`, including unset — so production stays safe if
  the var is forgotten. Not a defect.
- Open-redirect references for the Medium finding:
  <https://vibeappscanner.com/vulnerability-in/open-redirect-nextjs>,
  <https://www.overmcp.com/blog/fix-open-redirect-next-js>.

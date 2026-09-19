# Homepage

## Overview

Replace the current `/` route (currently the default Next.js starter or a placeholder) with a real marketing homepage, built from the static prototype in `prototypes/homepage/` (`index.html`, `styles.css`, `script.js`). This is a public, unauthenticated route — it is not part of the `(app)` shell (no TopBar/Sidebar) and is not behind `proxy.ts` or an `auth()` guard.

## Requirements

- Route: `src/app/page.tsx` (root `/`), outside the `(app)` and `(auth)` route groups.
- Port every section from the mockup: Navbar, Hero (chaos box / arrow / dashboard mock), Features grid, AI section, Pricing (with monthly/yearly toggle), CTA, Footer.
- Rebuild the markup with Tailwind CSS v4 utility classes and shadcn/ui primitives (`Button`, `Badge`, `Card` where they fit) instead of the prototype's custom `styles.css` — match this app's existing dark theme tokens rather than introducing new ones. Keep the item-type accent colors from the mockup (reuse `ITEM_TYPE_COLORS/getItemTypeColor` from `src/lib/constants/item-types.ts` for the 6 feature cards / dashboard mock swatches instead of hardcoding new hex values where the type maps 1:1; the mockup's `url` color can map to `link`).
- Split into server and client components:
  - The page itself (`src/app/page.tsx`) is a server component.
  - Anything interactive is its own small `"use client"` leaf under `src/components/homepage/`:
    - `ChaosAnimation` — the floating/bouncing/mouse-repel icon animation (`requestAnimationFrame` loop from `script.js`), scoped to its own container with cleanup on unmount.
    - `PricingToggle` — the monthly/yearly switch and derived price/period text.
    - `ScrollFadeIn` (or a shared `useInView` hook) — scroll-triggered fade-ins, reused across sections instead of duplicating `IntersectionObserver` setup.
    - `Navbar` — needs client-side scroll listener for the opacity change.
  - Static sections (Hero text, Features grid, AI section text/code mock, Pricing cards, CTA, Footer) stay server components and simply consume the client leaves above where needed.
- No new dependencies — inline SVGs for brand icons (GitHub, Slack, VS Code, Notion) and line icons, same as the prototype, or swap in equivalent `lucide-react` icons already used elsewhere in the app where a suitable one exists (e.g. terminal, file, bookmark, search); keep brand marks (GitHub/Slack/VS Code/Notion) as inline SVG since lucide has no brand icons (see `GitHubIcon.tsx` precedent).
- Footer year: compute `new Date().getFullYear()` directly in the server component — no client JS needed for this (the prototype used JS only because it's static HTML).

## Links & Routing

Wire every button/link in the mockup to a real destination instead of `#`:

- Navbar logo → `/`
- Navbar "Features" / "Pricing" → `#features` / `#pricing` (in-page anchors, unchanged)
- Navbar "Sign In" → `/sign-in`
- Navbar "Get Started" → `/register`
- Hero "Get Started Free" → `/register`
- Hero "See Features" → `#features` (unchanged)
- Pricing "Free" card "Get Started" → `/register`
- Pricing "Pro" card "Upgrade to Pro" → `/register` (no billing/checkout flow exists yet; Pro upgrade happens after sign-up, per the Monetization dev note in `context/project-overview.md`)
- Bottom CTA "Get Started Free" → `/register`
- Footer "Product" links (Features/Pricing) → same in-page anchors
- Footer "Company" (About/Blog) and "Legal" (Privacy/Terms) → leave as non-navigating placeholders (`#`) since those pages don't exist; do not invent new routes for them

If a user is already signed in, `/` should still render (no redirect) — keep this page dumb and public; authenticated users landing here can navigate in via Sign In/Get Started same as anyone else. (Do not add an `auth()` check to this page.)

## Out of Scope

- No real Stripe checkout wiring on the pricing buttons — they route to `/register` only.
- No CMS/dynamic content — copy is static, ported from the mockup.
- No changes to `(app)` or `(auth)` layouts, `proxy.ts`, or existing routes.

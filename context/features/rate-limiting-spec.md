# Rate Limiting for Auth

## Overview

Implement rate limiting on authentication endpoints to prevent brute force attacks, credential stuffing, and abuse of email-sending endpoints.

## Requirements

- Add rate limiting to auth-related API routes
- Use Upstash Redis with `@upstash/ratelimit` for serverless-compatible limiting
- Create reusable rate limiting utility
- Return appropriate error responses (429 Too Many Requests)
- Display user-friendly error messages on the frontend

## Endpoints to Protect

| Endpoint                                                                               | Limit       | Window | Key By                                                                             |
| -------------------------------------------------------------------------------------- | ----------- | ------ | ---------------------------------------------------------------------------------- |
| `POST /api/auth/callback/credentials` — sign-in (`src/auth.ts` → `authorize`)          | 5 attempts  | 15 min | `ip` + lowercased `email` (composite); plus a coarser `ip`-only cap of 30 / 15 min |
| `POST /api/auth/register` (`src/app/api/auth/register/route.ts`)                       | 5 requests  | 1 hour | `ip`                                                                               |
| `POST /api/auth/forgot-password` (`src/app/api/auth/forgot-password/route.ts`)         | 3 requests  | 1 hour | `ip` + lowercased `email` (composite)                                              |
| `POST /api/auth/resend-verification` (`src/app/api/auth/resend-verification/route.ts`) | 3 requests  | 1 hour | `ip` + lowercased `email` (composite)                                              |
| `POST /api/auth/reset-password` (`src/app/api/auth/reset-password/route.ts`)           | 10 attempts | 15 min | `ip`                                                                               |
| `GET /api/auth/verify-email` (`src/app/api/auth/verify-email/route.ts`)                | 10 requests | 15 min | `ip`                                                                               |
| `POST /api/auth/change-password` (`src/app/api/auth/change-password/route.ts`)         | 5 attempts  | 15 min | `session.user.id`                                                                  |

## Implementation

- Create `src/lib/rate-limit.ts` utility with Upstash client
- Use sliding window algorithm for smooth limiting
- Extract IP from `x-forwarded-for` header (Vercel) or request
- Combine IP + identifier (email) where applicable for tighter limits
- Return `{ success, remaining, reset }` from rate limit checks

## Environment Variables

```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Error Handling

- API returns 429 status with JSON: `{ error: "Too many attempts. Please try again in X minutes." }`
- Frontend displays error via toast notification
- Include `Retry-After` header in 429 responses

## Notes

- Upstash free tier allows 10k requests/day (sufficient for auth limiting)
- Rate limiting should fail open (allow request) if Upstash is unavailable
- Login limiting is tricky with NextAuth credentials - may need custom sign-in handler
- Consider adding rate limiting middleware for cleaner implementation later

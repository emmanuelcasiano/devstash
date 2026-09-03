import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

/**
 * Sliding-window rate limiting for the auth endpoints, backed by Upstash Redis.
 *
 * Every helper **fails open**: if `UPSTASH_REDIS_REST_URL` /
 * `UPSTASH_REDIS_REST_TOKEN` are unset, or a Redis call throws, the request is
 * allowed through and the problem is logged. Locking users out because the
 * limiter is down would be worse than the abuse it prevents.
 *
 * NextAuth's Credentials flow can't return an HTTP 429 from `authorize`, so the
 * sign-in path calls the peek / consume / reset helpers directly and throws a
 * `CredentialsSignin` subclass (see `src/auth.ts`). The plain API routes use
 * `enforceRateLimit`, which returns a ready-made 429 `NextResponse`.
 */

type Duration = `${number} ${"s" | "m" | "h" | "d"}`;

interface LimitConfig {
  limit: number;
  window: Duration;
  prefix: string;
}

export const RATE_LIMITS = {
  /** Credentials sign-in, keyed on `ip:email`. Only failed attempts count. */
  signIn: { limit: 5, window: "15 m", prefix: "rl:signin" },
  /** Coarser credentials sign-in cap, keyed on `ip` alone. */
  signInIp: { limit: 30, window: "15 m", prefix: "rl:signin-ip" },
  /** Account registration, keyed on `ip`. */
  register: { limit: 5, window: "1 h", prefix: "rl:register" },
  /** Password-reset email requests, keyed on `ip:email`. */
  forgotPassword: { limit: 3, window: "1 h", prefix: "rl:forgot-password" },
  /** Verification email resends, keyed on `ip:email`. */
  resendVerification: { limit: 3, window: "1 h", prefix: "rl:resend-verification" },
  /** Password-reset token submissions, keyed on `ip`. */
  resetPassword: { limit: 10, window: "15 m", prefix: "rl:reset-password" },
  /** Email verification link hits, keyed on `ip`. */
  verifyEmail: { limit: 10, window: "15 m", prefix: "rl:verify-email" },
  /** Change-password from the profile page, keyed on `session.user.id`. Only failed attempts count. */
  changePassword: { limit: 5, window: "15 m", prefix: "rl:change-password" },
} as const satisfies Record<string, LimitConfig>;

export type RateLimitName = keyof typeof RATE_LIMITS;

const globalForRateLimit = globalThis as unknown as {
  rateLimitRedis?: Redis | null;
  rateLimiters?: Map<RateLimitName, Ratelimit>;
};

function getRedis(): Redis | null {
  if (globalForRateLimit.rateLimitRedis !== undefined) {
    return globalForRateLimit.rateLimitRedis;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set — auth rate limiting is disabled (fail-open).",
    );
    globalForRateLimit.rateLimitRedis = null;
    return null;
  }

  globalForRateLimit.rateLimitRedis = new Redis({ url, token });
  return globalForRateLimit.rateLimitRedis;
}

function getLimiter(name: RateLimitName): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  const cache = (globalForRateLimit.rateLimiters ??= new Map());
  const existing = cache.get(name);
  if (existing) return existing;

  const config = RATE_LIMITS[name];
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.limit, config.window),
    prefix: config.prefix,
    analytics: false,
  });
  cache.set(name, limiter);
  return limiter;
}

/**
 * Best-effort client IP from the proxy headers Vercel / Neon set. Falls back to
 * a shared `"unknown"` bucket so a missing header can't bypass the limit
 * entirely.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  /** Unix ms timestamp when the window frees up. `0` when limiting is disabled. */
  reset: number;
}

const ALLOW: RateLimitResult = {
  success: true,
  remaining: Number.POSITIVE_INFINITY,
  reset: 0,
};

/**
 * Consume one token for `identifier`. Use for endpoints where every request
 * should count against the limit.
 */
export async function checkRateLimit(
  name: RateLimitName,
  identifier: string,
): Promise<RateLimitResult> {
  const limiter = getLimiter(name);
  if (!limiter) return ALLOW;

  try {
    const { success, remaining, reset } = await limiter.limit(identifier);
    return { success, remaining, reset };
  } catch (error) {
    console.error(`[rate-limit] "${name}" check failed — allowing request (fail-open):`, error);
    return ALLOW;
  }
}

/**
 * Read the remaining allowance for `identifier` **without** consuming a token.
 * Used by the sign-in / change-password paths so only failed attempts count.
 */
export async function peekRateLimit(
  name: RateLimitName,
  identifier: string,
): Promise<RateLimitResult> {
  const limiter = getLimiter(name);
  if (!limiter) return ALLOW;

  try {
    const { remaining, reset } = await limiter.getRemaining(identifier);
    return { success: remaining > 0, remaining, reset };
  } catch (error) {
    console.error(`[rate-limit] "${name}" peek failed — allowing request (fail-open):`, error);
    return ALLOW;
  }
}

/** Consume one token for `identifier`, ignoring the result. */
export async function consumeRateLimit(name: RateLimitName, identifier: string): Promise<void> {
  const limiter = getLimiter(name);
  if (!limiter) return;

  try {
    await limiter.limit(identifier);
  } catch (error) {
    console.error(`[rate-limit] "${name}" consume failed:`, error);
  }
}

/** Clear the used tokens for `identifier` (e.g. after a successful sign-in). */
export async function resetRateLimit(name: RateLimitName, identifier: string): Promise<void> {
  const limiter = getLimiter(name);
  if (!limiter) return;

  try {
    await limiter.resetUsedTokens(identifier);
  } catch (error) {
    console.error(`[rate-limit] "${name}" reset failed:`, error);
  }
}

/** Seconds until `reset`, floored at 1. Falls back to 60s when `reset` is 0. */
function retryAfterSeconds(reset: number): number {
  if (reset <= 0) return 60;
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}

/** JSON body + `Retry-After` header for a 429, with a human-readable wait time. */
export function rateLimitResponse(reset: number): NextResponse {
  const seconds = retryAfterSeconds(reset);
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return NextResponse.json(
    {
      error: `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    },
    { status: 429, headers: { "Retry-After": String(seconds) } },
  );
}

/**
 * Consume a token and, if the limit is exceeded, return a 429 `NextResponse`.
 * Returns `null` when the request is under the limit (or limiting is disabled).
 *
 * ```ts
 * const limited = await enforceRateLimit("register", getClientIp(request));
 * if (limited) return limited;
 * ```
 */
export async function enforceRateLimit(
  name: RateLimitName,
  identifier: string,
): Promise<NextResponse | null> {
  const { success, reset } = await checkRateLimit(name, identifier);
  return success ? null : rateLimitResponse(reset);
}

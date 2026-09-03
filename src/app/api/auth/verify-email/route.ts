import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { consumeEmailVerificationToken } from "@/lib/auth/verification-token";
import { getAppBaseUrl } from "@/lib/auth/verification";
import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * GET /api/auth/verify-email?token=...
 *
 * Consumes a verification token and marks the matching account verified, then
 * redirects to the sign-in page. Invalid, expired, or already-used tokens land
 * on sign-in with `?error=VerificationInvalid`.
 */
export async function GET(request: Request) {
  const limited = await enforceRateLimit("verifyEmail", getClientIp(request));
  if (limited) return limited;

  const base = getAppBaseUrl(request);
  const invalid = NextResponse.redirect(
    new URL("/sign-in?error=VerificationInvalid", base),
  );

  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return invalid;
  }

  const email = await consumeEmailVerificationToken(token);
  if (!email) {
    return invalid;
  }

  try {
    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });
  } catch (error) {
    // Most likely the account was deleted between issuing and clicking the link.
    console.error("Failed to mark email verified:", error);
    return invalid;
  }

  return NextResponse.redirect(new URL("/sign-in?verified=1", base));
}

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  isEmailVerificationEnabled,
  issueAndSendVerificationEmail,
} from "@/lib/auth/verification";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/resend-verification
 *
 * Body: `{ email }`. Sends a fresh verification link when the address belongs
 * to an unverified email/password account. Always responds `{ ok: true }` on a
 * well-formed request so the endpoint can't be used to probe which emails are
 * registered.
 */
export async function POST(request: Request) {
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  // Verification is switched off globally — nothing to resend.
  if (!isEmailVerificationEnabled()) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user?.password && !user.emailVerified) {
      await issueAndSendVerificationEmail({ email, name: user.name, request });
    }
  } catch (error) {
    console.error("Failed to resend verification email:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { issueAndSendPasswordResetEmail } from "@/lib/auth/password-reset";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/forgot-password
 *
 * Body: `{ email }`. Sends a password-reset link when the address belongs to an
 * email/password account. Always responds `{ ok: true }` on a well-formed
 * request so the endpoint can't be used to probe which emails are registered.
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

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    // Only accounts with a password have something to reset — GitHub-only
    // accounts sign in through OAuth.
    if (user?.password) {
      // A send failure must not change the response: surfacing it would let a
      // caller tell a registered address (send attempted, can fail) apart from
      // an unknown one (nothing sent). Log and carry on.
      try {
        await issueAndSendPasswordResetEmail({ email, name: user.name, request });
      } catch (error) {
        console.error("Failed to send password reset email:", error);
      }
    }
  } catch (error) {
    console.error("Password reset lookup failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

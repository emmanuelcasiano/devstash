import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { consumePasswordResetToken } from "@/lib/auth/password-reset-token";
import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";

interface ResetBody {
  token?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
}

const MIN_PASSWORD_LENGTH = 8;

/**
 * POST /api/auth/reset-password
 *
 * Body: `{ token, password, confirmPassword }`. Consumes a password-reset token
 * and sets the account's new password. Invalid/expired/used tokens return 400
 * with `code: "InvalidToken"` so the form can point the user back to
 * `/forgot-password`.
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit("resetPassword", getClientIp(request));
  if (limited) return limited;

  let body: ResetBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword =
    typeof body.confirmPassword === "string" ? body.confirmPassword : "";

  if (!token) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired.", code: "InvalidToken" },
      { status: 400 },
    );
  }

  if (!password || !confirmPassword) {
    return NextResponse.json(
      { error: "Password and confirmPassword are both required." },
      { status: 400 },
    );
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 },
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json(
      { error: "Passwords do not match." },
      { status: 400 },
    );
  }

  const email = await consumePasswordResetToken(token);
  if (!email) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired.", code: "InvalidToken" },
      { status: 400 },
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { emailVerified: true },
    });
    // The account was deleted between issuing and using the link.
    if (!user) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired.", code: "InvalidToken" },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    // Reaching a link from the account's own inbox proves ownership, so verify
    // the email at the same time if it wasn't already.
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        ...(user.emailVerified ? {} : { emailVerified: new Date() }),
      },
    });
  } catch (error) {
    console.error("Failed to reset password:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

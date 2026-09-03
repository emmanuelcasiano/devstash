import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import {
  isEmailVerificationEnabled,
  issueAndSendVerificationEmail,
} from "@/lib/auth/verification";
import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";

interface RegisterBody {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * POST /api/auth/register
 *
 * Registers a new email/password user. The created account can then sign in
 * through the Credentials provider configured in `auth.ts`.
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit("register", getClientIp(request));
  if (limited) return limited;

  let body: RegisterBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword =
    typeof body.confirmPassword === "string" ? body.confirmPassword : "";

  if (!name || !email || !password || !confirmPassword) {
    return NextResponse.json(
      { error: "Name, email, password, and confirmPassword are all required." },
      { status: 400 },
    );
  }

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
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

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    // When verification is disabled the account is usable immediately, so mark
    // it verified up front and send nothing.
    const verificationRequired = isEmailVerificationEnabled();

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerified: verificationRequired ? null : new Date(),
      },
    });

    // The account exists but stays unverified until the emailed link is clicked.
    // A send failure must not fail registration — the user can request a new
    // link from the sign-in page.
    let verificationEmailSent = false;
    if (verificationRequired) {
      verificationEmailSent = true;
      try {
        await issueAndSendVerificationEmail({ email, name, request });
      } catch (error) {
        verificationEmailSent = false;
        console.error("Failed to send verification email:", error);
      }
    }

    return NextResponse.json(
      {
        user: { id: user.id, name: user.name, email: user.email },
        verificationRequired,
        verificationEmailSent,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to register user:", error);
    return NextResponse.json(
      { error: "Something went wrong while creating the account." },
      { status: 500 },
    );
  }
}

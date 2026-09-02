import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface ChangePasswordBody {
  currentPassword?: unknown;
  newPassword?: unknown;
  confirmPassword?: unknown;
}

const MIN_PASSWORD_LENGTH = 8;

/**
 * POST /api/auth/change-password
 *
 * Body: `{ currentPassword, newPassword, confirmPassword }`. Lets a signed-in
 * email/password user rotate their password. GitHub-only accounts have no
 * password hash and get a 400 with `code: "NoPassword"` (the profile UI hides
 * the form for them anyway).
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: ChangePasswordBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : "";
  const confirmPassword =
    typeof body.confirmPassword === "string" ? body.confirmPassword : "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json(
      {
        error:
          "currentPassword, newPassword, and confirmPassword are all required.",
      },
      { status: 400 },
    );
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 },
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: "Passwords do not match." },
      { status: 400 },
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    if (!user.password) {
      return NextResponse.json(
        {
          error: "This account doesn't use a password.",
          code: "NoPassword",
        },
        { status: 400 },
      );
    }

    const currentMatches = await bcrypt.compare(currentPassword, user.password);
    if (!currentMatches) {
      return NextResponse.json(
        {
          error: "Current password is incorrect.",
          code: "InvalidPassword",
        },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    });
  } catch (error) {
    console.error("Failed to change password:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

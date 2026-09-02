import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface DeleteAccountBody {
  confirmation?: unknown;
}

/**
 * POST /api/auth/delete-account
 *
 * Body: `{ confirmation }` — must match the signed-in user's email
 * (case-insensitive) as a server-side guard against accidental deletion. On
 * success the user row is deleted; every owned item, collection, account, and
 * session cascades away via the schema's `onDelete: Cascade`. The client is
 * responsible for calling `signOut` afterwards to clear the JWT cookie.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: DeleteAccountBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const confirmation =
    typeof body.confirmation === "string" ? body.confirmation.trim() : "";

  if (confirmation.toLowerCase() !== session.user.email.toLowerCase()) {
    return NextResponse.json(
      { error: "Type your email address exactly to confirm." },
      { status: 400 },
    );
  }

  try {
    await prisma.user.delete({ where: { id: session.user.id } });
  } catch (error) {
    console.error("Failed to delete account:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

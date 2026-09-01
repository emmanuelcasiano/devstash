import { randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Issues a fresh email-verification token for an address, replacing any
 * outstanding token for that same address so only the latest link works.
 *
 * Reuses the NextAuth `verification_tokens` table (identifier = email).
 */
export async function createEmailVerificationToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier: email } }),
    prisma.verificationToken.create({ data: { identifier: email, token, expires } }),
  ]);

  return token;
}

/**
 * Looks up a verification token and consumes it (single-use: the row is deleted
 * whether or not it was still valid). Returns the associated email on success,
 * or `null` when the token is unknown or expired.
 */
export async function consumeEmailVerificationToken(
  token: string,
): Promise<string | null> {
  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record) {
    return null;
  }

  await prisma.verificationToken.delete({ where: { token } });

  if (record.expires.getTime() < Date.now()) {
    return null;
  }

  return record.identifier;
}

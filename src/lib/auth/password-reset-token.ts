import { randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Password-reset rows share the NextAuth `verification_tokens` table with
 * email-verification rows, so the identifier is namespaced to keep the two
 * apart. The email-verification helpers do
 * `deleteMany({ where: { identifier: email } })`, which would otherwise wipe a
 * pending reset token for the same address (and vice versa).
 */
const IDENTIFIER_PREFIX = "password-reset:";

/**
 * Issues a fresh password-reset token for an address, replacing any outstanding
 * reset token for that same address so only the latest link works.
 */
export async function createPasswordResetToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const identifier = `${IDENTIFIER_PREFIX}${email}`;
  const expires = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({ data: { identifier, token, expires } }),
  ]);

  return token;
}

/**
 * Looks up a password-reset token and consumes it (single-use: the row is
 * deleted whether or not it was still valid). Returns the associated email on
 * success, or `null` when the token is unknown, expired, or not a password-reset
 * token.
 */
export async function consumePasswordResetToken(
  token: string,
): Promise<string | null> {
  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || !record.identifier.startsWith(IDENTIFIER_PREFIX)) {
    return null;
  }

  await prisma.verificationToken.delete({ where: { token } });

  if (record.expires.getTime() < Date.now()) {
    return null;
  }

  return record.identifier.slice(IDENTIFIER_PREFIX.length);
}

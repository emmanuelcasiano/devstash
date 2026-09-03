import NextAuth, { CredentialsSignin } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";
import { isEmailVerificationEnabled } from "@/lib/auth/verification";
import {
  consumeRateLimit,
  getClientIp,
  peekRateLimit,
  resetRateLimit,
} from "@/lib/rate-limit";

/**
 * Full auth configuration. Import `auth` from here everywhere except the proxy,
 * which must stay edge-safe and uses `auth.config.ts` directly.
 *
 * The Prisma adapter forces a `jwt` session strategy so that session lookups in
 * the proxy/edge never hit the database.
 *
 * The Credentials provider from `auth.config.ts` is a `() => null` placeholder;
 * here it is replaced with the real bcrypt-backed lookup, which needs the Node
 * runtime for Prisma and `bcryptjs`.
 */

/**
 * Thrown when the password is correct but the account's email has not been
 * verified yet. Auth.js forwards the `code` to the client, so `SignInForm` can
 * tell this apart from a bad password and offer to resend the link.
 */
class EmailNotVerifiedError extends CredentialsSignin {
  code = "EmailNotVerified";
}

/**
 * Thrown when the caller has failed too many sign-in attempts recently. Auth.js
 * forwards the `code` to the client so `SignInForm` can show a "too many
 * attempts" message instead of "invalid email or password".
 */
class RateLimitError extends CredentialsSignin {
  code = "RateLimited";
}

const credentialsProvider = Credentials({
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials, request) {
    const email = credentials?.email;
    const password = credentials?.password;

    if (typeof email !== "string" || typeof password !== "string") {
      return null;
    }

    // Rate limiting: only *failed* attempts are counted, so a legitimate user
    // who eventually types the right password is never locked out. The peek
    // reads the current allowance without consuming a token; a token is spent
    // below only when the credentials don't check out, and the per-account
    // counter is cleared on success.
    const ip = getClientIp(request);
    const emailKey = email.toLowerCase();
    const accountKey = `${ip}:${emailKey}`;

    const [byAccount, byIp] = await Promise.all([
      peekRateLimit("signIn", accountKey),
      peekRateLimit("signInIp", ip),
    ]);
    if (!byAccount.success || !byIp.success) {
      throw new RateLimitError();
    }

    const registerFailure = () =>
      Promise.all([
        consumeRateLimit("signIn", accountKey),
        consumeRateLimit("signInIp", ip),
      ]);

    const user = await prisma.user.findUnique({
      where: { email: emailKey },
    });

    if (!user?.password) {
      await registerFailure();
      return null;
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      await registerFailure();
      return null;
    }

    if (isEmailVerificationEnabled() && !user.emailVerified) {
      throw new EmailNotVerifiedError();
    }

    // Clear the per-account counter so earlier typos don't accumulate against a
    // user who has now signed in. The IP counter is left to decay on its own so
    // a single valid account can't reset the shared-IP allowance.
    await resetRateLimit("signIn", accountKey);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
  providers: authConfig.providers.map((provider) =>
    typeof provider !== "function" && provider.id === "credentials"
      ? credentialsProvider
      : provider,
  ),
});

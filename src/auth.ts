import NextAuth, { CredentialsSignin } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";
import { isEmailVerificationEnabled } from "@/lib/auth/verification";

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

const credentialsProvider = Credentials({
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    const email = credentials?.email;
    const password = credentials?.password;

    if (typeof email !== "string" || typeof password !== "string") {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user?.password) {
      return null;
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return null;
    }

    if (isEmailVerificationEnabled() && !user.emailVerified) {
      throw new EmailNotVerifiedError();
    }

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

import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";

/**
 * Edge-compatible auth configuration.
 *
 * Contains only options that are safe to run in the Edge runtime (no adapter,
 * no database access). This object is spread into the full config in `auth.ts`
 * and used on its own by the proxy in `proxy.ts`.
 *
 * `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` are picked up automatically by Auth.js.
 *
 * The Credentials provider here is an edge-safe placeholder: `authorize` always
 * returns `null` because bcrypt and Prisma cannot run in the Edge runtime. The
 * real implementation is swapped in by `auth.ts` (Node runtime).
 */
export default {
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    GitHub,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: () => null,
    }),
  ],
  callbacks: {
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

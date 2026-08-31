import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

/**
 * Edge-compatible auth configuration.
 *
 * Contains only options that are safe to run in the Edge runtime (no adapter,
 * no database access). This object is spread into the full config in `auth.ts`
 * and used on its own by the proxy in `proxy.ts`.
 *
 * `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` are picked up automatically by Auth.js.
 */
export default {
  providers: [GitHub],
  callbacks: {
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

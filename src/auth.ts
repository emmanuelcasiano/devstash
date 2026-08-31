import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";

/**
 * Full auth configuration. Import `auth` from here everywhere except the proxy,
 * which must stay edge-safe and uses `auth.config.ts` directly.
 *
 * The Prisma adapter forces a `jwt` session strategy so that session lookups in
 * the proxy/edge never hit the database.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
});

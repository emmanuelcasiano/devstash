import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `auth()`, `useSession`, `getSession` and received as a prop on
   * the session provider. Adds the user id (populated from the JWT `sub` claim
   * in the `session` callback) and the Pro flag (kept fresh from the database by
   * the `jwt` callback in `auth.ts`).
   */
  interface Session {
    user: {
      id: string;
      isPro: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isPro?: boolean;
  }
}

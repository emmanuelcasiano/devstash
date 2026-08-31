import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `auth()`, `useSession`, `getSession` and received as a prop on
   * the session provider. Adds the user id (populated from the JWT `sub` claim
   * in the `session` callback).
   */
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

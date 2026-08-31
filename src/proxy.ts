import NextAuth from "next-auth";

import authConfig from "@/auth.config";

/**
 * Route protection. Runs on the Edge, so it uses the adapter-free
 * `auth.config.ts` rather than the full `auth.ts`.
 *
 * Unauthenticated requests to protected routes are redirected to the custom
 * sign-in page, preserving the original path as `callbackUrl` so the user lands
 * back where they started after signing in.
 */
const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  if (!req.auth) {
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set(
      "callbackUrl",
      req.nextUrl.pathname + req.nextUrl.search,
    );
    return Response.redirect(signInUrl);
  }
});

export const config = {
  matcher: ["/dashboard/:path*"],
};

import NextAuth from "next-auth";

import authConfig from "@/auth.config";

/**
 * Route protection. Runs on the Edge, so it uses the adapter-free
 * `auth.config.ts` rather than the full `auth.ts`.
 *
 * Unauthenticated requests to protected routes are redirected to NextAuth's
 * default sign-in page, preserving the original URL as `callbackUrl` so the
 * user lands back where they started after signing in.
 */
const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  if (!req.auth) {
    const signInUrl = new URL("/api/auth/signin", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
    return Response.redirect(signInUrl);
  }
});

export const config = {
  matcher: ["/dashboard/:path*"],
};

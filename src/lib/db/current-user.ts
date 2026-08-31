import { cache } from "react";

import { auth } from "@/auth";

/**
 * Resolves the id of the currently authenticated user from the NextAuth
 * session. Returns `null` when there is no session.
 *
 * Wrapped in `React.cache` so a single request that runs several dashboard
 * queries only resolves the session once instead of once per query.
 */
export const getCurrentUserId = cache(async (): Promise<string | null> => {
    const session = await auth();
    return session?.user?.id ?? null;
});

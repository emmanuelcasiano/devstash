import { cache } from "react";

import { prisma } from "@/lib/prisma";

const DEMO_USER_EMAIL = "demo@devstash.io";

/**
 * Resolves the id of the current user.
 *
 * Auth isn't wired up yet, so this is scoped to the seeded demo user (same
 * pattern as `prisma/seed.ts`). Wrapped in `React.cache` so a single request
 * that runs several dashboard queries only hits the users table once instead
 * of once per query.
 */
export const getCurrentUserId = cache(async (): Promise<string | null> => {
    const user = await prisma.user.findUnique({
        where: { email: DEMO_USER_EMAIL },
        select: { id: true },
    });
    return user?.id ?? null;
});

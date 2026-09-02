import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/db/current-user";

export interface ProfileUser {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    createdAt: Date;
    /** True when the account has a password hash (email/password sign-up). */
    hasPassword: boolean;
}

/**
 * Fetches the signed-in user's profile fields. Returns `null` when there is no
 * session or the row no longer exists. `password` is never returned — only the
 * boolean `hasPassword`, which the profile UI uses to decide whether to show the
 * change-password action.
 */
export async function getProfileUser(): Promise<ProfileUser | null> {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
            password: true,
        },
    });

    if (!user) return null;

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: user.createdAt,
        hasPassword: user.password !== null,
    };
}

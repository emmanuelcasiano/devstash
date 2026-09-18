import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/db/current-user";
import {
    DEFAULT_EDITOR_PREFERENCES,
    parseEditorPreferences,
    type EditorPreferences,
} from "@/lib/validation/editor-preferences";

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

/**
 * Fetches the signed-in user's Monaco editor preferences, falling back to
 * {@link DEFAULT_EDITOR_PREFERENCES} when there's no session, no row, or the
 * column has never been written.
 */
export async function getEditorPreferences(): Promise<EditorPreferences> {
    const userId = await getCurrentUserId();
    if (!userId) return DEFAULT_EDITOR_PREFERENCES;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { editorPreferences: true },
    });
    if (!user) return DEFAULT_EDITOR_PREFERENCES;

    return parseEditorPreferences(user.editorPreferences);
}

/**
 * Overwrites the signed-in user's Monaco editor preferences. Returns `null`
 * when there's no session, so callers can distinguish "not signed in" from a
 * write that succeeded.
 */
export async function updateEditorPreferences(
    data: EditorPreferences,
): Promise<EditorPreferences | null> {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const updated = await prisma.user.update({
        where: { id: userId },
        data: { editorPreferences: data as unknown as Prisma.InputJsonObject },
        select: { editorPreferences: true },
    });

    return parseEditorPreferences(updated.editorPreferences);
}

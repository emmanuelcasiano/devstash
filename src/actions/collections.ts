"use server";

import {
    GENERIC_ERROR,
    requireUserId,
    zodMessage,
    type ActionResult,
} from "@/actions/shared";
import {
    createCollection as createCollectionQuery,
    type CollectionWithStats,
} from "@/lib/db/collections";
import { createCollectionSchema } from "@/lib/validation/collection";

export type { ActionResult } from "@/actions/shared";

/**
 * Creates a new collection from the top-bar "New Collection" dialog.
 *
 * Follows the project's `{ success, data, error }` contract: the session is
 * checked with `auth()`, the payload is validated with Zod (the source of
 * truth — the client only does a light "name required" guard), and the new
 * {@link CollectionWithStats} is returned so the caller can use it without a
 * re-fetch.
 */
export async function createCollection(
    input: unknown,
): Promise<ActionResult<CollectionWithStats>> {
    const user = await requireUserId("create collections");
    if ("error" in user) return { success: false, error: user.error };

    const parsed = createCollectionSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: zodMessage(parsed.error) };
    }

    try {
        const created = await createCollectionQuery(parsed.data);
        if (!created) {
            return { success: false, error: "Could not create the collection." };
        }
        return { success: true, data: created };
    } catch (error) {
        console.error("Failed to create collection:", error);
        return { success: false, error: GENERIC_ERROR };
    }
}

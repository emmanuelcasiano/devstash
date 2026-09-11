"use server";

import {
    GENERIC_ERROR,
    requireUserId,
    zodMessage,
    type ActionResult,
} from "@/actions/shared";
import {
    createCollection as createCollectionQuery,
    deleteCollection as deleteCollectionQuery,
    updateCollection as updateCollectionQuery,
    type CollectionWithStats,
} from "@/lib/db/collections";
import {
    createCollectionSchema,
    updateCollectionSchema,
} from "@/lib/validation/collection";

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

/**
 * Updates one collection's name/description from an edit dialog.
 *
 * Follows the project's `{ success, data, error }` contract: the session is
 * checked with `auth()`, the payload is validated with Zod, and ownership is
 * enforced by the scoped query. On success the refreshed
 * {@link CollectionWithStats} is returned so the caller can use it without a
 * re-fetch.
 */
export async function updateCollection(
    collectionId: string,
    input: unknown,
): Promise<ActionResult<CollectionWithStats>> {
    const user = await requireUserId("edit collections");
    if ("error" in user) return { success: false, error: user.error };

    const parsed = updateCollectionSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: zodMessage(parsed.error) };
    }

    try {
        const updated = await updateCollectionQuery(collectionId, parsed.data);
        if (!updated) {
            return { success: false, error: "Collection not found." };
        }
        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to update collection:", error);
        return { success: false, error: GENERIC_ERROR };
    }
}

/**
 * Permanently deletes one collection from a delete confirmation dialog.
 *
 * Follows the project's `{ success, data, error }` contract: the session is
 * checked with `auth()` and ownership is enforced by the scoped query, so a
 * collection id the signed-in user does not own resolves to "not found"
 * rather than deleting anything. The collection's items are never deleted —
 * they only lose their membership in this collection (see
 * {@link deleteCollectionQuery}).
 */
export async function deleteCollection(
    collectionId: string,
): Promise<ActionResult<{ id: string }>> {
    const user = await requireUserId("delete collections");
    if ("error" in user) return { success: false, error: user.error };

    try {
        const deleted = await deleteCollectionQuery(collectionId);
        if (!deleted) {
            return { success: false, error: "Collection not found." };
        }
        return { success: true, data: { id: collectionId } };
    } catch (error) {
        console.error("Failed to delete collection:", error);
        return { success: false, error: GENERIC_ERROR };
    }
}

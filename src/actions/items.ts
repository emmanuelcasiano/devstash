"use server";

import {
    GENERIC_ERROR,
    requireUserId,
    zodMessage,
    type ActionResult,
} from "@/actions/shared";
import { getItemCreationBlock } from "@/lib/billing/limits";
import {
    createItem as createItemQuery,
    deleteItem as deleteItemQuery,
    toggleItemFavorite as toggleItemFavoriteQuery,
    toggleItemPin as toggleItemPinQuery,
    updateItem as updateItemQuery,
    type ItemDetail,
} from "@/lib/db/items";
import { createItemSchema, updateItemSchema } from "@/lib/validation/item";

export type { ActionResult } from "@/actions/shared";

/**
 * Creates a new item from the top-bar "New Item" dialog.
 *
 * Follows the project's `{ success, data, error }` contract: the session is
 * checked with `auth()`, the payload is validated with Zod (the source of
 * truth — the client only does light "required field" guards), and the new
 * {@link ItemDetail} is returned so the caller can use it without a re-fetch.
 */
export async function createItem(
    input: unknown,
): Promise<ActionResult<ItemDetail>> {
    const user = await requireUserId("create items");
    if ("error" in user) return { success: false, error: user.error };

    const parsed = createItemSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: zodMessage(parsed.error) };
    }

    try {
        const blocked = await getItemCreationBlock(parsed.data.type);
        if (blocked) return { success: false, error: blocked };

        const created = await createItemQuery(parsed.data);
        if (!created) {
            return { success: false, error: "Could not create the item." };
        }
        return { success: true, data: created };
    } catch (error) {
        console.error("Failed to create item:", error);
        return { success: false, error: GENERIC_ERROR };
    }
}

/**
 * Updates one item's editable fields from the item drawer's edit mode.
 *
 * Follows the project's `{ success, data, error }` contract: the session is
 * checked with `auth()`, the payload is validated with Zod (the source of
 * truth — the client only does a light "title required" guard), and ownership
 * is enforced by the scoped query. On success the refreshed `ItemDetail` is
 * returned so the drawer can re-render without a second fetch.
 */
export async function updateItem(
    itemId: string,
    input: unknown,
): Promise<ActionResult<ItemDetail>> {
    const user = await requireUserId("edit items");
    if ("error" in user) return { success: false, error: user.error };

    const parsed = updateItemSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: zodMessage(parsed.error) };
    }

    try {
        const updated = await updateItemQuery(itemId, parsed.data);
        if (!updated) {
            return { success: false, error: "Item not found." };
        }
        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to update item:", error);
        return { success: false, error: GENERIC_ERROR };
    }
}

/**
 * Permanently deletes one item from the item drawer's delete confirmation.
 *
 * Follows the project's `{ success, data, error }` contract: the session is
 * checked with `auth()` and ownership is enforced by the scoped query, so an
 * item id the signed-in user does not own resolves to "not found" rather than
 * deleting anything.
 */
export async function deleteItem(
    itemId: string,
): Promise<ActionResult<{ id: string }>> {
    const user = await requireUserId("delete items");
    if ("error" in user) return { success: false, error: user.error };

    try {
        const deleted = await deleteItemQuery(itemId);
        if (!deleted) {
            return { success: false, error: "Item not found." };
        }
        return { success: true, data: { id: itemId } };
    } catch (error) {
        console.error("Failed to delete item:", error);
        return { success: false, error: GENERIC_ERROR };
    }
}

/**
 * Flips one item's favorite status from the drawer's action bar or a card's
 * favorite toggle.
 *
 * Follows the project's `{ success, data, error }` contract: the session is
 * checked with `auth()` and ownership is enforced by the scoped query, so an
 * item id the signed-in user does not own resolves to "not found". On success
 * the refreshed `ItemDetail` is returned so the caller can update its view
 * without a re-fetch.
 */
export async function toggleItemFavorite(
    itemId: string,
): Promise<ActionResult<ItemDetail>> {
    const user = await requireUserId("favorite items");
    if ("error" in user) return { success: false, error: user.error };

    try {
        const updated = await toggleItemFavoriteQuery(itemId);
        if (!updated) {
            return { success: false, error: "Item not found." };
        }
        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to toggle item favorite:", error);
        return { success: false, error: GENERIC_ERROR };
    }
}

/**
 * Flips one item's pinned status from the drawer's action bar.
 *
 * Follows the project's `{ success, data, error }` contract: the session is
 * checked with `auth()` and ownership is enforced by the scoped query, so an
 * item id the signed-in user does not own resolves to "not found". On success
 * the refreshed `ItemDetail` is returned so the caller can update its view
 * without a re-fetch.
 */
export async function toggleItemPin(
    itemId: string,
): Promise<ActionResult<ItemDetail>> {
    const user = await requireUserId("pin items");
    if ("error" in user) return { success: false, error: user.error };

    try {
        const updated = await toggleItemPinQuery(itemId);
        if (!updated) {
            return { success: false, error: "Item not found." };
        }
        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to toggle item pin:", error);
        return { success: false, error: GENERIC_ERROR };
    }
}

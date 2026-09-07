"use server";

import { auth } from "@/auth";
import {
    createItem as createItemQuery,
    deleteItem as deleteItemQuery,
    updateItem as updateItemQuery,
    type ItemDetail,
} from "@/lib/db/items";
import { createItemSchema, updateItemSchema } from "@/lib/validation/item";

export type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

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
    const session = await auth();
    if (!session?.user?.id) {
        return {
            success: false,
            error: "You must be signed in to create items.",
        };
    }

    const parsed = createItemSchema.safeParse(input);
    if (!parsed.success) {
        const message = parsed.error.issues
            .map((issue) => issue.message)
            .join(" ");
        return { success: false, error: message || "Invalid input." };
    }

    try {
        const created = await createItemQuery(parsed.data);
        if (!created) {
            return { success: false, error: "Could not create the item." };
        }
        return { success: true, data: created };
    } catch (error) {
        console.error("Failed to create item:", error);
        return {
            success: false,
            error: "Something went wrong. Please try again.",
        };
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
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "You must be signed in to edit items." };
    }

    const parsed = updateItemSchema.safeParse(input);
    if (!parsed.success) {
        const message = parsed.error.issues
            .map((issue) => issue.message)
            .join(" ");
        return { success: false, error: message || "Invalid input." };
    }

    try {
        const updated = await updateItemQuery(itemId, parsed.data);
        if (!updated) {
            return { success: false, error: "Item not found." };
        }
        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to update item:", error);
        return {
            success: false,
            error: "Something went wrong. Please try again.",
        };
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
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "You must be signed in to delete items." };
    }

    try {
        const deleted = await deleteItemQuery(itemId);
        if (!deleted) {
            return { success: false, error: "Item not found." };
        }
        return { success: true, data: { id: itemId } };
    } catch (error) {
        console.error("Failed to delete item:", error);
        return {
            success: false,
            error: "Something went wrong. Please try again.",
        };
    }
}

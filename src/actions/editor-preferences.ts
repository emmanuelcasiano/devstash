"use server";

import {
    GENERIC_ERROR,
    requireUserId,
    zodMessage,
    type ActionResult,
} from "@/actions/shared";
import { updateEditorPreferences as updateEditorPreferencesQuery } from "@/lib/db/user";
import {
    editorPreferencesSchema,
    type EditorPreferences,
} from "@/lib/validation/editor-preferences";

export type { ActionResult } from "@/actions/shared";

/**
 * Overwrites the signed-in user's Monaco editor preferences from the
 * Settings page's editor section. The section auto-saves on every change —
 * there is no separate submit — so this is called directly from the
 * `EditorPreferencesProvider` each time a field changes.
 */
export async function updateEditorPreferences(
    input: unknown,
): Promise<ActionResult<EditorPreferences>> {
    const user = await requireUserId("update editor preferences");
    if ("error" in user) return { success: false, error: user.error };

    const parsed = editorPreferencesSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: zodMessage(parsed.error) };
    }

    try {
        const updated = await updateEditorPreferencesQuery(parsed.data);
        if (!updated) {
            return { success: false, error: "Could not save editor preferences." };
        }
        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to update editor preferences:", error);
        return { success: false, error: GENERIC_ERROR };
    }
}

"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { toast } from "sonner";

import { updateEditorPreferences } from "@/actions/editor-preferences";
import type { EditorPreferences } from "@/lib/validation/editor-preferences";

interface EditorPreferencesContextValue {
    preferences: EditorPreferences;
    /** Applies a full preferences object, optimistically, then auto-saves it. */
    setPreferences: (next: EditorPreferences) => void;
    /** True while the auto-save request to the server is in flight. */
    saving: boolean;
}

const EditorPreferencesContext =
    createContext<EditorPreferencesContextValue | null>(null);

/**
 * Holds the signed-in user's Monaco editor preferences (font size, tab size,
 * word wrap, minimap, theme) so both the Settings page's editor section and
 * every `CodeEditor` instance read from one source of truth. Wrap the `(app)`
 * layout in this, seeded from `getEditorPreferences()`, so the preferences
 * are available wherever a snippet/command is viewed or edited.
 *
 * Every `setPreferences` call updates state immediately (so the editor and
 * the Settings controls respond instantly) and auto-saves via the
 * `updateEditorPreferences` server action in the background — there is no
 * explicit save button. A failed save shows a toast and leaves the local
 * state as-is; the next successful change will still save correctly.
 */
export function EditorPreferencesProvider({
    initialPreferences,
    children,
}: {
    initialPreferences: EditorPreferences;
    children: React.ReactNode;
}) {
    const [preferences, setPreferencesState] = useState(initialPreferences);
    const [isPending, startTransition] = useTransition();

    function setPreferences(next: EditorPreferences) {
        setPreferencesState(next);
        startTransition(async () => {
            const result = await updateEditorPreferences(next);
            if (!result.success) {
                toast.error(result.error);
                return;
            }
            toast.success("Editor preferences saved.");
        });
    }

    return (
        <EditorPreferencesContext.Provider
            value={{ preferences, setPreferences, saving: isPending }}
        >
            {children}
        </EditorPreferencesContext.Provider>
    );
}

export function useEditorPreferences() {
    const ctx = useContext(EditorPreferencesContext);
    if (!ctx) {
        throw new Error(
            "useEditorPreferences must be used within an EditorPreferencesProvider",
        );
    }
    return ctx;
}

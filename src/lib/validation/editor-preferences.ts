import { z } from "zod";

/**
 * Pure, Prisma-free validation and defaults for the Monaco editor preferences
 * stored on `User.editorPreferences` (a JSON column). No Prisma/auth imports
 * here so this module can be unit tested directly.
 */

export const EDITOR_FONT_SIZES = [12, 13, 14, 16, 18, 20] as const;
export const EDITOR_TAB_SIZES = [2, 4, 8] as const;
export const EDITOR_THEMES = ["vs-dark", "monokai", "github-dark"] as const;

export type EditorFontSize = (typeof EDITOR_FONT_SIZES)[number];
export type EditorTabSize = (typeof EDITOR_TAB_SIZES)[number];
export type EditorTheme = (typeof EDITOR_THEMES)[number];

export interface EditorPreferences {
    fontSize: EditorFontSize;
    tabSize: EditorTabSize;
    wordWrap: boolean;
    minimap: boolean;
    theme: EditorTheme;
}

export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    minimap: false,
    theme: "vs-dark",
};

function isEditorFontSize(value: number): value is EditorFontSize {
    return (EDITOR_FONT_SIZES as readonly number[]).includes(value);
}

function isEditorTabSize(value: number): value is EditorTabSize {
    return (EDITOR_TAB_SIZES as readonly number[]).includes(value);
}

export const editorPreferencesSchema = z.object({
    fontSize: z
        .number()
        .refine(isEditorFontSize, { message: "Invalid font size." }),
    tabSize: z
        .number()
        .refine(isEditorTabSize, { message: "Invalid tab size." }),
    wordWrap: z.boolean(),
    minimap: z.boolean(),
    theme: z.enum(EDITOR_THEMES),
});

export type EditorPreferencesInput = z.infer<typeof editorPreferencesSchema>;

/**
 * Reads editor preferences back out of the `User.editorPreferences` JSON
 * column. The value may be `null` (never saved), or — if the shape of this
 * schema changes in the future — missing/invalid fields; either way this
 * falls back to {@link DEFAULT_EDITOR_PREFERENCES} rather than throwing, so a
 * stored value never breaks the editor.
 */
export function parseEditorPreferences(raw: unknown): EditorPreferences {
    if (raw === null || typeof raw !== "object") {
        return DEFAULT_EDITOR_PREFERENCES;
    }
    const parsed = editorPreferencesSchema.safeParse(raw);
    return parsed.success ? parsed.data : DEFAULT_EDITOR_PREFERENCES;
}

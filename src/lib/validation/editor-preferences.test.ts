import { describe, expect, it } from "vitest";

import {
    DEFAULT_EDITOR_PREFERENCES,
    editorPreferencesSchema,
    parseEditorPreferences,
} from "@/lib/validation/editor-preferences";

describe("editorPreferencesSchema", () => {
    it("accepts a full valid payload", () => {
        const result = editorPreferencesSchema.safeParse({
            fontSize: 16,
            tabSize: 4,
            wordWrap: false,
            minimap: true,
            theme: "monokai",
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toEqual({
                fontSize: 16,
                tabSize: 4,
                wordWrap: false,
                minimap: true,
                theme: "monokai",
            });
        }
    });

    it("rejects a font size outside the allowed set", () => {
        const result = editorPreferencesSchema.safeParse({
            ...DEFAULT_EDITOR_PREFERENCES,
            fontSize: 15,
        });
        expect(result.success).toBe(false);
    });

    it("rejects a tab size outside the allowed set", () => {
        const result = editorPreferencesSchema.safeParse({
            ...DEFAULT_EDITOR_PREFERENCES,
            tabSize: 3,
        });
        expect(result.success).toBe(false);
    });

    it("rejects an unknown theme", () => {
        const result = editorPreferencesSchema.safeParse({
            ...DEFAULT_EDITOR_PREFERENCES,
            theme: "solarized",
        });
        expect(result.success).toBe(false);
    });

    it("rejects a missing field", () => {
        const incomplete: Record<string, unknown> = {
            ...DEFAULT_EDITOR_PREFERENCES,
        };
        delete incomplete.wordWrap;
        expect(editorPreferencesSchema.safeParse(incomplete).success).toBe(
            false,
        );
    });
});

describe("parseEditorPreferences", () => {
    it("falls back to defaults for null", () => {
        expect(parseEditorPreferences(null)).toEqual(DEFAULT_EDITOR_PREFERENCES);
    });

    it("falls back to defaults for a non-object value", () => {
        expect(parseEditorPreferences("nonsense")).toEqual(
            DEFAULT_EDITOR_PREFERENCES,
        );
        expect(parseEditorPreferences(42)).toEqual(DEFAULT_EDITOR_PREFERENCES);
    });

    it("falls back to defaults for an object missing required fields", () => {
        expect(parseEditorPreferences({ fontSize: 16 })).toEqual(
            DEFAULT_EDITOR_PREFERENCES,
        );
    });

    it("falls back to defaults for an invalid enum value", () => {
        expect(
            parseEditorPreferences({
                ...DEFAULT_EDITOR_PREFERENCES,
                theme: "nope",
            }),
        ).toEqual(DEFAULT_EDITOR_PREFERENCES);
    });

    it("returns a valid stored value unchanged", () => {
        const stored = {
            fontSize: 18,
            tabSize: 8,
            wordWrap: false,
            minimap: true,
            theme: "github-dark",
        };
        expect(parseEditorPreferences(stored)).toEqual(stored);
    });
});

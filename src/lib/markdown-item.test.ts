import { describe, expect, it } from "vitest";

import { isMarkdownItemType, MARKDOWN_ITEM_TYPES } from "@/lib/markdown-item";

describe("isMarkdownItemType", () => {
    it("is true for note and prompt", () => {
        expect(isMarkdownItemType("note")).toBe(true);
        expect(isMarkdownItemType("prompt")).toBe(true);
    });

    it("is false for code and other types", () => {
        expect(isMarkdownItemType("snippet")).toBe(false);
        expect(isMarkdownItemType("command")).toBe(false);
        expect(isMarkdownItemType("link")).toBe(false);
        expect(isMarkdownItemType("file")).toBe(false);
    });

    it("is case-insensitive", () => {
        expect(isMarkdownItemType("Note")).toBe(true);
        expect(isMarkdownItemType("PROMPT")).toBe(true);
    });

    it("is false for null or undefined", () => {
        expect(isMarkdownItemType(null)).toBe(false);
        expect(isMarkdownItemType(undefined)).toBe(false);
    });

    it("exposes exactly the two prose types", () => {
        expect([...MARKDOWN_ITEM_TYPES].sort()).toEqual(["note", "prompt"]);
    });
});

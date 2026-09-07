import { describe, expect, it } from "vitest";

import { parseTagsInput, updateItemSchema } from "@/lib/validation/item";

describe("updateItemSchema", () => {
    it("accepts a minimal valid payload and trims the title", () => {
        const result = updateItemSchema.safeParse({
            title: "  My Snippet  ",
            tags: [],
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.title).toBe("My Snippet");
            expect(result.data.description).toBeNull();
            expect(result.data.content).toBeNull();
            expect(result.data.url).toBeNull();
            expect(result.data.language).toBeNull();
            expect(result.data.tags).toEqual([]);
        }
    });

    it("rejects an empty or whitespace-only title", () => {
        expect(updateItemSchema.safeParse({ title: "", tags: [] }).success).toBe(
            false,
        );
        expect(
            updateItemSchema.safeParse({ title: "   ", tags: [] }).success,
        ).toBe(false);
    });

    it("normalizes blank optional text fields to null", () => {
        const result = updateItemSchema.safeParse({
            title: "Item",
            description: "   ",
            content: "",
            language: "  ts  ",
            tags: [],
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.description).toBeNull();
            expect(result.data.content).toBeNull();
            expect(result.data.language).toBe("ts");
        }
    });

    it("accepts a valid URL and treats a blank URL as null", () => {
        const valid = updateItemSchema.safeParse({
            title: "Link",
            url: "https://example.com/docs",
            tags: [],
        });
        expect(valid.success).toBe(true);
        if (valid.success) {
            expect(valid.data.url).toBe("https://example.com/docs");
        }

        const blank = updateItemSchema.safeParse({
            title: "Link",
            url: "   ",
            tags: [],
        });
        expect(blank.success).toBe(true);
        if (blank.success) expect(blank.data.url).toBeNull();
    });

    it("rejects a malformed URL", () => {
        const result = updateItemSchema.safeParse({
            title: "Link",
            url: "not a url",
            tags: [],
        });
        expect(result.success).toBe(false);
    });

    it("trims, drops empty, and de-duplicates tags", () => {
        const result = updateItemSchema.safeParse({
            title: "Item",
            tags: [" react ", "react", "", "  ", "hooks"],
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.tags).toEqual(["react", "hooks"]);
        }
    });
});

describe("parseTagsInput", () => {
    it("splits on commas, trims, and removes empty entries", () => {
        expect(parseTagsInput("react, hooks ,  , patterns")).toEqual([
            "react",
            "hooks",
            "patterns",
        ]);
    });

    it("de-duplicates while preserving first-seen order", () => {
        expect(parseTagsInput("a, b, a, c, b")).toEqual(["a", "b", "c"]);
    });

    it("returns an empty array for a blank string", () => {
        expect(parseTagsInput("   ")).toEqual([]);
        expect(parseTagsInput("")).toEqual([]);
    });
});

import { describe, expect, it } from "vitest";

import {
    AUTO_TAG_CONTENT_LIMIT,
    buildAutoTagPrompt,
    generateAutoTagsInputSchema,
    parseTagSuggestions,
    truncateAutoTagContent,
} from "@/lib/ai/auto-tags";

describe("generateAutoTagsInputSchema", () => {
    it("accepts a title with content and trims the title", () => {
        const result = generateAutoTagsInputSchema.safeParse({
            title: "  useAuth hook  ",
            content: "export function useAuth() { ... }",
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.title).toBe("useAuth hook");
            expect(result.data.content).toBe(
                "export function useAuth() { ... }",
            );
        }
    });

    it("normalizes a missing/null content to an empty string", () => {
        const result = generateAutoTagsInputSchema.safeParse({
            title: "Docker cleanup",
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.content).toBe("");
        }
    });

    it("rejects an empty or whitespace-only title", () => {
        expect(
            generateAutoTagsInputSchema.safeParse({ title: "", content: "" })
                .success,
        ).toBe(false);
        expect(
            generateAutoTagsInputSchema.safeParse({ title: "   ", content: "" })
                .success,
        ).toBe(false);
    });
});

describe("truncateAutoTagContent", () => {
    it("leaves short content untouched", () => {
        expect(truncateAutoTagContent("short content")).toBe("short content");
    });

    it("truncates content past the character limit", () => {
        const long = "a".repeat(AUTO_TAG_CONTENT_LIMIT + 500);
        const truncated = truncateAutoTagContent(long);
        expect(truncated).toHaveLength(AUTO_TAG_CONTENT_LIMIT);
    });
});

describe("buildAutoTagPrompt", () => {
    it("includes both title and content", () => {
        expect(buildAutoTagPrompt("useAuth hook", "export function useAuth() {}"))
            .toBe("Title: useAuth hook\n\nexport function useAuth() {}");
    });

    it("omits the blank line when content is empty", () => {
        expect(buildAutoTagPrompt("useAuth hook", "")).toBe(
            "Title: useAuth hook",
        );
    });
});

describe("parseTagSuggestions", () => {
    it("parses the object form and lowercases/de-duplicates tags", () => {
        expect(
            parseTagSuggestions(
                JSON.stringify({ tags: ["React", "hooks", "react", " auth "] }),
            ),
        ).toEqual(["react", "hooks", "auth"]);
    });

    it("normalizes a bare array response into the same result", () => {
        expect(parseTagSuggestions(JSON.stringify(["Docker", "cli"]))).toEqual([
            "docker",
            "cli",
        ]);
    });

    it("returns null for malformed JSON", () => {
        expect(parseTagSuggestions("not json")).toBeNull();
    });

    it("returns null for an empty tags array", () => {
        expect(parseTagSuggestions(JSON.stringify({ tags: [] }))).toBeNull();
    });

    it("returns null when the shape doesn't match the schema", () => {
        expect(parseTagSuggestions(JSON.stringify({ tags: "not-an-array" }))).toBeNull();
        expect(parseTagSuggestions(JSON.stringify({ other: [] }))).toBeNull();
    });
});

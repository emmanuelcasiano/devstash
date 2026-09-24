import { describe, expect, it } from "vitest";

import {
    DESCRIBE_CONTENT_LIMIT,
    buildDescribePrompt,
    generateDescriptionInputSchema,
    parseDescriptionSuggestion,
    truncateDescribeContent,
} from "@/lib/ai/describe";

describe("generateDescriptionInputSchema", () => {
    it("accepts a title with content and trims/normalizes fields", () => {
        const result = generateDescriptionInputSchema.safeParse({
            title: "  useAuth hook  ",
            content: "export function useAuth() { ... }",
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.title).toBe("useAuth hook");
            expect(result.data.content).toBe(
                "export function useAuth() { ... }",
            );
            expect(result.data.url).toBe("");
            expect(result.data.fileName).toBe("");
            expect(result.data.language).toBe("");
        }
    });

    it("accepts a file/image payload with only a title and file name", () => {
        const result = generateDescriptionInputSchema.safeParse({
            title: "Architecture diagram",
            fileName: "diagram.png",
        });

        expect(result.success).toBe(true);
    });

    it("accepts a link payload with only a URL", () => {
        const result = generateDescriptionInputSchema.safeParse({
            url: "https://example.com",
        });

        expect(result.success).toBe(true);
    });

    it("rejects a payload with no usable signal", () => {
        expect(generateDescriptionInputSchema.safeParse({}).success).toBe(false);
        expect(
            generateDescriptionInputSchema.safeParse({
                title: "   ",
                content: "",
                url: "",
                fileName: "",
            }).success,
        ).toBe(false);
    });
});

describe("truncateDescribeContent", () => {
    it("leaves short content untouched", () => {
        expect(truncateDescribeContent("short content")).toBe("short content");
    });

    it("truncates content past the character limit", () => {
        const long = "a".repeat(DESCRIBE_CONTENT_LIMIT + 500);
        const truncated = truncateDescribeContent(long);
        expect(truncated).toHaveLength(DESCRIBE_CONTENT_LIMIT);
    });
});

describe("buildDescribePrompt", () => {
    it("includes every populated field", () => {
        expect(
            buildDescribePrompt({
                title: "useAuth hook",
                content: "export function useAuth() {}",
                url: "",
                fileName: "",
                language: "typescript",
            }),
        ).toBe(
            "Title: useAuth hook\n\nLanguage: typescript\n\nContent:\nexport function useAuth() {}",
        );
    });

    it("omits blank fields", () => {
        expect(
            buildDescribePrompt({
                title: "Architecture diagram",
                content: "",
                url: "",
                fileName: "diagram.png",
                language: "",
            }),
        ).toBe("Title: Architecture diagram\n\nFile name: diagram.png");
    });

    it("supports a URL-only link payload", () => {
        expect(
            buildDescribePrompt({
                title: "",
                content: "",
                url: "https://example.com",
                fileName: "",
                language: "",
            }),
        ).toBe("URL: https://example.com");
    });
});

describe("parseDescriptionSuggestion", () => {
    it("parses and trims a valid response", () => {
        expect(
            parseDescriptionSuggestion(
                JSON.stringify({ description: "  A short hook for auth state.  " }),
            ),
        ).toBe("A short hook for auth state.");
    });

    it("returns null for malformed JSON", () => {
        expect(parseDescriptionSuggestion("not json")).toBeNull();
    });

    it("returns null for a blank description", () => {
        expect(
            parseDescriptionSuggestion(JSON.stringify({ description: "   " })),
        ).toBeNull();
    });

    it("returns null when the shape doesn't match the schema", () => {
        expect(parseDescriptionSuggestion(JSON.stringify({ other: "x" }))).toBeNull();
        expect(
            parseDescriptionSuggestion(JSON.stringify({ description: 5 })),
        ).toBeNull();
    });
});

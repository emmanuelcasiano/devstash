import { describe, expect, it } from "vitest";

import {
    OPTIMIZE_PROMPT_CONTENT_LIMIT,
    buildOptimizePromptPrompt,
    optimizePromptInputSchema,
    parseOptimizedPrompt,
    truncateOptimizePromptContent,
} from "@/lib/ai/optimize-prompt";

describe("optimizePromptInputSchema", () => {
    it("accepts a payload and trims/normalizes fields", () => {
        const result = optimizePromptInputSchema.safeParse({
            title: "  Code review prompt  ",
            content: "  Review this code for bugs.  ",
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.title).toBe("Code review prompt");
            expect(result.data.content).toBe("Review this code for bugs.");
        }
    });

    it("accepts a payload with no title", () => {
        const result = optimizePromptInputSchema.safeParse({
            content: "Summarize this text.",
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.title).toBe("");
        }
    });

    it("rejects blank content", () => {
        expect(
            optimizePromptInputSchema.safeParse({ content: "   " }).success,
        ).toBe(false);
        expect(optimizePromptInputSchema.safeParse({}).success).toBe(false);
    });
});

describe("truncateOptimizePromptContent", () => {
    it("leaves short content untouched", () => {
        expect(truncateOptimizePromptContent("short prompt")).toBe(
            "short prompt",
        );
    });

    it("truncates content past the character limit", () => {
        const long = "a".repeat(OPTIMIZE_PROMPT_CONTENT_LIMIT + 500);
        const truncated = truncateOptimizePromptContent(long);
        expect(truncated).toHaveLength(OPTIMIZE_PROMPT_CONTENT_LIMIT);
    });
});

describe("buildOptimizePromptPrompt", () => {
    it("includes the title when populated", () => {
        expect(
            buildOptimizePromptPrompt({
                title: "Code review prompt",
                content: "Review this code for bugs.",
            }),
        ).toBe(
            "Title: Code review prompt\n\nPrompt:\nReview this code for bugs.",
        );
    });

    it("omits a blank title", () => {
        expect(
            buildOptimizePromptPrompt({
                title: "",
                content: "Summarize this text.",
            }),
        ).toBe("Prompt:\nSummarize this text.");
    });
});

describe("parseOptimizedPrompt", () => {
    it("parses and trims a valid response", () => {
        expect(
            parseOptimizedPrompt(
                JSON.stringify({ prompt: "  Review this code for bugs.  " }),
            ),
        ).toBe("Review this code for bugs.");
    });

    it("returns null for malformed JSON", () => {
        expect(parseOptimizedPrompt("not json")).toBeNull();
    });

    it("returns null for a blank prompt", () => {
        expect(parseOptimizedPrompt(JSON.stringify({ prompt: "   " }))).toBeNull();
    });

    it("returns null when the shape doesn't match the schema", () => {
        expect(parseOptimizedPrompt(JSON.stringify({ other: "x" }))).toBeNull();
        expect(parseOptimizedPrompt(JSON.stringify({ prompt: 5 }))).toBeNull();
    });
});

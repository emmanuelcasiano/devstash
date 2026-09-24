import { describe, expect, it } from "vitest";

import {
    EXPLAIN_CONTENT_LIMIT,
    buildExplainPrompt,
    explainCodeInputSchema,
    parseExplanation,
    truncateExplainContent,
} from "@/lib/ai/explain";

describe("explainCodeInputSchema", () => {
    it("accepts a snippet payload and trims/normalizes fields", () => {
        const result = explainCodeInputSchema.safeParse({
            title: "  useDebounce hook  ",
            content: "export function useDebounce() { ... }",
            language: "  typescript  ",
            typeName: "snippet",
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.title).toBe("useDebounce hook");
            expect(result.data.content).toBe(
                "export function useDebounce() { ... }",
            );
            expect(result.data.language).toBe("typescript");
            expect(result.data.typeName).toBe("snippet");
        }
    });

    it("accepts a command payload with no title or language", () => {
        const result = explainCodeInputSchema.safeParse({
            content: "docker compose up -d",
            typeName: "command",
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.title).toBe("");
            expect(result.data.language).toBe("");
        }
    });

    it("rejects blank content", () => {
        expect(
            explainCodeInputSchema.safeParse({
                content: "   ",
                typeName: "snippet",
            }).success,
        ).toBe(false);
        expect(
            explainCodeInputSchema.safeParse({ typeName: "snippet" }).success,
        ).toBe(false);
    });

    it("rejects a type other than snippet or command", () => {
        expect(
            explainCodeInputSchema.safeParse({
                content: "some text",
                typeName: "note",
            }).success,
        ).toBe(false);
    });
});

describe("truncateExplainContent", () => {
    it("leaves short content untouched", () => {
        expect(truncateExplainContent("short content")).toBe("short content");
    });

    it("truncates content past the character limit", () => {
        const long = "a".repeat(EXPLAIN_CONTENT_LIMIT + 500);
        const truncated = truncateExplainContent(long);
        expect(truncated).toHaveLength(EXPLAIN_CONTENT_LIMIT);
    });
});

describe("buildExplainPrompt", () => {
    it("includes every populated field for a snippet", () => {
        expect(
            buildExplainPrompt({
                title: "useDebounce hook",
                content: "export function useDebounce() {}",
                language: "typescript",
                typeName: "snippet",
            }),
        ).toBe(
            "Title: useDebounce hook\n\nType: Code snippet\n\nLanguage: typescript\n\nContent:\nexport function useDebounce() {}",
        );
    });

    it("labels a command differently and omits blank fields", () => {
        expect(
            buildExplainPrompt({
                title: "",
                content: "docker compose up -d",
                language: "",
                typeName: "command",
            }),
        ).toBe("Type: Terminal command\n\nContent:\ndocker compose up -d");
    });
});

describe("parseExplanation", () => {
    it("parses and trims a valid response", () => {
        expect(
            parseExplanation(
                JSON.stringify({ explanation: "  This hook debounces a value.  " }),
            ),
        ).toBe("This hook debounces a value.");
    });

    it("returns null for malformed JSON", () => {
        expect(parseExplanation("not json")).toBeNull();
    });

    it("returns null for a blank explanation", () => {
        expect(parseExplanation(JSON.stringify({ explanation: "   " }))).toBeNull();
    });

    it("returns null when the shape doesn't match the schema", () => {
        expect(parseExplanation(JSON.stringify({ other: "x" }))).toBeNull();
        expect(parseExplanation(JSON.stringify({ explanation: 5 }))).toBeNull();
    });
});

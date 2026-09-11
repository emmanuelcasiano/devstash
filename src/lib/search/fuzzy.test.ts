import { describe, expect, it } from "vitest";

import { commandFilter, fuzzyScore } from "@/lib/search/fuzzy";

describe("fuzzyScore", () => {
    it("returns 1 for an empty query", () => {
        expect(fuzzyScore("anything", "")).toBe(1);
        expect(fuzzyScore("anything", "   ")).toBe(1);
    });

    it("scores a contiguous substring match above zero", () => {
        expect(fuzzyScore("Docker Documentation", "docker")).toBeGreaterThan(0);
    });

    it("scores a word-start match higher than a mid-word match", () => {
        const wordStart = fuzzyScore("Docker Documentation", "doc");
        const midWord = fuzzyScore("Undocking Bay", "doc");
        expect(wordStart).toBeGreaterThan(midWord);
    });

    it("scores an earlier match higher than a later one", () => {
        const early = fuzzyScore("snippet manager", "snippet");
        const late = fuzzyScore("my personal snippet", "snippet");
        expect(early).toBeGreaterThan(late);
    });

    it("accepts a tight, order-preserving loose match (typo/partial word)", () => {
        expect(fuzzyScore("snippet", "snipet")).toBeGreaterThan(0);
        expect(fuzzyScore("snippet", "snip")).toBeGreaterThan(0);
    });

    it("rejects a query whose letters only appear scattered across unrelated text", () => {
        // A cuid-like random id happens to contain every letter of "snippet"
        // somewhere, but not packed tightly enough to be a real match.
        expect(fuzzyScore("cmt3dm77s000ee4vpmck8373j", "snippet")).toBe(0);
    });

    it("rejects text that does not contain the query letters in order at all", () => {
        expect(fuzzyScore("Terminal Commands", "snippet")).toBe(0);
    });

    it("is case-insensitive", () => {
        expect(fuzzyScore("SNIPPET", "snippet")).toBeGreaterThan(0);
        expect(fuzzyScore("snippet", "SNIPPET")).toBeGreaterThan(0);
    });
});

describe("commandFilter", () => {
    it("matches on the primary value", () => {
        expect(commandFilter("Docker Documentation", "docker")).toBeGreaterThan(0);
    });

    it("matches on a keyword when the value does not match", () => {
        expect(commandFilter("Plan Production Apps", "snippet", ["snippet"])).toBeGreaterThan(0);
    });

    it("returns 0 when neither the value nor any keyword match", () => {
        expect(commandFilter("Terminal Commands", "snippet", ["command"])).toBe(0);
    });

    it("weights a keyword match below an equivalent value match", () => {
        const valueMatch = commandFilter("snippet", "snippet");
        const keywordMatch = commandFilter("unrelated", "snippet", ["snippet"]);
        expect(keywordMatch).toBeLessThan(valueMatch);
    });
});

import { describe, expect, it } from "vitest";
import { isCodeItemType, toMonacoLanguage } from "@/lib/code-language";

describe("isCodeItemType", () => {
    it("flags snippet and command, case-insensitively", () => {
        expect(isCodeItemType("snippet")).toBe(true);
        expect(isCodeItemType("Command")).toBe(true);
    });

    it("does not flag the non-code types", () => {
        expect(isCodeItemType("prompt")).toBe(false);
        expect(isCodeItemType("note")).toBe(false);
        expect(isCodeItemType("link")).toBe(false);
    });

    it("handles null / undefined", () => {
        expect(isCodeItemType(null)).toBe(false);
        expect(isCodeItemType(undefined)).toBe(false);
    });
});

describe("toMonacoLanguage", () => {
    it("maps common aliases to Monaco language ids", () => {
        expect(toMonacoLanguage("TS")).toBe("typescript");
        expect(toMonacoLanguage("bash")).toBe("shell");
        expect(toMonacoLanguage("c++")).toBe("cpp");
        expect(toMonacoLanguage("  Python  ")).toBe("python");
    });

    it("passes an unknown language through lowercased and trimmed", () => {
        expect(toMonacoLanguage("Kotlin")).toBe("kotlin");
        expect(toMonacoLanguage(" GraphQL ")).toBe("graphql");
    });

    it("defaults an empty language to shell for commands", () => {
        expect(toMonacoLanguage("", "command")).toBe("shell");
        expect(toMonacoLanguage(null, "Command")).toBe("shell");
    });

    it("defaults an empty language to plaintext for everything else", () => {
        expect(toMonacoLanguage("", "snippet")).toBe("plaintext");
        expect(toMonacoLanguage(undefined)).toBe("plaintext");
    });
});

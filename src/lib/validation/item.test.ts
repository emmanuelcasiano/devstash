import { describe, expect, it } from "vitest";

import {
    createItemSchema,
    parseTagsInput,
    updateItemSchema,
} from "@/lib/validation/item";

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

describe("createItemSchema", () => {
    it("accepts a minimal snippet payload", () => {
        const result = createItemSchema.safeParse({
            type: "snippet",
            title: "  useAuth hook  ",
            tags: [],
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.type).toBe("snippet");
            expect(result.data.title).toBe("useAuth hook");
            expect(result.data.content).toBeNull();
            expect(result.data.url).toBeNull();
            expect(result.data.language).toBeNull();
        }
    });

    it("rejects an unknown type", () => {
        expect(
            createItemSchema.safeParse({
                type: "video",
                title: "Report",
                tags: [],
            }).success,
        ).toBe(false);
    });

    it("requires upload metadata when the type is file or image", () => {
        const missing = createItemSchema.safeParse({
            type: "file",
            title: "Report",
            tags: [],
        });
        expect(missing.success).toBe(false);
        if (!missing.success) {
            expect(
                missing.error.issues.some((issue) =>
                    issue.message.includes("Upload a file first"),
                ),
            ).toBe(true);
        }

        const present = createItemSchema.safeParse({
            type: "image",
            title: "Screenshot",
            fileUrl: "https://cdn.example.com/uploads/u/abc/shot.png",
            fileName: "shot.png",
            fileSize: 2048,
            tags: [],
        });
        expect(present.success).toBe(true);
        if (present.success) {
            expect(present.data.fileUrl).toBe(
                "https://cdn.example.com/uploads/u/abc/shot.png",
            );
            expect(present.data.fileName).toBe("shot.png");
            expect(present.data.fileSize).toBe(2048);
        }
    });

    it("rejects a non-positive or non-integer fileSize", () => {
        const base = {
            type: "file" as const,
            title: "Report",
            fileUrl: "https://cdn.example.com/uploads/u/abc/report.pdf",
            fileName: "report.pdf",
            tags: [],
        };
        expect(
            createItemSchema.safeParse({ ...base, fileSize: 0 }).success,
        ).toBe(false);
        expect(
            createItemSchema.safeParse({ ...base, fileSize: 12.5 }).success,
        ).toBe(false);
    });

    it("rejects an empty title", () => {
        expect(
            createItemSchema.safeParse({
                type: "note",
                title: "   ",
                tags: [],
            }).success,
        ).toBe(false);
    });

    it("requires a URL when the type is link", () => {
        const missing = createItemSchema.safeParse({
            type: "link",
            title: "Docs",
            tags: [],
        });
        expect(missing.success).toBe(false);
        if (!missing.success) {
            expect(
                missing.error.issues.some((issue) =>
                    issue.message.includes("URL is required"),
                ),
            ).toBe(true);
        }

        const present = createItemSchema.safeParse({
            type: "link",
            title: "Docs",
            url: "https://example.com/docs",
            tags: [],
        });
        expect(present.success).toBe(true);
        if (present.success) {
            expect(present.data.url).toBe("https://example.com/docs");
        }
    });

    it("does not require a URL for non-link types", () => {
        const result = createItemSchema.safeParse({
            type: "command",
            title: "git reset",
            tags: [],
        });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.url).toBeNull();
    });

    it("trims, drops empty, and de-duplicates tags", () => {
        const result = createItemSchema.safeParse({
            type: "prompt",
            title: "Review prompt",
            tags: [" ai ", "ai", "", "review"],
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.tags).toEqual(["ai", "review"]);
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

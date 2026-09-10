import { describe, expect, it } from "vitest";

import { createCollectionSchema } from "@/lib/validation/collection";

describe("createCollectionSchema", () => {
    it("accepts a minimal valid payload and trims the name", () => {
        const result = createCollectionSchema.safeParse({
            name: "  React Patterns  ",
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.name).toBe("React Patterns");
            expect(result.data.description).toBeNull();
        }
    });

    it("rejects an empty or whitespace-only name", () => {
        expect(createCollectionSchema.safeParse({ name: "" }).success).toBe(
            false,
        );
        expect(createCollectionSchema.safeParse({ name: "   " }).success).toBe(
            false,
        );
    });

    it("rejects a missing name", () => {
        expect(createCollectionSchema.safeParse({}).success).toBe(false);
    });

    it("normalizes a blank description to null", () => {
        const result = createCollectionSchema.safeParse({
            name: "DevOps",
            description: "   ",
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.description).toBeNull();
        }
    });

    it("trims a provided description", () => {
        const result = createCollectionSchema.safeParse({
            name: "DevOps",
            description: "  Kubernetes and Docker notes  ",
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.description).toBe("Kubernetes and Docker notes");
        }
    });
});

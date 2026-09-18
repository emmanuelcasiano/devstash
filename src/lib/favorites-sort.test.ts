import { describe, expect, it } from "vitest";

import { sortFavoriteCollections, sortFavoriteItems } from "@/lib/favorites-sort";

describe("sortFavoriteItems", () => {
    const items = [
        { title: "Banana", updatedAt: new Date("2026-01-01"), itemType: { name: "note" } },
        { title: "apple", updatedAt: new Date("2026-03-01"), itemType: { name: "snippet" } },
        { title: "Cherry", updatedAt: new Date("2026-02-01"), itemType: { name: "note" } },
    ];

    it("sorts by date descending by default", () => {
        const sorted = sortFavoriteItems(items, "date");
        expect(sorted.map((i) => i.title)).toEqual(["apple", "Cherry", "Banana"]);
    });

    it("sorts by name case-insensitively", () => {
        const sorted = sortFavoriteItems(items, "name");
        expect(sorted.map((i) => i.title)).toEqual(["apple", "Banana", "Cherry"]);
    });

    it("sorts by type, then by name within a type", () => {
        const sorted = sortFavoriteItems(items, "type");
        expect(sorted.map((i) => i.title)).toEqual(["Banana", "Cherry", "apple"]);
    });

    it("does not mutate the input array", () => {
        const original = [...items];
        sortFavoriteItems(items, "name");
        expect(items).toEqual(original);
    });
});

describe("sortFavoriteCollections", () => {
    const collections = [
        { name: "Zebra", updatedAt: new Date("2026-01-01") },
        { name: "apple", updatedAt: new Date("2026-03-01") },
        { name: "Mango", updatedAt: new Date("2026-02-01") },
    ];

    it("sorts by date descending by default", () => {
        const sorted = sortFavoriteCollections(collections, "date");
        expect(sorted.map((c) => c.name)).toEqual(["apple", "Mango", "Zebra"]);
    });

    it("sorts by name case-insensitively", () => {
        const sorted = sortFavoriteCollections(collections, "name");
        expect(sorted.map((c) => c.name)).toEqual(["apple", "Mango", "Zebra"]);
    });

    it("does not mutate the input array", () => {
        const original = [...collections];
        sortFavoriteCollections(collections, "name");
        expect(collections).toEqual(original);
    });
});

import { describe, expect, it } from "vitest";

import {
    buildPageTokens,
    clampPage,
    getPageRange,
    getTotalPages,
    parsePageParam,
} from "@/lib/pagination";

describe("parsePageParam", () => {
    it("defaults to 1 when undefined", () => {
        expect(parsePageParam(undefined)).toBe(1);
    });

    it("parses a valid numeric string", () => {
        expect(parsePageParam("3")).toBe(3);
    });

    it("takes the first value when given an array", () => {
        expect(parsePageParam(["2", "5"])).toBe(2);
    });

    it("falls back to 1 for a non-numeric value", () => {
        expect(parsePageParam("abc")).toBe(1);
    });

    it("falls back to 1 for zero or negative values", () => {
        expect(parsePageParam("0")).toBe(1);
        expect(parsePageParam("-4")).toBe(1);
    });

    it("falls back to 1 for a non-integer value", () => {
        expect(parsePageParam("1.5")).toBe(1);
    });
});

describe("getPageRange", () => {
    it("computes skip/take for the first page", () => {
        expect(getPageRange(1, 21)).toEqual({ skip: 0, take: 21 });
    });

    it("computes skip/take for a later page", () => {
        expect(getPageRange(3, 21)).toEqual({ skip: 42, take: 21 });
    });
});

describe("getTotalPages", () => {
    it("rounds up to cover the remainder", () => {
        expect(getTotalPages(22, 21)).toBe(2);
    });

    it("returns 1 for an empty result set", () => {
        expect(getTotalPages(0, 21)).toBe(1);
    });

    it("returns exactly 1 page when the count fits evenly", () => {
        expect(getTotalPages(21, 21)).toBe(1);
    });
});

describe("clampPage", () => {
    it("clamps below the range up to 1", () => {
        expect(clampPage(0, 5)).toBe(1);
    });

    it("clamps above the range down to the max", () => {
        expect(clampPage(9, 5)).toBe(5);
    });

    it("leaves an in-range page untouched", () => {
        expect(clampPage(3, 5)).toBe(3);
    });
});

describe("buildPageTokens", () => {
    it("returns a single page for a one-page result", () => {
        expect(buildPageTokens(1, 1)).toEqual([1]);
    });

    it("returns every page when the total is small", () => {
        expect(buildPageTokens(3, 5)).toEqual([1, 2, 3, 4, 5]);
    });

    it("collapses the right side when near the start", () => {
        expect(buildPageTokens(1, 10)).toEqual([1, 2, "ellipsis", 10]);
    });

    it("collapses the left side when near the end", () => {
        expect(buildPageTokens(10, 10)).toEqual([1, "ellipsis", 9, 10]);
    });

    it("collapses both sides when in the middle", () => {
        expect(buildPageTokens(5, 10)).toEqual([
            1,
            "ellipsis",
            4,
            5,
            6,
            "ellipsis",
            10,
        ]);
    });
});

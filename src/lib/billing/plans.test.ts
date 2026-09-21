import { afterEach, describe, expect, it, vi } from "vitest";

import {
    COLLECTION_LIMIT_ERROR,
    FREE_COLLECTION_LIMIT,
    FREE_ITEM_LIMIT,
    ITEM_LIMIT_ERROR,
    PRO_TYPE_ERROR,
    canCreateCollection,
    canCreateItem,
    hasProAccess,
    isBillingPlan,
    isProSubscriptionStatus,
    isTerminalSubscriptionStatus,
    priceIdForPlan,
} from "@/lib/billing/plans";

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("canCreateItem", () => {
    it("always allows a Pro user, for any count and type", () => {
        for (const itemType of ["snippet", "file", "image"]) {
            for (const itemCount of [0, FREE_ITEM_LIMIT, 10_000]) {
                const result = canCreateItem({ hasPro: true, itemCount, itemType });
                expect(result.allowed).toBe(true);
                expect("error" in result).toBe(false);
            }
        }
    });

    it("blocks file and image types for a free user with PRO_TYPE_ERROR", () => {
        for (const itemType of ["file", "image"]) {
            expect(canCreateItem({ hasPro: false, itemCount: 0, itemType })).toEqual({
                allowed: false,
                error: PRO_TYPE_ERROR,
            });
        }
    });

    it("allows a free snippet below the item limit", () => {
        const result = canCreateItem({
            hasPro: false,
            itemCount: FREE_ITEM_LIMIT - 1,
            itemType: "snippet",
        });
        expect(result).toEqual({ allowed: true });
    });

    it("blocks a free snippet at and above the item limit with ITEM_LIMIT_ERROR", () => {
        for (const itemCount of [FREE_ITEM_LIMIT, FREE_ITEM_LIMIT + 1, 500]) {
            expect(
                canCreateItem({ hasPro: false, itemCount, itemType: "snippet" }),
            ).toEqual({ allowed: false, error: ITEM_LIMIT_ERROR });
        }
    });

    it("reports the Pro-type error before the limit error for a free file at the limit", () => {
        expect(
            canCreateItem({
                hasPro: false,
                itemCount: FREE_ITEM_LIMIT,
                itemType: "file",
            }),
        ).toEqual({ allowed: false, error: PRO_TYPE_ERROR });
    });

    it("gives every blocked result a non-empty error", () => {
        const blocked = [
            canCreateItem({ hasPro: false, itemCount: 0, itemType: "image" }),
            canCreateItem({ hasPro: false, itemCount: 50, itemType: "note" }),
        ];
        for (const result of blocked) {
            expect(result.allowed).toBe(false);
            if (!result.allowed) expect(result.error.length).toBeGreaterThan(0);
        }
    });
});

describe("canCreateCollection", () => {
    it("allows a free user below the collection limit", () => {
        for (const collectionCount of [0, FREE_COLLECTION_LIMIT - 1]) {
            expect(canCreateCollection({ hasPro: false, collectionCount })).toEqual({
                allowed: true,
            });
        }
    });

    it("blocks a free user at and above the limit with COLLECTION_LIMIT_ERROR", () => {
        for (const collectionCount of [FREE_COLLECTION_LIMIT, FREE_COLLECTION_LIMIT + 1]) {
            expect(canCreateCollection({ hasPro: false, collectionCount })).toEqual({
                allowed: false,
                error: COLLECTION_LIMIT_ERROR,
            });
        }
    });

    it("allows a Pro user at any count", () => {
        expect(canCreateCollection({ hasPro: true, collectionCount: 1_000 })).toEqual({
            allowed: true,
        });
    });
});

describe("isProSubscriptionStatus", () => {
    it.each(["active", "trialing", "past_due"])("treats %s as Pro", (status) => {
        expect(isProSubscriptionStatus(status)).toBe(true);
    });

    it.each(["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"])(
        "does not treat %s as Pro",
        (status) => {
            expect(isProSubscriptionStatus(status)).toBe(false);
        },
    );
});

describe("isTerminalSubscriptionStatus", () => {
    it.each(["canceled", "incomplete_expired"])("treats %s as terminal", (status) => {
        expect(isTerminalSubscriptionStatus(status)).toBe(true);
    });

    it.each(["active", "past_due", "unpaid", "incomplete"])(
        "does not treat %s as terminal",
        (status) => {
            expect(isTerminalSubscriptionStatus(status)).toBe(false);
        },
    );
});

describe("isBillingPlan", () => {
    it("accepts monthly and yearly", () => {
        expect(isBillingPlan("monthly")).toBe(true);
        expect(isBillingPlan("yearly")).toBe(true);
    });

    it.each(["weekly", "", undefined, null, 42])("rejects %s", (value) => {
        expect(isBillingPlan(value)).toBe(false);
    });
});

describe("priceIdForPlan", () => {
    it("returns the env price id for each plan", () => {
        vi.stubEnv("STRIPE_PRICE_ID_MONTHLY", "price_monthly");
        vi.stubEnv("STRIPE_PRICE_ID_YEARLY", "price_yearly");

        expect(priceIdForPlan("monthly")).toBe("price_monthly");
        expect(priceIdForPlan("yearly")).toBe("price_yearly");
    });

    it("returns undefined when the env var is unset", () => {
        vi.stubEnv("STRIPE_PRICE_ID_MONTHLY", undefined);
        vi.stubEnv("STRIPE_PRICE_ID_YEARLY", undefined);

        expect(priceIdForPlan("monthly")).toBeUndefined();
        expect(priceIdForPlan("yearly")).toBeUndefined();
    });
});

describe("hasProAccess", () => {
    it("denies a free user when PRO_GATING_ENABLED is unset", () => {
        vi.stubEnv("PRO_GATING_ENABLED", undefined);
        expect(hasProAccess(false)).toBe(false);
    });

    it("grants a free user access when PRO_GATING_ENABLED is the literal \"false\"", () => {
        vi.stubEnv("PRO_GATING_ENABLED", "false");
        expect(hasProAccess(false)).toBe(true);
    });

    it("does not grant a free user access for any other value", () => {
        vi.stubEnv("PRO_GATING_ENABLED", "true");
        expect(hasProAccess(false)).toBe(false);
    });

    it("always grants a Pro user access", () => {
        vi.stubEnv("PRO_GATING_ENABLED", undefined);
        expect(hasProAccess(true)).toBe(true);
        vi.stubEnv("PRO_GATING_ENABLED", "true");
        expect(hasProAccess(true)).toBe(true);
    });
});

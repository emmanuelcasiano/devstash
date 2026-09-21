import { isProItemType } from "@/lib/constants/item-types";

/**
 * Pure plan rules: free-tier limits, subscription-status helpers, and the gate
 * checks for creating items/collections. Deliberately free of Prisma, `auth`, and
 * Stripe imports — anything reaching `src/lib/prisma.ts` throws at import time
 * under Vitest (no `DATABASE_URL`), which would make this module untestable.
 */

export const FREE_ITEM_LIMIT = 50;
export const FREE_COLLECTION_LIMIT = 3;

export const BILLING_PLANS = ["monthly", "yearly"] as const;
export type BillingPlan = (typeof BILLING_PLANS)[number];

export function isBillingPlan(value: unknown): value is BillingPlan {
    return BILLING_PLANS.includes(value as BillingPlan);
}

export function priceIdForPlan(plan: BillingPlan): string | undefined {
    return plan === "monthly"
        ? process.env.STRIPE_PRICE_ID_MONTHLY
        : process.env.STRIPE_PRICE_ID_YEARLY;
}

/**
 * Subscription statuses that keep Pro access on. `past_due` is included as a
 * grace period while Stripe retries the card; access ends when the subscription
 * becomes `canceled` / `unpaid` / `incomplete_expired`.
 */
const PRO_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

export function isProSubscriptionStatus(status: string): boolean {
    return PRO_SUBSCRIPTION_STATUSES.has(status);
}

/** Statuses after which the subscription can never come back. */
export function isTerminalSubscriptionStatus(status: string): boolean {
    return status === "canceled" || status === "incomplete_expired";
}

/**
 * Master switch mirroring `EMAIL_VERIFICATION_ENABLED`: the literal
 * `PRO_GATING_ENABLED="false"` gives everyone Pro access during development.
 * Unset (including in production) or any other value keeps gating on.
 */
export function hasProAccess(isPro: boolean): boolean {
    return isPro || process.env.PRO_GATING_ENABLED === "false";
}

export type GateResult = { allowed: true } | { allowed: false; error: string };

export const PRO_TYPE_ERROR =
    "File and image uploads are a Pro feature. Upgrade to add them.";
export const ITEM_LIMIT_ERROR = `The Free plan is limited to ${FREE_ITEM_LIMIT} items. Upgrade to Pro for unlimited items.`;
export const COLLECTION_LIMIT_ERROR = `The Free plan is limited to ${FREE_COLLECTION_LIMIT} collections. Upgrade to Pro for unlimited collections.`;

/** The Pro-only type check runs before the item-count check. */
export function canCreateItem(args: {
    hasPro: boolean;
    itemCount: number;
    itemType: string;
}): GateResult {
    if (args.hasPro) return { allowed: true };
    if (isProItemType(args.itemType)) {
        return { allowed: false, error: PRO_TYPE_ERROR };
    }
    if (args.itemCount >= FREE_ITEM_LIMIT) {
        return { allowed: false, error: ITEM_LIMIT_ERROR };
    }
    return { allowed: true };
}

export function canCreateCollection(args: {
    hasPro: boolean;
    collectionCount: number;
}): GateResult {
    if (args.hasPro || args.collectionCount < FREE_COLLECTION_LIMIT) {
        return { allowed: true };
    }
    return { allowed: false, error: COLLECTION_LIMIT_ERROR };
}

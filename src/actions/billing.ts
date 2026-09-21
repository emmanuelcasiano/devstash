"use server";

import {
    GENERIC_ERROR,
    requireUserId,
    type ActionResult,
} from "@/actions/shared";
import { createCheckoutUrl, createPortalUrl } from "@/lib/billing/checkout";
import { isBillingPlan } from "@/lib/billing/plans";
import { getCurrentUserIsPro } from "@/lib/db/current-user";
import { checkRateLimit } from "@/lib/rate-limit";
import { isStripeConfigured } from "@/lib/stripe";

const BILLING_UNAVAILABLE = "Billing is not available right now.";
const BILLING_RATE_LIMITED = "Too many attempts. Please try again shortly.";

/**
 * Starts a Stripe-hosted Checkout for the chosen plan.
 *
 * Returns the Checkout `{ url }` instead of calling `redirect()` so a failure
 * can be shown as a toast; the client navigates with `window.location.assign`.
 * Follows the project's `{ success, data, error }` contract. Checks the real
 * `isPro` flag rather than `hasProAccess()`, so a developer with gating
 * switched off can still test the upgrade flow.
 */
export async function createCheckoutSession(
    plan: unknown,
): Promise<ActionResult<{ url: string }>> {
    const user = await requireUserId("upgrade");
    if ("error" in user) return { success: false, error: user.error };

    if (!isBillingPlan(plan)) {
        return { success: false, error: "Choose a monthly or yearly plan." };
    }
    if (!isStripeConfigured()) {
        return { success: false, error: BILLING_UNAVAILABLE };
    }
    if (await getCurrentUserIsPro()) {
        return { success: false, error: "You're already on Pro." };
    }

    const limit = await checkRateLimit("billing", user.userId);
    if (!limit.success) {
        return { success: false, error: BILLING_RATE_LIMITED };
    }

    try {
        const url = await createCheckoutUrl(user.userId, plan);
        return { success: true, data: { url } };
    } catch (error) {
        console.error("Failed to create Checkout session:", error);
        return { success: false, error: GENERIC_ERROR };
    }
}

/**
 * Opens the Stripe Billing Portal for the signed-in user. Same `{ url }` return
 * and `ActionResult` contract as {@link createCheckoutSession}.
 */
export async function createPortalSession(): Promise<
    ActionResult<{ url: string }>
> {
    const user = await requireUserId("manage billing");
    if ("error" in user) return { success: false, error: user.error };

    if (!isStripeConfigured()) {
        return { success: false, error: BILLING_UNAVAILABLE };
    }

    const limit = await checkRateLimit("billing", user.userId);
    if (!limit.success) {
        return { success: false, error: BILLING_RATE_LIMITED };
    }

    try {
        const url = await createPortalUrl(user.userId);
        if (!url) {
            return { success: false, error: "No billing account found yet." };
        }
        return { success: true, data: { url } };
    } catch (error) {
        console.error("Failed to create billing portal session:", error);
        return { success: false, error: GENERIC_ERROR };
    }
}

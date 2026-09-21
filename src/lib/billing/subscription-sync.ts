import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import {
    isProSubscriptionStatus,
    isTerminalSubscriptionStatus,
} from "@/lib/billing/plans";

/** `customer` / `subscription` are `string | object | null` depending on expansion. */
export function stripeId(ref: string | { id: string } | null): string | null {
    if (!ref) return null;
    return typeof ref === "string" ? ref : ref.id;
}

/**
 * The single write path for plan state: every webhook branch calls this. It is
 * idempotent by construction — it stores the *current* state derived from the
 * subscription, never a delta — so Stripe retries and manual "resend event"
 * are harmless and no processed-events table is needed.
 *
 * `knownUserId` comes from a Checkout session's `client_reference_id`. The
 * subscription events have no such field, so they resolve the user from
 * `metadata.userId`, then from `stripeCustomerId` (saved before Checkout starts).
 * An unknown customer logs a warning and returns; throwing would make Stripe
 * retry an event that can never succeed.
 */
export async function applySubscription(
    subscription: Stripe.Subscription,
    knownUserId?: string | null,
): Promise<void> {
    const customerId = stripeId(subscription.customer);
    if (!customerId) return;

    const userId = knownUserId ?? subscription.metadata?.userId ?? null;
    const user = userId
        ? await prisma.user.findUnique({ where: { id: userId } })
        : await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });

    if (!user) {
        console.warn(
            `[stripe] No user for customer ${customerId} (subscription ${subscription.id}).`,
        );
        return;
    }

    const isPro = isProSubscriptionStatus(subscription.status);

    // Out-of-order guard: a dead older subscription must not revoke access that
    // a newer one granted (the user cancelled, then re-subscribed).
    if (
        user.stripeSubscriptionId &&
        user.stripeSubscriptionId !== subscription.id &&
        !isPro
    ) {
        return;
    }

    // `stripeCustomerId` is kept after a cancel so the portal and a re-subscribe
    // reuse the same Stripe customer; `stripeSubscriptionId` is nulled on terminal
    // statuses because it is `@unique` and would point at nothing useful.
    await prisma.user.update({
        where: { id: user.id },
        data: {
            isPro,
            stripeCustomerId: customerId,
            stripeSubscriptionId: isTerminalSubscriptionStatus(subscription.status)
                ? null
                : subscription.id,
        },
    });
}

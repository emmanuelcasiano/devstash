import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { priceIdForPlan, type BillingPlan } from "@/lib/billing/plans";

/**
 * Absolute base URL for Stripe return links: `APP_URL` when set, otherwise the
 * request origin. Server Actions have no `Request`, so `getAppBaseUrl(request)`
 * from `src/lib/auth/verification.ts` can't be reused here.
 */
async function getBaseUrl(): Promise<string> {
    const configured = process.env.APP_URL?.replace(/\/+$/, "");
    if (configured) return configured;

    const origin = (await headers()).get("origin");
    if (!origin) {
        throw new Error("Set APP_URL so Stripe can build return URLs.");
    }
    return origin;
}

/**
 * Starts a hosted Checkout session for `plan` and returns its URL.
 *
 * The Stripe customer is created **and saved before** Checkout starts, so later
 * `customer.subscription.*` events can always be matched to a user by
 * `stripeCustomerId` even if they arrive before `checkout.session.completed`
 * (Stripe doesn't guarantee event ordering).
 */
export async function createCheckoutUrl(
    userId: string,
    plan: BillingPlan,
): Promise<string> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, stripeCustomerId: true },
    });
    if (!user) throw new Error("User not found.");

    const priceId = priceIdForPlan(plan);
    if (!priceId) {
        throw new Error(`No Stripe price configured for the ${plan} plan.`);
    }

    const stripe = getStripe();

    let customerId = user.stripeCustomerId;
    if (!customerId) {
        // The idempotency key makes two rapid clicks (or two tabs) get the SAME
        // customer back instead of creating a duplicate the unique column would
        // then reject.
        const customer = await stripe.customers.create(
            { email: user.email, name: user.name ?? undefined, metadata: { userId } },
            { idempotencyKey: `devstash-customer-${userId}` },
        );
        customerId = customer.id;
        await prisma.user.update({
            where: { id: userId },
            data: { stripeCustomerId: customerId },
        });
    }

    const baseUrl = await getBaseUrl();
    const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        client_reference_id: userId,
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: { metadata: { userId } },
        allow_promotion_codes: true,
        success_url: `${baseUrl}/settings?checkout=success`,
        cancel_url: `${baseUrl}/settings?checkout=canceled`,
    });

    if (!session.url) {
        throw new Error("Stripe did not return a Checkout URL.");
    }
    return session.url;
}

/**
 * Opens the Stripe Billing Portal (plan switching, payment method, cancel and
 * invoices all live there). Returns `null` when the user has no Stripe customer
 * yet.
 */
export async function createPortalUrl(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) return null;

    const session = await getStripe().billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${await getBaseUrl()}/settings`,
    });
    return session.url;
}

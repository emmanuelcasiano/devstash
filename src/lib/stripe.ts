import Stripe from "stripe";

/**
 * Lazily-created Stripe client, cached on `globalThis` (same pattern as
 * `src/lib/prisma.ts` and `src/lib/r2.ts`) so `next dev` HMR doesn't create a new
 * client per reload. Server-only: it uses the secret key, so never import it from
 * a client component.
 *
 * No `apiVersion` is passed, so the SDK's pinned default applies and upgrading the
 * package is the only thing that moves the API version.
 */

export function isStripeConfigured(): boolean {
    return Boolean(
        process.env.STRIPE_SECRET_KEY &&
            process.env.STRIPE_PRICE_ID_MONTHLY &&
            process.env.STRIPE_PRICE_ID_YEARLY,
    );
}

const globalForStripe = globalThis as unknown as { stripeClient?: Stripe };

export function getStripe(): Stripe {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
        throw new Error("STRIPE_SECRET_KEY is not set.");
    }

    if (!globalForStripe.stripeClient) {
        globalForStripe.stripeClient = new Stripe(key);
    }

    return globalForStripe.stripeClient;
}

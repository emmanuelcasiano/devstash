import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { applySubscription, stripeId } from "@/lib/billing/subscription-sync";

/**
 * POST /api/webhooks/stripe
 *
 * Stripe → DevStash. The signature is the only auth (no session, no rate
 * limit). The RAW body must be read with `request.text()`: parsing it as JSON
 * first would change the bytes and break the signature.
 *
 * 503 when Stripe/webhook env is missing, 400 for a missing or invalid
 * signature, 500 for our own failures (so Stripe retries), and 200 for
 * everything handled or intentionally ignored.
 */
export async function POST(request: Request) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!isStripeConfigured() || !secret) {
        return NextResponse.json(
            { error: "Billing is not configured." },
            { status: 503 },
        );
    }

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
        return NextResponse.json({ error: "Missing signature." }, { status: 400 });
    }

    const stripe = getStripe();
    const body = await request.text();

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, signature, secret);
    } catch (error) {
        console.error("Stripe webhook signature verification failed:", error);
        return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;
                if (session.mode !== "subscription") break;
                const subscriptionId = stripeId(session.subscription);
                if (!subscriptionId) break;
                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                await applySubscription(subscription, session.client_reference_id);
                break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted":
                await applySubscription(event.data.object);
                break;
            default:
                break;
        }
    } catch (error) {
        console.error(
            `Failed to process Stripe event ${event.id} (${event.type}):`,
            error,
        );
        return NextResponse.json(
            { error: "Webhook handler failed." },
            { status: 500 },
        );
    }

    return NextResponse.json({ received: true });
}

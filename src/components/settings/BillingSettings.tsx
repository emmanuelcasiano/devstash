"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createCheckoutSession, createPortalSession } from "@/actions/billing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError, FormNotice } from "@/components/ui/form-message";
import {
    FREE_COLLECTION_LIMIT,
    FREE_ITEM_LIMIT,
    type BillingPlan,
} from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

interface BillingSettingsProps {
    isPro: boolean;
    hasStripeCustomer: boolean;
    itemCount: number;
    collectionCount: number;
    checkoutStatus?: "success" | "canceled";
}

const PLAN_OPTIONS: {
    plan: BillingPlan;
    label: string;
    price: string;
    per: string;
    note?: string;
}[] = [
    { plan: "monthly", label: "Monthly", price: "$8", per: "/month" },
    { plan: "yearly", label: "Yearly", price: "$72", per: "/year", note: "Save 25%" },
];

/** The webhook can land after Stripe's redirect, so poll the session a few times. */
const ACTIVATION_POLL_MS = 2000;
const ACTIVATION_MAX_ATTEMPTS = 5;

function UsageMeter({
    label,
    used,
    limit,
}: {
    label: string;
    used: number;
    limit: number;
}) {
    const atLimit = used >= limit;

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span
                    className={cn(
                        "font-medium",
                        atLimit ? "text-destructive" : "text-foreground",
                    )}
                >
                    {used} / {limit}
                </span>
            </div>
            <progress
                value={Math.min(used, limit)}
                max={limit}
                aria-label={`${label} used`}
                className={cn(
                    "h-1.5 w-full appearance-none overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-muted",
                    atLimit
                        ? "[&::-moz-progress-bar]:bg-destructive [&::-webkit-progress-value]:bg-destructive"
                        : "[&::-moz-progress-bar]:bg-primary [&::-webkit-progress-value]:bg-primary",
                )}
            />
        </div>
    );
}

function PlanSelector({
    plan,
    onChange,
}: {
    plan: BillingPlan;
    onChange: (plan: BillingPlan) => void;
}) {
    return (
        <div
            role="group"
            aria-label="Billing period"
            className="grid grid-cols-2 gap-2"
        >
            {PLAN_OPTIONS.map((option) => (
                <button
                    key={option.plan}
                    type="button"
                    aria-pressed={plan === option.plan}
                    onClick={() => onChange(option.plan)}
                    className={cn(
                        "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        plan === option.plan
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted/50",
                    )}
                >
                    <span className="text-sm font-medium text-foreground">
                        {option.label}
                    </span>
                    <span className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">
                            {option.price}
                        </span>
                        {option.per}
                    </span>
                    {option.note && (
                        <span className="text-xs font-medium text-emerald-500">
                            {option.note}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

export function BillingSettings({
    isPro,
    hasStripeCustomer,
    itemCount,
    collectionCount,
    checkoutStatus,
}: BillingSettingsProps) {
    const router = useRouter();
    const [plan, setPlan] = useState<BillingPlan>("yearly");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [gaveUp, setGaveUp] = useState(false);
    const welcomedRef = useRef(false);
    const canceledRef = useRef(false);

    const activating = checkoutStatus === "success" && !isPro;

    useEffect(() => {
        if (checkoutStatus !== "canceled" || canceledRef.current) return;
        canceledRef.current = true;
        toast("Checkout canceled. You weren't charged.");
    }, [checkoutStatus]);

    useEffect(() => {
        if (checkoutStatus !== "success" || !isPro || welcomedRef.current) return;
        welcomedRef.current = true;
        toast.success("Welcome to DevStash Pro!");
    }, [checkoutStatus, isPro]);

    useEffect(() => {
        if (!activating) return;

        let ticks = 0;
        const interval = setInterval(() => {
            ticks += 1;
            if (ticks > ACTIVATION_MAX_ATTEMPTS) {
                clearInterval(interval);
                setGaveUp(true);
                return;
            }
            router.refresh();
        }, ACTIVATION_POLL_MS);

        return () => clearInterval(interval);
    }, [activating, router]);

    async function redirectTo(
        getUrl: () => ReturnType<typeof createPortalSession>,
    ) {
        setError(null);
        setPending(true);

        const result = await getUrl();
        if (!result.success) {
            setError(result.error);
            toast.error(result.error);
            setPending(false);
            return;
        }

        // Left pending on purpose: the page is navigating away to Stripe.
        window.location.assign(result.data.url);
    }

    if (isPro) {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">
                                Current plan
                            </p>
                            <Badge>Pro</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Unlimited items and collections, plus file and image
                            uploads.
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={pending}
                        onClick={() => redirectTo(createPortalSession)}
                    >
                        {pending && <Loader2 className="animate-spin" />}
                        Manage subscription
                    </Button>
                </div>
                {error && <FormError>{error}</FormError>}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5">
            {activating && (
                <FormNotice>
                    {gaveUp
                        ? "Your payment went through, but Pro is taking longer than expected to activate. Refresh this page in a moment."
                        : "Payment received, activating Pro…"}
                </FormNotice>
            )}

            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                        Current plan
                    </p>
                    <Badge variant="secondary">Free plan</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                    Upgrade for unlimited items and collections, plus file and image
                    uploads.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <UsageMeter label="Items" used={itemCount} limit={FREE_ITEM_LIMIT} />
                <UsageMeter
                    label="Collections"
                    used={collectionCount}
                    limit={FREE_COLLECTION_LIMIT}
                />
            </div>

            <PlanSelector plan={plan} onChange={setPlan} />

            {error && <FormError>{error}</FormError>}

            <div className="flex flex-wrap items-center gap-3">
                <Button
                    type="button"
                    disabled={pending}
                    onClick={() => redirectTo(() => createCheckoutSession(plan))}
                >
                    {pending && <Loader2 className="animate-spin" />}
                    Upgrade to Pro
                </Button>
                {hasStripeCustomer && (
                    <Button
                        type="button"
                        variant="link"
                        disabled={pending}
                        onClick={() => redirectTo(createPortalSession)}
                    >
                        Billing history
                    </Button>
                )}
            </div>
        </div>
    );
}

import Link from "next/link";
import { Check, X } from "lucide-react";

import { PricingToggle } from "@/components/homepage/PricingToggle";
import { ScrollFadeIn } from "@/components/homepage/ScrollFadeIn";
import { ctaClasses } from "@/components/homepage/styles";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PlanFeature {
    label: string;
    included: boolean;
}

const FREE_FEATURES: PlanFeature[] = [
    { label: "50 items total", included: true },
    { label: "3 collections", included: true },
    { label: "Basic types only", included: true },
    { label: "Basic search", included: true },
    { label: "File uploads", included: false },
    { label: "AI features", included: false },
];

const PRO_FEATURES: PlanFeature[] = [
    { label: "Unlimited items", included: true },
    { label: "Unlimited collections", included: true },
    { label: "File & image uploads", included: true },
    { label: "AI auto-tagging & more", included: true },
    { label: "Data export", included: true },
    { label: "Priority support", included: true },
];

function FeatureList({ features }: { features: PlanFeature[] }) {
    return (
        <ul className="mb-7 divide-y divide-border">
            {features.map(({ label, included }) => (
                <li
                    key={label}
                    className={cn(
                        "flex items-center gap-2.5 py-2 text-sm",
                        included ? "text-muted-foreground" : "text-muted-foreground/60",
                    )}
                >
                    {included ? (
                        <Check className="size-4 shrink-0 text-emerald-500" />
                    ) : (
                        <X className="size-4 shrink-0" />
                    )}
                    {label}
                </li>
            ))}
        </ul>
    );
}

export function PricingSection() {
    return (
        <section id="pricing" className="scroll-mt-16 px-6 py-24">
            <div className="mx-auto max-w-6xl">
                <ScrollFadeIn>
                    <h2 className="mb-3 text-center text-3xl font-bold tracking-tight sm:text-4xl">
                        Simple, honest pricing
                    </h2>
                    <p className="mx-auto mb-12 max-w-xl text-center text-muted-foreground">
                        Start free. Upgrade when you outgrow it.
                    </p>
                </ScrollFadeIn>

                <PricingToggle>
                    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
                        <ScrollFadeIn>
                            <Card className="h-full gap-0 rounded-2xl p-8">
                                <h3 className="mb-4 text-xl font-semibold">Free</h3>
                                <div className="mb-6 flex items-baseline gap-1.5">
                                    <span className="text-4xl font-bold tracking-tight">$0</span>
                                    <span className="text-muted-foreground">/forever</span>
                                </div>
                                <FeatureList features={FREE_FEATURES} />
                                <Link
                                    href="/register"
                                    className={cn(ctaClasses("outline", { full: true }), "mt-auto")}
                                >
                                    Get Started
                                </Link>
                            </Card>
                        </ScrollFadeIn>

                        <ScrollFadeIn>
                            <Card className="relative h-full gap-0 overflow-visible rounded-2xl p-8 ring-2 ring-indigo-500">
                                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-3.5 py-1 text-xs font-bold whitespace-nowrap text-white">
                                    Most Popular
                                </span>
                                <h3 className="mb-4 text-xl font-semibold">Pro</h3>
                                <div className="mb-6 flex items-baseline gap-1.5">
                                    <span className="text-4xl font-bold tracking-tight">
                                        <span className="group-data-[yearly=true]/pricing:hidden">
                                            $8
                                        </span>
                                        <span className="hidden group-data-[yearly=true]/pricing:inline">
                                            $72
                                        </span>
                                    </span>
                                    <span className="text-muted-foreground">
                                        <span className="group-data-[yearly=true]/pricing:hidden">
                                            /mo
                                        </span>
                                        <span className="hidden group-data-[yearly=true]/pricing:inline">
                                            /yr
                                        </span>
                                    </span>
                                </div>
                                <FeatureList features={PRO_FEATURES} />
                                <Link
                                    href="/register"
                                    className={cn(ctaClasses("primary", { full: true }), "mt-auto")}
                                >
                                    Upgrade to Pro
                                </Link>
                            </Card>
                        </ScrollFadeIn>
                    </div>
                </PricingToggle>
            </div>
        </section>
    );
}

"use client";

import { useState } from "react";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * Monthly/yearly switch. It only owns the boolean: it exposes it as a
 * `data-yearly` attribute on a wrapper so the (server-rendered) pricing cards
 * passed as `children` can swap their price with `group-data-[yearly=true]/pricing:`
 * variants instead of becoming client components themselves.
 */
export function PricingToggle({ children }: { children: React.ReactNode }) {
    const [yearly, setYearly] = useState(false);

    return (
        <div data-yearly={yearly} className="group/pricing">
            <div className="mb-12 flex items-center justify-center gap-3.5 text-sm">
                <span className={cn(yearly ? "text-muted-foreground" : "font-semibold")}>
                    Monthly
                </span>
                <Switch
                    checked={yearly}
                    onCheckedChange={setYearly}
                    aria-label="Toggle yearly pricing"
                />
                <span className={cn(yearly ? "font-semibold" : "text-muted-foreground")}>
                    Yearly
                    <span className="ml-1.5 text-xs font-bold text-emerald-500">Save 25%</span>
                </span>
            </div>
            {children}
        </div>
    );
}

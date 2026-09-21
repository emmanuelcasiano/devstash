"use client";

import { createContext, useContext } from "react";

export interface PlanState {
    /** True when the user is Pro, or when gating is switched off for development. */
    hasPro: boolean;
    itemCount: number;
    collectionCount: number;
}

const PlanContext = createContext<PlanState>({
    hasPro: false,
    itemCount: 0,
    collectionCount: 0,
});

/**
 * Exposes the current plan and usage counts to client components (the New Item /
 * New Collection dialogs) so they can show proactive upgrade prompts without
 * prop-drilling through `TopBar`. The counts come from data the `(app)` layout
 * already fetches, and refresh with `router.refresh()` after each create. This
 * is UX only — the server actions enforce the limits.
 */
export function PlanProvider({
    value,
    children,
}: {
    value: PlanState;
    children: React.ReactNode;
}) {
    return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanState {
    return useContext(PlanContext);
}

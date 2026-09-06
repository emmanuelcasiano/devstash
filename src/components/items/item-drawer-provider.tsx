"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface ItemDrawerContextValue {
    /** Id of the item currently shown in the drawer, or `null` when closed. */
    openItemId: string | null;
    /** Open the drawer for the given item id. */
    openItem: (id: string) => void;
    /** Close the drawer. */
    closeItem: () => void;
}

const ItemDrawerContext = createContext<ItemDrawerContextValue | null>(null);

/**
 * Holds the item-drawer open state so server-rendered pages (dashboard, items
 * list) can render plain item cards while a single client-side `<ItemDrawer />`
 * shows the detail fetched on click. Wrap the app content in this once and
 * render `<ItemDrawer />` as a sibling of the page content.
 */
export function ItemDrawerProvider({ children }: { children: React.ReactNode }) {
    const [openItemId, setOpenItemId] = useState<string | null>(null);

    const openItem = useCallback((id: string) => setOpenItemId(id), []);
    const closeItem = useCallback(() => setOpenItemId(null), []);

    return (
        <ItemDrawerContext.Provider value={{ openItemId, openItem, closeItem }}>
            {children}
        </ItemDrawerContext.Provider>
    );
}

export function useItemDrawer() {
    const ctx = useContext(ItemDrawerContext);
    if (!ctx) {
        throw new Error("useItemDrawer must be used within an ItemDrawerProvider");
    }
    return ctx;
}

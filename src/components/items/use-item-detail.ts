"use client";

import { useEffect, useState } from "react";

import type { ItemDetail } from "@/lib/db/items";

/** Item detail as it arrives over JSON — the `Date` fields are ISO strings. */
export type ItemDetailPayload = Omit<ItemDetail, "createdAt" | "updatedAt"> & {
    createdAt: string;
    updatedAt: string;
};

/** The server action returns `Date` objects; the drawer state holds ISO strings. */
export function toPayload(detail: ItemDetail): ItemDetailPayload {
    return {
        ...detail,
        createdAt: new Date(detail.createdAt).toISOString(),
        updatedAt: new Date(detail.updatedAt).toISOString(),
    };
}

export interface UseItemDetailResult {
    /** The loaded item, or `null` while loading / on error / when closed. */
    item: ItemDetailPayload | null;
    isLoading: boolean;
    isError: boolean;
    /** Re-run the fetch after an error. */
    retry: () => void;
    /** Replace the loaded item in place (used after an edit save). */
    setItem: (item: ItemDetailPayload) => void;
}

/**
 * Fetches `/api/items/:id` whenever `openItemId` changes and exposes the
 * id-tagged loading / error / loaded states the item drawer renders from.
 *
 * `item` only resolves once the fetched payload matches the *current*
 * `openItemId`, so switching items never briefly shows the previous item's
 * content. The fetch is aborted on unmount / id change.
 */
export function useItemDetail(openItemId: string | null): UseItemDetailResult {
    // `loadedItem` / `errorId` are tagged with the id they belong to: anything
    // that does not match `openItemId` reads as "still loading".
    const [loadedItem, setLoadedItem] = useState<ItemDetailPayload | null>(null);
    const [errorId, setErrorId] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        if (!openItemId) return;

        const controller = new AbortController();

        fetch(`/api/items/${openItemId}`, { signal: controller.signal })
            .then(async (res) => {
                if (!res.ok) throw new Error(`Request failed with ${res.status}`);
                return (await res.json()) as { item: ItemDetailPayload };
            })
            .then((data) => {
                setLoadedItem(data.item);
            })
            .catch((error: unknown) => {
                if (controller.signal.aborted) return;
                console.error("Failed to load item detail:", error);
                setErrorId(openItemId);
            });

        return () => controller.abort();
    }, [openItemId, reloadKey]);

    const item =
        loadedItem && loadedItem.id === openItemId ? loadedItem : null;
    const isError = errorId !== null && errorId === openItemId;
    const isLoading = openItemId !== null && item === null && !isError;

    function retry() {
        setErrorId(null);
        setReloadKey((key) => key + 1);
    }

    return { item, isLoading, isError, retry, setItem: setLoadedItem };
}

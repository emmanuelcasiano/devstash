"use client";

import { useMemo, useState } from "react";

import { FavoriteCollectionRow } from "@/components/favorites/FavoriteCollectionRow";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { FavoriteCollection } from "@/lib/db/collections";
import { type CollectionSortOption, sortFavoriteCollections } from "@/lib/favorites-sort";

const SORT_LABELS: Record<CollectionSortOption, string> = {
    date: "Date",
    name: "Name",
};

export function FavoriteCollectionsSection({
    collections,
}: {
    collections: FavoriteCollection[];
}) {
    const [sort, setSort] = useState<CollectionSortOption>("date");
    const sortedCollections = useMemo(
        () => sortFavoriteCollections(collections, sort),
        [collections, sort],
    );

    return (
        <section>
            <div className="flex items-center justify-between gap-2 px-3 pb-1">
                <h2 className="font-mono text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Collections ({collections.length})
                </h2>
                <div className="flex items-center gap-2">
                    <span
                        className="font-mono text-xs text-muted-foreground"
                        aria-hidden
                    >
                        Sort by
                    </span>
                    <Select
                        value={sort}
                        items={SORT_LABELS}
                        onValueChange={(value: CollectionSortOption | null) => {
                            if (value !== null) setSort(value);
                        }}
                    >
                        <SelectTrigger
                            aria-label="Sort favorite collections by"
                            className="h-6 w-28 font-mono text-xs"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(SORT_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="divide-y divide-border/60 rounded-lg border border-border/60">
                {sortedCollections.map((collection) => (
                    <FavoriteCollectionRow key={collection.id} collection={collection} />
                ))}
            </div>
        </section>
    );
}

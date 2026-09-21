"use client";

import { useMemo, useState } from "react";

import { FavoriteItemRow } from "@/components/favorites/FavoriteItemRow";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { FavoriteItem } from "@/lib/db/items";
import { type ItemSortOption, sortFavoriteItems } from "@/lib/favorites-sort";

const SORT_LABELS: Record<ItemSortOption, string> = {
    date: "Date",
    name: "Name",
    type: "Type",
};

export function FavoriteItemsSection({ items }: { items: FavoriteItem[] }) {
    const [sort, setSort] = useState<ItemSortOption>("date");
    const sortedItems = useMemo(() => sortFavoriteItems(items, sort), [items, sort]);

    return (
        <section>
            <div className="flex items-center justify-between gap-2 px-3 pb-1">
                <h2 className="font-mono text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Items ({items.length})
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
                        onValueChange={(value: ItemSortOption | null) => {
                            if (value !== null) setSort(value);
                        }}
                    >
                        <SelectTrigger
                            aria-label="Sort favorite items by"
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
                {sortedItems.map((item) => (
                    <FavoriteItemRow key={item.id} item={item} />
                ))}
            </div>
        </section>
    );
}

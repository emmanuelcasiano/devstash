"use client";

import { ItemTypeIcon } from "@/components/shared/ItemTypeIcon";
import { useItemDrawer } from "@/components/items/item-drawer-provider";
import { Badge } from "@/components/ui/badge";
import type { FavoriteItem } from "@/lib/db/items";
import { capitalize, formatShortDate } from "@/lib/utils";

/**
 * A single row in the favorites list's Items section. Opens the existing
 * {@link ItemDrawer} on click, same as every other item row/card in the app.
 */
export function FavoriteItemRow({ item }: { item: FavoriteItem }) {
    const { openItem } = useItemDrawer();

    return (
        <button
            type="button"
            onClick={() => openItem(item.id)}
            className="flex w-full items-center gap-3 px-3 py-1.5 text-left font-mono text-xs transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
        >
            <ItemTypeIcon
                iconName={item.itemType.icon}
                className="size-3.5 shrink-0"
                color={item.itemType.color}
            />
            <span className="min-w-0 flex-1 truncate text-foreground">
                {item.title}
            </span>
            <Badge
                variant="outline"
                className="hidden shrink-0 sm:inline-flex"
                style={{ borderColor: `${item.itemType.color}66`, color: item.itemType.color }}
            >
                {capitalize(item.itemType.name)}
            </Badge>
            <span className="w-16 shrink-0 text-right text-muted-foreground">
                {formatShortDate(item.updatedAt)}
            </span>
        </button>
    );
}

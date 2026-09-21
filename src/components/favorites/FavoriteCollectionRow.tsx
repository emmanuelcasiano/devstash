import Link from "next/link";
import { Folder } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { FavoriteCollection } from "@/lib/db/collections";
import { formatShortDate } from "@/lib/utils";

/**
 * A single row in the favorites list's Collections section. Navigates to the
 * collection's detail page, same as every other collection card in the app.
 */
export function FavoriteCollectionRow({ collection }: { collection: FavoriteCollection }) {
    return (
        <Link
            href={`/collections/${collection.id}`}
            className="flex w-full items-center gap-3 px-3 py-1.5 font-mono text-xs transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
        >
            <Folder className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-foreground">
                {collection.name}
            </span>
            <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
                Collection
            </Badge>
            <span className="hidden w-14 shrink-0 text-right text-muted-foreground md:block">
                {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
            </span>
            <span className="w-28 shrink-0 text-right text-muted-foreground">
                Updated {formatShortDate(collection.updatedAt)}
            </span>
        </Link>
    );
}

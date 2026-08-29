import Link from "next/link";
import { Star } from "lucide-react";

import { ItemTypeIcon } from "@/components/shared/ItemTypeIcon";
import type { CollectionWithStats } from "@/lib/db/collections";
import { Card, CardContent } from "@/components/ui/card";

export function CollectionCard({ collection }: { collection: CollectionWithStats }) {
    return (
        <Link href={`/collections/${collection.id}`}>
            <Card
                className="h-full border-l-2 py-0 transition-colors hover:bg-muted/50"
                style={{ borderLeftColor: collection.color }}
            >
                <CardContent className="flex flex-col gap-3 py-4">
                    <div className="flex items-center gap-1.5">
                        <h3 className="truncate font-medium text-foreground">{collection.name}</h3>
                        {collection.isFavorite && (
                            <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">{collection.itemCount} items</p>
                    {collection.description && (
                        <p className="line-clamp-1 text-sm text-muted-foreground">
                            {collection.description}
                        </p>
                    )}
                    {collection.types.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            {collection.types.map((type) => (
                                <span key={type.id}>
                                    <ItemTypeIcon iconName={type.icon} className="size-4" color={type.color} />
                                </span>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </Link>
    );
}

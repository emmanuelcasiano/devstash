import Link from "next/link";
import { Star } from "lucide-react";

import { renderItemTypeIcon } from "@/components/shared/ItemTypeIcon";
import { mockItemTypes, mockItems, type Collection } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";

export function CollectionCard({ collection }: { collection: Collection }) {
    const typeIds = new Set(
        mockItems
            .filter((item) => item.collectionIds.includes(collection.id))
            .map((item) => item.itemTypeId)
    );
    const types = mockItemTypes.filter((type) => typeIds.has(type.id));

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
                    <p className="line-clamp-1 text-sm text-muted-foreground">
                        {collection.description}
                    </p>
                    {types.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            {types.map((type) => (
                                <span key={type.id}>
                                    {renderItemTypeIcon(type.icon, "size-4", type.color)}
                                </span>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </Link>
    );
}

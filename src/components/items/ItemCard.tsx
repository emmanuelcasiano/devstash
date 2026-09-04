import { Pin, Star } from "lucide-react";

import { ItemTypeIcon } from "@/components/shared/ItemTypeIcon";
import type { ItemWithType } from "@/lib/db/items";
import { formatShortDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function ItemCard({ item }: { item: ItemWithType }) {
    return (
        <Card className="h-full border-l-2" style={{ borderLeftColor: item.itemType.color }}>
            <CardContent className="flex h-full flex-col gap-3">
                <div className="flex items-start gap-3">
                    <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${item.itemType.color}1a` }}
                    >
                        <ItemTypeIcon
                            iconName={item.itemType.icon}
                            className="size-4"
                            color={item.itemType.color}
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <h3 className="truncate text-sm font-medium text-foreground">
                                {item.title}
                            </h3>
                            {item.isPinned && (
                                <Pin className="size-3.5 shrink-0 text-muted-foreground" />
                            )}
                            {item.isFavorite && (
                                <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
                            )}
                        </div>
                        {item.description && (
                            <p className="line-clamp-2 text-sm text-muted-foreground">
                                {item.description}
                            </p>
                        )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                        {formatShortDate(item.createdAt)}
                    </span>
                </div>
                {item.tags.length > 0 && (
                    <div className="mt-auto flex flex-wrap gap-1">
                        {item.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

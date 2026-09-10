"use client";

import { useState } from "react";
import { Check, Copy, Pin, Star } from "lucide-react";

import { ItemTypeIcon } from "@/components/shared/ItemTypeIcon";
import { useItemDrawer } from "@/components/items/item-drawer-provider";
import type { ItemWithType } from "@/lib/db/items";
import { cn, formatShortDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function ItemCard({ item }: { item: ItemWithType }) {
    const { openItem } = useItemDrawer();
    const [copied, setCopied] = useState(false);

    const copyValue = item.content ?? item.url ?? item.description ?? "";

    async function handleCopy(event: React.MouseEvent) {
        event.stopPropagation();
        if (!copyValue) return;
        try {
            await navigator.clipboard.writeText(copyValue);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch (error) {
            console.error("Failed to copy item:", error);
        }
    }

    return (
        <div className="group relative h-full">
            <button
                type="button"
                onClick={() => openItem(item.id)}
                className="h-full w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <Card
                    className="h-full border-l-2 transition-colors hover:bg-muted/50"
                    style={{ borderLeftColor: item.itemType.color }}
                >
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
            </button>

            {copyValue && (
                <button
                    type="button"
                    onClick={handleCopy}
                    aria-label={copied ? "Copied" : "Copy"}
                    className={cn(
                        "absolute right-2 bottom-2 z-10 flex size-7 items-center justify-center rounded-md border border-border bg-background/80 text-muted-foreground opacity-0 backdrop-blur transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100",
                        copied && "text-foreground opacity-100",
                    )}
                >
                    {copied ? (
                        <Check className="size-3.5" />
                    ) : (
                        <Copy className="size-3.5" />
                    )}
                </button>
            )}
        </div>
    );
}

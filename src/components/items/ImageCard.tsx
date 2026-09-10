"use client";

import { ImageIcon } from "lucide-react";

import { useItemDrawer } from "@/components/items/item-drawer-provider";
import type { ItemWithType } from "@/lib/db/items";
import { Card } from "@/components/ui/card";

export function ImageCard({ item }: { item: ItemWithType }) {
    const { openItem } = useItemDrawer();

    return (
        <button
            type="button"
            onClick={() => openItem(item.id)}
            className="group w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <Card className="overflow-hidden p-0 transition-colors hover:bg-muted/50">
                <div className="aspect-video w-full overflow-hidden bg-muted">
                    {item.fileUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={item.fileUrl}
                            alt={item.title}
                            className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                        />
                    ) : (
                        <div className="flex size-full items-center justify-center">
                            <ImageIcon className="size-8 text-muted-foreground" />
                        </div>
                    )}
                </div>
                <p className="truncate px-3 py-2 text-sm font-medium text-foreground">
                    {item.title}
                </p>
            </Card>
        </button>
    );
}

"use client";

import { useState } from "react";
import { Check, Copy, Pencil, Pin, Star, Trash2 } from "lucide-react";

import type { ItemDetailPayload } from "@/components/items/use-item-detail";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The row of actions shown under the title in the item drawer's read view:
 * Favorite / Pin (display-only for now), Copy (wired), Edit, and Delete.
 *
 * `copied` is local and self-resets after 1.5s; give this component a
 * `key={item.id}` so it starts fresh when the drawer switches items.
 */
export function ItemActionBar({
    item,
    onEdit,
    onDelete,
}: {
    item: ItemDetailPayload;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const [copied, setCopied] = useState(false);

    const copyValue =
        item.content ?? item.url ?? item.fileUrl ?? item.description ?? "";

    async function handleCopy() {
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
        <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="sm">
                <Star
                    className={cn(
                        "size-4",
                        item.isFavorite && "fill-yellow-400 text-yellow-400",
                    )}
                />
                Favorite
            </Button>
            <Button variant="ghost" size="sm">
                <Pin className={cn("size-4", item.isPinned && "fill-current")} />
                Pin
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                disabled={!copyValue}
            >
                {copied ? (
                    <Check className="size-4" />
                ) : (
                    <Copy className="size-4" />
                )}
                {copied ? "Copied" : "Copy"}
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={onEdit}
            >
                <Pencil className="size-4" />
                Edit
            </Button>
            <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                aria-label="Delete item"
                onClick={onDelete}
            >
                <Trash2 className="size-4" />
            </Button>
        </div>
    );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Star, Trash2 } from "lucide-react";

import { DeleteCollectionDialog } from "@/components/collections/DeleteCollectionDialog";
import { EditCollectionDialog } from "@/components/collections/EditCollectionDialog";
import { toggleCollectionFavorite } from "@/actions/collections";
import { Button } from "@/components/ui/button";
import type { CollectionSummary } from "@/lib/db/items";
import { cn } from "@/lib/utils";

/**
 * Edit / Delete / Favorite action buttons for the `/collections/[id]` header.
 * Deleting redirects back to `/collections` since this page itself would
 * otherwise 404 once the collection is gone.
 */
export function CollectionDetailActions({ collection }: { collection: CollectionSummary }) {
    const router = useRouter();
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [isFavorite, setIsFavorite] = useState(collection.isFavorite);
    const [togglingFavorite, setTogglingFavorite] = useState(false);

    async function handleToggleFavorite() {
        if (togglingFavorite) return;

        setTogglingFavorite(true);
        const previous = isFavorite;
        setIsFavorite(!previous);

        const result = await toggleCollectionFavorite(collection.id);
        setTogglingFavorite(false);

        if (!result.success) {
            setIsFavorite(previous);
            toast.error(result.error);
            return;
        }

        setIsFavorite(result.data.isFavorite);
        router.refresh();
    }

    return (
        <>
            <div className="flex shrink-0 items-center gap-1.5">
                <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={isFavorite ? "Unfavorite" : "Favorite"}
                    aria-pressed={isFavorite}
                    disabled={togglingFavorite}
                    onClick={handleToggleFavorite}
                >
                    <Star
                        className={cn(
                            isFavorite && "fill-yellow-400 text-yellow-400",
                        )}
                    />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                    <Pencil />
                    Edit
                </Button>
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteOpen(true)}
                >
                    <Trash2 />
                    Delete
                </Button>
            </div>

            <EditCollectionDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                collection={collection}
            />
            <DeleteCollectionDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                collectionId={collection.id}
                name={collection.name}
                onDeleted={() => router.push("/collections")}
            />
        </>
    );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Star, Trash2 } from "lucide-react";

import { DeleteCollectionDialog } from "@/components/collections/DeleteCollectionDialog";
import { EditCollectionDialog } from "@/components/collections/EditCollectionDialog";
import { Button } from "@/components/ui/button";
import type { CollectionSummary } from "@/lib/db/items";
import { cn } from "@/lib/utils";

/**
 * Edit / Delete / Favorite action buttons for the `/collections/[id]` header.
 * Favorite is presentational only (no handler) — favoriting a collection
 * isn't implemented yet. Deleting redirects back to `/collections` since this
 * page itself would otherwise 404 once the collection is gone.
 */
export function CollectionDetailActions({ collection }: { collection: CollectionSummary }) {
    const router = useRouter();
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    return (
        <>
            <div className="flex shrink-0 items-center gap-1.5">
                <Button variant="ghost" size="icon-sm" aria-label="Favorite">
                    <Star
                        className={cn(
                            collection.isFavorite && "fill-yellow-400 text-yellow-400",
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

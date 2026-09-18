"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star } from "lucide-react";

import { CollectionActionsMenu } from "@/components/collections/CollectionActionsMenu";
import { DeleteCollectionDialog } from "@/components/collections/DeleteCollectionDialog";
import { EditCollectionDialog } from "@/components/collections/EditCollectionDialog";
import { ItemTypeIcon } from "@/components/shared/ItemTypeIcon";
import { toggleCollectionFavorite } from "@/actions/collections";
import type { CollectionWithStats } from "@/lib/db/collections";
import { Card, CardContent } from "@/components/ui/card";

export function CollectionCard({ collection }: { collection: CollectionWithStats }) {
    const router = useRouter();
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [isFavorite, setIsFavorite] = useState(collection.isFavorite);
    const [togglingFavorite, setTogglingFavorite] = useState(false);

    async function handleToggleFavorite(event?: React.MouseEvent) {
        event?.stopPropagation();
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
        <div className="group relative h-full">
            <button
                type="button"
                onClick={() => router.push(`/collections/${collection.id}`)}
                className="h-full w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <Card
                    className="h-full border-l-2 py-0 transition-colors hover:bg-muted/50"
                    style={{ borderLeftColor: collection.color }}
                >
                    <CardContent className="flex flex-col gap-3 py-4">
                        <div className="flex items-center gap-1.5 pr-6">
                            <h3 className="truncate font-medium text-foreground">{collection.name}</h3>
                            {isFavorite && (
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
            </button>

            <div className="absolute top-2.5 right-1.5 z-10">
                <CollectionActionsMenu
                    isFavorite={isFavorite}
                    onToggleFavorite={handleToggleFavorite}
                    onEdit={() => setEditOpen(true)}
                    onDelete={() => setDeleteOpen(true)}
                />
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
                onDeleted={() => {
                    setDeleteOpen(false);
                    router.refresh();
                }}
            />
        </div>
    );
}

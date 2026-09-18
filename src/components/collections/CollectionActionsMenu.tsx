"use client";

import { MoreVertical, Pencil, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * 3-dot menu shown on a collection card: Edit and Delete open the dialogs the
 * parent owns; Favorite toggles the collection's favorite status.
 */
export function CollectionActionsMenu({
    isFavorite,
    onToggleFavorite,
    onEdit,
    onDelete,
}: {
    isFavorite: boolean;
    onToggleFavorite: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Collection actions"
                        onClick={(event) => event.stopPropagation()}
                    />
                }
            >
                <MoreVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={(event) => {
                        event.stopPropagation();
                        onEdit();
                    }}
                >
                    <Pencil />
                    Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleFavorite();
                    }}
                >
                    <Star
                        className={cn(
                            isFavorite && "fill-yellow-400 text-yellow-400",
                        )}
                    />
                    Favorite
                </DropdownMenuItem>
                <DropdownMenuItem
                    variant="destructive"
                    onClick={(event) => {
                        event.stopPropagation();
                        onDelete();
                    }}
                >
                    <Trash2 />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

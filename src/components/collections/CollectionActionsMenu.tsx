"use client";

import { MoreVertical, Pencil, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * 3-dot menu shown on a collection card: Edit and Delete open the dialogs the
 * parent owns; Favorite is a presentational placeholder only — no handler, no
 * server action — favoriting a collection isn't implemented yet.
 */
export function CollectionActionsMenu({
    onEdit,
    onDelete,
}: {
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
                <DropdownMenuItem onClick={(event) => event.stopPropagation()}>
                    <Star />
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

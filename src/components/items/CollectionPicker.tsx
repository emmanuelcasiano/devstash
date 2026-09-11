"use client";

import { ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CollectionOption } from "@/lib/db/collections";
import { cn } from "@/lib/utils";

/**
 * Multi-select dropdown for assigning an item to zero or more collections.
 * Shared by the new-item dialog and the item drawer's edit mode.
 *
 * Selection is toggled without closing the menu (`closeOnClick={false}` is the
 * `DropdownMenuCheckboxItem` default) so the user can pick several collections
 * in one open.
 */
export function CollectionPicker({
    id,
    collections,
    selectedIds,
    onChange,
    disabled,
}: {
    id?: string;
    collections: CollectionOption[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    disabled?: boolean;
}) {
    function toggle(collectionId: string, checked: boolean) {
        onChange(
            checked
                ? [...selectedIds, collectionId]
                : selectedIds.filter((id) => id !== collectionId),
        );
    }

    const selectedNames = collections
        .filter((collection) => selectedIds.includes(collection.id))
        .map((collection) => collection.name);

    const triggerLabel =
        collections.length === 0
            ? "No collections yet"
            : selectedNames.length === 0
              ? "Select collections"
              : selectedNames.join(", ");

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        id={id}
                        type="button"
                        variant="outline"
                        className="w-full justify-between font-normal"
                        disabled={disabled || collections.length === 0}
                    />
                }
            >
                <span
                    className={cn(
                        "truncate text-left",
                        selectedNames.length > 0
                            ? "text-foreground"
                            : "text-muted-foreground",
                    )}
                >
                    {triggerLabel}
                </span>
                <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-64 w-(--anchor-width)">
                {collections.map((collection) => (
                    <DropdownMenuCheckboxItem
                        key={collection.id}
                        checked={selectedIds.includes(collection.id)}
                        onCheckedChange={(checked) =>
                            toggle(collection.id, checked)
                        }
                    >
                        {collection.name}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

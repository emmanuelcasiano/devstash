"use client";

import { useRouter } from "next/navigation";
import { FolderOpen } from "lucide-react";

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { ItemTypeIcon } from "@/components/shared/ItemTypeIcon";
import { useItemDrawer } from "@/components/items/item-drawer-provider";
import { useCommandPalette } from "@/components/search/command-palette-provider";
import { commandFilter } from "@/lib/search/fuzzy";
import type { SearchableItem } from "@/lib/db/items";
import type { CollectionWithStats } from "@/lib/db/collections";

export function CommandPalette({
    items,
    collections,
}: {
    items: SearchableItem[];
    collections: CollectionWithStats[];
}) {
    const { open, setOpen } = useCommandPalette();
    const { openItem } = useItemDrawer();
    const router = useRouter();

    function selectItem(id: string) {
        setOpen(false);
        openItem(id);
    }

    function selectCollection(id: string) {
        setOpen(false);
        router.push(`/collections/${id}`);
    }

    return (
        <CommandDialog
            open={open}
            onOpenChange={setOpen}
            commandProps={{ filter: commandFilter }}
        >
            <CommandInput placeholder="Search items and collections..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                {items.length > 0 && (
                    <CommandGroup heading="Items">
                        {items.map((item) => (
                            <CommandItem
                                key={item.id}
                                value={item.title}
                                keywords={[item.itemType.name, item.preview ?? ""].filter(Boolean)}
                                onSelect={() => selectItem(item.id)}
                            >
                                <ItemTypeIcon
                                    iconName={item.itemType.icon}
                                    className="size-4"
                                    color={item.itemType.color}
                                />
                                <div className="flex min-w-0 flex-1 flex-col">
                                    <span className="truncate">{item.title}</span>
                                    {item.preview && (
                                        <span className="truncate text-xs text-muted-foreground">
                                            {item.preview}
                                        </span>
                                    )}
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}
                {items.length > 0 && collections.length > 0 && <CommandSeparator />}
                {collections.length > 0 && (
                    <CommandGroup heading="Collections">
                        {collections.map((collection) => (
                            <CommandItem
                                key={collection.id}
                                value={collection.name}
                                onSelect={() => selectCollection(collection.id)}
                            >
                                <FolderOpen className="size-4 text-muted-foreground" />
                                <span className="min-w-0 flex-1 truncate">{collection.name}</span>
                                <span className="shrink-0 text-xs text-muted-foreground">
                                    {collection.itemCount}{" "}
                                    {collection.itemCount === 1 ? "item" : "items"}
                                </span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}
            </CommandList>
        </CommandDialog>
    );
}

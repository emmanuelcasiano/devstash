"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderPlus, Layers, PanelLeft, Plus, Search, Star } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NewCollectionDialog } from "@/components/collections/NewCollectionDialog";
import { NewItemDialog } from "@/components/items/NewItemDialog";
import { useSidebar } from "@/components/layout/sidebar-provider";
import { useCommandPalette } from "@/components/search/command-palette-provider";
import type { CollectionOption } from "@/lib/db/collections";

export function TopBar({
    collections,
}: {
    collections: CollectionOption[];
}) {
    const { toggleSidebar } = useSidebar();
    const { setOpen: setCommandPaletteOpen } = useCommandPalette();
    const [itemDialogOpen, setItemDialogOpen] = useState(false);
    const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);

    return (
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border px-4">
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Open sidebar"
                    onClick={toggleSidebar}
                    className="lg:hidden"
                >
                    <PanelLeft />
                </Button>
                <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
                    <Layers className="size-4 text-white" />
                </div>
                <span className="font-semibold">DevStash</span>
            </div>
            <div className="relative hidden w-full max-w-sm md:block">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Search items... (⌘K)"
                    readOnly
                    onClick={() => setCommandPaletteOpen(true)}
                    className="cursor-pointer pl-8"
                />
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Search"
                    onClick={() => setCommandPaletteOpen(true)}
                    className="md:hidden"
                >
                    <Search />
                </Button>
                <Link
                    href="/favorites"
                    aria-label="Favorites"
                    className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                >
                    <Star className="size-4" />
                </Link>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCollectionDialogOpen(true)}
                    className="hidden sm:inline-flex"
                >
                    <FolderPlus />
                    New Collection
                </Button>
                <Button
                    size="sm"
                    onClick={() => setItemDialogOpen(true)}
                    className="hidden sm:inline-flex"
                >
                    <Plus />
                    New Item
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={<Button size="icon-sm" aria-label="Create new" />}
                        className="sm:hidden"
                    >
                        <Plus />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                            onClick={() => setItemDialogOpen(true)}
                        >
                            <Plus />
                            New Item
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setCollectionDialogOpen(true)}
                        >
                            <FolderPlus />
                            New Collection
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <NewItemDialog
                collections={collections}
                open={itemDialogOpen}
                onOpenChange={setItemDialogOpen}
                showTrigger={false}
            />
            <NewCollectionDialog
                open={collectionDialogOpen}
                onOpenChange={setCollectionDialogOpen}
                showTrigger={false}
            />
        </header>
    );
}

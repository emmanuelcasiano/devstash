"use client";

import { Layers, PanelLeft, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewCollectionDialog } from "@/components/collections/NewCollectionDialog";
import { NewItemDialog } from "@/components/items/NewItemDialog";
import { useSidebar } from "@/components/layout/sidebar-provider";
import type { CollectionOption } from "@/lib/db/collections";

export function TopBar({
    collections,
}: {
    collections: CollectionOption[];
}) {
    const { toggleSidebar } = useSidebar();

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
            <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="search" placeholder="Search items..." className="pl-8" />
            </div>
            <div className="flex items-center gap-2">
                <NewCollectionDialog />
                <NewItemDialog collections={collections} />
            </div>
        </header>
    );
}

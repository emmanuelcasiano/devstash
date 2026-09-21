"use client";

import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetTitle,
} from "@/components/ui/sheet";
import { Sidebar, type SidebarUser } from "@/components/layout/Sidebar";
import { useSidebar } from "@/components/layout/sidebar-provider";
import type { CollectionWithStats } from "@/lib/db/collections";
import type { ItemTypeWithCount } from "@/lib/db/items";

export function SidebarMobile({
    itemTypes,
    collections,
    user = null,
}: {
    itemTypes: ItemTypeWithCount[];
    collections: CollectionWithStats[];
    user?: SidebarUser | null;
}) {
    const { mobileOpen, setMobileOpen } = useSidebar();

    return (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent
                side="left"
                showCloseButton={false}
                className="w-72 gap-0 p-0"
            >
                <div className="flex shrink-0 items-center justify-between border-b border-border p-2">
                    <SheetTitle className="px-2 text-sm">Navigation</SheetTitle>
                    <SheetClose
                        render={
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Close navigation"
                            />
                        }
                    >
                        <XIcon />
                    </SheetClose>
                </div>
                <div className="min-h-0 flex-1">
                    <Sidebar
                        itemTypes={itemTypes}
                        collections={collections}
                        user={user}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}

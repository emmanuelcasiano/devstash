"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/Sidebar";
import { useSidebar } from "@/components/layout/sidebar-provider";

export function SidebarMobile() {
    const { mobileOpen, setMobileOpen } = useSidebar();

    return (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Sidebar</SheetTitle>
                <Sidebar />
            </SheetContent>
        </Sheet>
    );
}

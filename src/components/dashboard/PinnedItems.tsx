import { Pin } from "lucide-react";

import { mockItems } from "@/lib/mock-data";
import { ItemRow } from "@/components/dashboard/ItemRow";

export function PinnedItems() {
    const pinnedItems = mockItems
        .filter((item) => item.isPinned)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (pinnedItems.length === 0) return null;

    return (
        <section className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
                <Pin className="size-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Pinned</h2>
            </div>
            <div className="flex flex-col gap-3">
                {pinnedItems.map((item) => (
                    <ItemRow key={item.id} item={item} />
                ))}
            </div>
        </section>
    );
}

import { Pin } from "lucide-react";

import { getPinnedItems } from "@/lib/db/items";
import { ItemRow } from "@/components/dashboard/ItemRow";

export async function PinnedItems() {
    const pinnedItems = await getPinnedItems();

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

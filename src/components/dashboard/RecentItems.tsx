import { getRecentItems } from "@/lib/db/items";
import { ItemRow } from "@/components/dashboard/ItemRow";

const RECENT_ITEMS_LIMIT = 10;

export async function RecentItems() {
    const recentItems = await getRecentItems(RECENT_ITEMS_LIMIT);

    return (
        <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-foreground">Recent Items</h2>
            <div className="flex flex-col gap-3">
                {recentItems.map((item) => (
                    <ItemRow key={item.id} item={item} />
                ))}
            </div>
        </section>
    );
}

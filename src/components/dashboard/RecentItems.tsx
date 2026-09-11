import { getRecentItems } from "@/lib/db/items";
import { DASHBOARD_RECENT_ITEMS_LIMIT } from "@/lib/constants/pagination";
import { ItemRow } from "@/components/dashboard/ItemRow";

export async function RecentItems() {
    const recentItems = await getRecentItems(DASHBOARD_RECENT_ITEMS_LIMIT);

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

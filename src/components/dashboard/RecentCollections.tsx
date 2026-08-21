import Link from "next/link";

import { getRecentCollections } from "@/lib/db/collections";
import { CollectionCard } from "@/components/dashboard/CollectionCard";

const RECENT_COLLECTIONS_LIMIT = 6;

export async function RecentCollections() {
    const recentCollections = await getRecentCollections(RECENT_COLLECTIONS_LIMIT);

    return (
        <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Recent Collections</h2>
                <Link
                    href="/collections"
                    className="text-sm text-muted-foreground hover:text-foreground"
                >
                    View all
                </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recentCollections.map((collection) => (
                    <CollectionCard key={collection.id} collection={collection} />
                ))}
            </div>
        </section>
    );
}

import { FolderKanban, Heart, Package, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { getCollectionStats } from "@/lib/db/collections";
import { getItemStats } from "@/lib/db/items";
import { StatTile } from "@/components/shared/StatTile";

interface Stat {
    label: string;
    value: number;
    icon: LucideIcon;
    color: string;
}

export async function StatsCards() {
    const [itemStats, collectionStats] = await Promise.all([
        getItemStats(),
        getCollectionStats(),
    ]);

    const stats: Stat[] = [
        {
            label: "Total Items",
            value: itemStats.totalItems,
            icon: Package,
            color: "#3b82f6",
        },
        {
            label: "Collections",
            value: collectionStats.totalCollections,
            icon: FolderKanban,
            color: "#8b5cf6",
        },
        {
            label: "Favorite Items",
            value: itemStats.favoriteItems,
            icon: Star,
            color: "#fde047",
        },
        {
            label: "Favorite Collections",
            value: collectionStats.favoriteCollections,
            icon: Heart,
            color: "#ec4899",
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat) => (
                <StatTile
                    key={stat.label}
                    icon={stat.icon}
                    color={stat.color}
                    value={stat.value}
                    label={stat.label}
                />
            ))}
        </div>
    );
}

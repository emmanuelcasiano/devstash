import { FolderKanban, Heart, Package, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { mockCollections, mockItems } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";

interface Stat {
    label: string;
    value: number;
    icon: LucideIcon;
    color: string;
}

function StatIcon({ icon: Icon, color }: { icon: LucideIcon; color: string }) {
    return <Icon className="size-5" style={{ color }} />;
}

export function StatsCards() {
    const stats: Stat[] = [
        {
            label: "Total Items",
            value: mockItems.length,
            icon: Package,
            color: "#3b82f6",
        },
        {
            label: "Collections",
            value: mockCollections.length,
            icon: FolderKanban,
            color: "#8b5cf6",
        },
        {
            label: "Favorite Items",
            value: mockItems.filter((item) => item.isFavorite).length,
            icon: Star,
            color: "#fde047",
        },
        {
            label: "Favorite Collections",
            value: mockCollections.filter((collection) => collection.isFavorite).length,
            icon: Heart,
            color: "#ec4899",
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat) => (
                <Card key={stat.label}>
                    <CardContent className="flex items-center gap-3">
                        <div
                            className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${stat.color}1a` }}
                        >
                            <StatIcon icon={stat.icon} color={stat.color} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                            <p className="truncate text-xs text-muted-foreground">{stat.label}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

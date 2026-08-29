import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/db/current-user";

export interface CollectionTypeSummary {
    id: string;
    name: string;
    icon: string;
    color: string;
}

export interface CollectionWithStats {
    id: string;
    name: string;
    description: string | null;
    isFavorite: boolean;
    itemCount: number;
    createdAt: Date;
    color: string;
    types: CollectionTypeSummary[];
}

export interface CollectionStats {
    totalCollections: number;
    favoriteCollections: number;
}

export async function getRecentCollections(limit = 6): Promise<CollectionWithStats[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const collections = await prisma.collection.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
            items: {
                include: {
                    item: {
                        include: { itemType: true },
                    },
                },
            },
        },
    });

    return collections.map((collection) => {
        const typeCounts = new Map<string, { type: CollectionTypeSummary; count: number }>();

        for (const { item } of collection.items) {
            const entry = typeCounts.get(item.itemType.id);
            if (entry) {
                entry.count += 1;
            } else {
                typeCounts.set(item.itemType.id, {
                    type: {
                        id: item.itemType.id,
                        name: item.itemType.name,
                        icon: item.itemType.icon,
                        color: item.itemType.color,
                    },
                    count: 1,
                });
            }
        }

        const sortedTypes = [...typeCounts.values()].sort((a, b) => b.count - a.count);

        return {
            id: collection.id,
            name: collection.name,
            description: collection.description,
            isFavorite: collection.isFavorite,
            itemCount: collection.items.length,
            createdAt: collection.createdAt,
            color: sortedTypes[0]?.type.color ?? "#6b7280",
            types: sortedTypes.map((entry) => entry.type),
        };
    });
}

export async function getCollectionStats(): Promise<CollectionStats> {
    const userId = await getCurrentUserId();
    if (!userId) return { totalCollections: 0, favoriteCollections: 0 };

    const [totalCollections, favoriteCollections] = await Promise.all([
        prisma.collection.count({ where: { userId } }),
        prisma.collection.count({ where: { userId, isFavorite: true } }),
    ]);

    return { totalCollections, favoriteCollections };
}

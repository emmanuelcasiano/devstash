import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/db/current-user";

export interface ItemTypeSummary {
    id: string;
    name: string;
    icon: string;
    color: string;
}

export interface ItemWithType {
    id: string;
    title: string;
    description: string | null;
    isFavorite: boolean;
    isPinned: boolean;
    createdAt: Date;
    itemType: ItemTypeSummary;
    tags: string[];
}

export interface ItemStats {
    totalItems: number;
    favoriteItems: number;
}

export interface ItemTypeWithCount extends ItemTypeSummary {
    count: number;
}

export interface ItemsByType {
    itemType: ItemTypeSummary;
    items: ItemWithType[];
}

interface PrismaItemWithRelations {
    id: string;
    title: string;
    description: string | null;
    isFavorite: boolean;
    isPinned: boolean;
    createdAt: Date;
    itemType: ItemTypeSummary;
    tags: { name: string }[];
}

function toItemWithType(item: PrismaItemWithRelations): ItemWithType {
    return {
        id: item.id,
        title: item.title,
        description: item.description,
        isFavorite: item.isFavorite,
        isPinned: item.isPinned,
        createdAt: item.createdAt,
        itemType: item.itemType,
        tags: item.tags.map((tag) => tag.name),
    };
}

export async function getPinnedItems(): Promise<ItemWithType[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const items = await prisma.item.findMany({
        where: { userId, isPinned: true },
        orderBy: { createdAt: "desc" },
        include: { itemType: true, tags: true },
    });

    return items.map(toItemWithType);
}

export async function getRecentItems(limit = 10): Promise<ItemWithType[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const items = await prisma.item.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { itemType: true, tags: true },
    });

    return items.map(toItemWithType);
}

export async function getItemStats(): Promise<ItemStats> {
    const userId = await getCurrentUserId();
    if (!userId) return { totalItems: 0, favoriteItems: 0 };

    const [totalItems, favoriteItems] = await Promise.all([prisma.item.count({ where: { userId } }), prisma.item.count({ where: { userId, isFavorite: true } })]);

    return { totalItems, favoriteItems };
}

export async function getItemTypesWithCounts(): Promise<ItemTypeWithCount[]> {
    const userId = await getCurrentUserId();

    const itemTypes = await prisma.itemType.findMany({
        where: { isSystem: true },
        orderBy: { id: "asc" },
    });

    if (!userId) {
        return itemTypes.map((type) => ({ id: type.id, name: type.name, icon: type.icon, color: type.color, count: 0 }));
    }

    const counts = await prisma.item.groupBy({
        by: ["itemTypeId"],
        where: { userId },
        _count: { _all: true },
    });
    const countByTypeId = new Map(counts.map((entry) => [entry.itemTypeId, entry._count._all]));

    return itemTypes.map((type) => ({
        id: type.id,
        name: type.name,
        icon: type.icon,
        color: type.color,
        count: countByTypeId.get(type.id) ?? 0,
    }));
}

/**
 * Fetches the current user's items for a single system item type, newest first.
 *
 * `typeSlug` comes from the `/items/[type]` route. System type names are stored
 * singular (`snippet`, `note`, …), so a trailing "s" is also accepted so that
 * both `/items/snippet` (the sidebar links) and `/items/snippets` resolve.
 * Returns `null` when the slug matches no system type so the page can 404.
 */
export async function getItemsByType(typeSlug: string): Promise<ItemsByType | null> {
    const normalized = typeSlug.toLowerCase();
    const candidates =
        normalized.length > 1 && normalized.endsWith("s")
            ? [normalized, normalized.slice(0, -1)]
            : [normalized];

    const type = await prisma.itemType.findFirst({
        where: { isSystem: true, name: { in: candidates } },
    });
    if (!type) return null;

    const itemType: ItemTypeSummary = {
        id: type.id,
        name: type.name,
        icon: type.icon,
        color: type.color,
    };

    const userId = await getCurrentUserId();
    if (!userId) return { itemType, items: [] };

    const items = await prisma.item.findMany({
        where: { userId, itemTypeId: type.id },
        orderBy: { createdAt: "desc" },
        include: { itemType: true, tags: true },
    });

    return { itemType, items: items.map(toItemWithType) };
}

import { prisma } from "@/lib/prisma";

const DEMO_USER_EMAIL = "demo@devstash.io";

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

async function getCurrentUserId(): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: { email: DEMO_USER_EMAIL },
        select: { id: true },
    });
    return user?.id ?? null;
}

function toItemWithType(item: { id: string; title: string; description: string | null; isFavorite: boolean; isPinned: boolean; createdAt: Date; itemType: ItemTypeSummary; tags: { name: string }[] }): ItemWithType {
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

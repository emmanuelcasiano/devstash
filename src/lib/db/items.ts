import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/db/current-user";
import type { CreateItemInput, UpdateItemInput } from "@/lib/validation/item";

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

export interface ItemCollectionSummary {
    id: string;
    name: string;
}

/**
 * The full detail view of a single item, as shown in the item drawer. Extends
 * the card-level `ItemWithType` fields with the heavier content that is only
 * fetched on click.
 */
export interface ItemDetail extends ItemWithType {
    contentType: "TEXT" | "FILE" | "URL";
    content: string | null;
    url: string | null;
    fileUrl: string | null;
    fileName: string | null;
    fileSize: number | null;
    language: string | null;
    updatedAt: Date;
    collections: ItemCollectionSummary[];
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

/**
 * Fetches a single item with its full detail (content, url, file metadata,
 * language, collection memberships, timestamps) for the item drawer. Scoped to
 * the current user, so requesting another user's item id returns `null` — the
 * same as an unknown id, which the API route maps to a 404.
 */
export async function getItemById(id: string): Promise<ItemDetail | null> {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const item = await prisma.item.findFirst({
        where: { id, userId },
        include: {
            itemType: true,
            tags: true,
            collections: { include: { collection: { select: { id: true, name: true } } } },
        },
    });
    if (!item) return null;

    return {
        id: item.id,
        title: item.title,
        description: item.description,
        isFavorite: item.isFavorite,
        isPinned: item.isPinned,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        itemType: {
            id: item.itemType.id,
            name: item.itemType.name,
            icon: item.itemType.icon,
            color: item.itemType.color,
        },
        tags: item.tags.map((tag) => tag.name),
        contentType: item.contentType,
        content: item.content,
        url: item.url,
        fileUrl: item.fileUrl,
        fileName: item.fileName,
        fileSize: item.fileSize,
        language: item.language,
        collections: item.collections.map((link) => ({
            id: link.collection.id,
            name: link.collection.name,
        })),
    };
}

/**
 * Creates a new item for the current user from the "New Item" dialog and returns
 * the full {@link ItemDetail} so the caller can render it without a second fetch.
 *
 * The `type` slug is resolved to a system {@link ItemType}; an unknown slug (or
 * no signed-in user) resolves to `null` and nothing is written. `contentType` is
 * derived from the type — `URL` for links, `TEXT` for everything else — and the
 * fields that do not apply to the chosen type are stored as `null`.
 */
export async function createItem(
    data: CreateItemInput,
): Promise<ItemDetail | null> {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const type = await prisma.itemType.findFirst({
        where: { isSystem: true, name: data.type },
        select: { id: true },
    });
    if (!type) return null;

    const isLink = data.type === "link";

    const created = await prisma.item.create({
        data: {
            title: data.title,
            description: data.description,
            content: isLink ? null : data.content,
            url: isLink ? data.url : null,
            language: isLink ? null : data.language,
            contentType: isLink ? "URL" : "TEXT",
            userId,
            itemTypeId: type.id,
            tags: {
                connectOrCreate: data.tags.map((name) => ({
                    where: { name },
                    create: { name },
                })),
            },
        },
        select: { id: true },
    });

    return getItemById(created.id);
}

/**
 * Updates the editable fields of one item (title, description, content, url,
 * language, tags) and returns the refreshed {@link ItemDetail} so the drawer can
 * re-render without a second fetch.
 *
 * Scoped to the current user: an item id that the signed-in user does not own
 * (or that does not exist) resolves to `null` and nothing is written. Tags are
 * fully replaced — every existing relation is disconnected and the new list is
 * connect-or-created.
 */
export async function updateItem(
    id: string,
    data: UpdateItemInput,
): Promise<ItemDetail | null> {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const owned = await prisma.item.findFirst({
        where: { id, userId },
        select: { id: true },
    });
    if (!owned) return null;

    await prisma.item.update({
        where: { id },
        data: {
            title: data.title,
            description: data.description,
            content: data.content,
            url: data.url,
            language: data.language,
            tags: {
                set: [],
                connectOrCreate: data.tags.map((name) => ({
                    where: { name },
                    create: { name },
                })),
            },
        },
    });

    return getItemById(id);
}

/**
 * Permanently deletes one item.
 *
 * Scoped to the current user: an item id that the signed-in user does not own
 * (or that does not exist) resolves to `false` and nothing is deleted. The
 * schema's `ItemCollection` join rows cascade on `Item` delete; `Tag` rows are
 * shared and left in place. Returns `true` when a row was removed.
 */
export async function deleteItem(id: string): Promise<boolean> {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const owned = await prisma.item.findFirst({
        where: { id, userId },
        select: { id: true },
    });
    if (!owned) return false;

    await prisma.item.delete({ where: { id } });
    return true;
}

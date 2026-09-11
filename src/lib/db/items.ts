import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/db/current-user";
import { deleteFromR2, keyFromPublicUrl } from "@/lib/r2";
import {
    contentFieldsForType,
    isFileItemType,
    type CreateItemInput,
    type UpdateItemInput,
} from "@/lib/validation/item";

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
    content: string | null;
    url: string | null;
    isFavorite: boolean;
    isPinned: boolean;
    createdAt: Date;
    fileUrl: string | null;
    fileName: string | null;
    fileSize: number | null;
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

export interface CollectionSummary {
    id: string;
    name: string;
    description: string | null;
    isFavorite: boolean;
}

export interface ItemsByCollection {
    collection: CollectionSummary;
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
    language: string | null;
    updatedAt: Date;
    collections: ItemCollectionSummary[];
}

interface PrismaItemWithRelations {
    id: string;
    title: string;
    description: string | null;
    content: string | null;
    url: string | null;
    isFavorite: boolean;
    isPinned: boolean;
    createdAt: Date;
    fileUrl: string | null;
    fileName: string | null;
    fileSize: number | null;
    itemType: ItemTypeSummary;
    tags: { name: string }[];
}

function toItemWithType(item: PrismaItemWithRelations): ItemWithType {
    return {
        id: item.id,
        title: item.title,
        description: item.description,
        content: item.content,
        url: item.url,
        isFavorite: item.isFavorite,
        isPinned: item.isPinned,
        createdAt: item.createdAt,
        fileUrl: item.fileUrl,
        fileName: item.fileName,
        fileSize: item.fileSize,
        itemType: item.itemType,
        tags: item.tags.map((tag) => tag.name),
    };
}

/**
 * Filters a list of collection ids down to the ones the given user actually
 * owns, so a hand-crafted create/update payload can never link an item into
 * another user's collection. Skips the query entirely for an empty list.
 */
async function resolveOwnedCollectionIds(
    userId: string,
    collectionIds: string[],
): Promise<string[]> {
    if (collectionIds.length === 0) return [];

    const owned = await prisma.collection.findMany({
        where: { id: { in: collectionIds }, userId },
        select: { id: true },
    });
    return owned.map((collection) => collection.id);
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
 * Fetches one collection's items, newest first, for the `/collections/[id]`
 * page. Scoped to the current user via a single `Collection.findFirst` with a
 * nested `items` include, so an id that exists but belongs to another user
 * resolves to `null` — the same as an unknown id, which the page maps to a 404.
 */
export async function getItemsByCollection(
    collectionId: string,
): Promise<ItemsByCollection | null> {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const collection = await prisma.collection.findFirst({
        where: { id: collectionId, userId },
        select: {
            id: true,
            name: true,
            description: true,
            isFavorite: true,
            items: {
                orderBy: { item: { createdAt: "desc" } },
                include: { item: { include: { itemType: true, tags: true } } },
            },
        },
    });
    if (!collection) return null;

    return {
        collection: {
            id: collection.id,
            name: collection.name,
            description: collection.description,
            isFavorite: collection.isFavorite,
        },
        items: collection.items.map((link) => toItemWithType(link.item)),
    };
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
        ...toItemWithType(item),
        contentType: item.contentType,
        language: item.language,
        updatedAt: item.updatedAt,
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
 * derived from the type — `FILE` for file/image, `URL` for links, `TEXT` for
 * everything else — and the fields that do not apply to the chosen type are
 * stored as `null`. For file/image types the upload metadata
 * (`fileUrl`/`fileName`/`fileSize`) has already been produced by
 * `POST /api/upload`.
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
    const isFile = isFileItemType(data.type);
    const collectionIds = await resolveOwnedCollectionIds(
        userId,
        data.collectionIds,
    );

    const created = await prisma.item.create({
        data: {
            title: data.title,
            description: data.description,
            ...contentFieldsForType(data.type, data),
            fileUrl: isFile ? data.fileUrl : null,
            fileName: isFile ? data.fileName : null,
            fileSize: isFile ? data.fileSize : null,
            contentType: isFile ? "FILE" : isLink ? "URL" : "TEXT",
            userId,
            itemTypeId: type.id,
            tags: {
                connectOrCreate: data.tags.map((name) => ({
                    where: { name },
                    create: { name },
                })),
            },
            collections: {
                create: collectionIds.map((collectionId) => ({ collectionId })),
            },
        },
        select: { id: true },
    });

    return getItemById(created.id);
}

/**
 * Updates the editable fields of one item (title, description, content, url,
 * language, tags, collection memberships) and returns the refreshed
 * {@link ItemDetail} so the drawer can re-render without a second fetch.
 *
 * Scoped to the current user: an item id that the signed-in user does not own
 * (or that does not exist) resolves to `null` and nothing is written. Tags and
 * collection memberships are both fully replaced — every existing relation is
 * removed and the new list is written in its place.
 *
 * The fields that do not apply to the item's type are forced to `null` on write,
 * mirroring {@link createItem}: a link never keeps `content` / `language`, a
 * text type never keeps `url`, and file/image types keep none of the three. The
 * edit form already sends `null` for hidden fields, so this only hardens the
 * path against a hand-crafted action call.
 */
export async function updateItem(
    id: string,
    data: UpdateItemInput,
): Promise<ItemDetail | null> {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const owned = await prisma.item.findFirst({
        where: { id, userId },
        select: { id: true, itemType: { select: { name: true } } },
    });
    if (!owned) return null;

    const collectionIds = await resolveOwnedCollectionIds(
        userId,
        data.collectionIds,
    );

    await prisma.item.update({
        where: { id },
        data: {
            title: data.title,
            description: data.description,
            ...contentFieldsForType(owned.itemType.name, data),
            tags: {
                set: [],
                connectOrCreate: data.tags.map((name) => ({
                    where: { name },
                    create: { name },
                })),
            },
            collections: {
                deleteMany: {},
                create: collectionIds.map((collectionId) => ({ collectionId })),
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
 *
 * When the item was a file/image, its backing R2 object is removed afterwards.
 * That cleanup is best-effort — a storage error is logged but never fails the
 * delete, since the database row (the source of truth) is already gone.
 */
export async function deleteItem(id: string): Promise<boolean> {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const owned = await prisma.item.findFirst({
        where: { id, userId },
        select: { id: true, fileUrl: true },
    });
    if (!owned) return false;

    await prisma.item.delete({ where: { id } });

    if (owned.fileUrl) {
        const key = keyFromPublicUrl(owned.fileUrl);
        if (key) {
            try {
                await deleteFromR2(key);
            } catch (error) {
                console.error(
                    `Failed to delete R2 object for item ${id}:`,
                    error,
                );
            }
        }
    }

    return true;
}

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/db/current-user";
import { COLLECTIONS_PER_PAGE } from "@/lib/constants/pagination";
import { getPageRange } from "@/lib/pagination";
import type {
    CreateCollectionInput,
    UpdateCollectionInput,
} from "@/lib/validation/collection";

/** Fallback border colour for a collection with no items to derive one from. */
const DEFAULT_COLLECTION_COLOR = "#6b7280";

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

export interface CollectionOption {
    id: string;
    name: string;
}

export interface PaginatedCollections {
    collections: CollectionWithStats[];
    totalCount: number;
}

/**
 * The current user's collections as lightweight `{id, name}` options, sorted
 * alphabetically, for the item create/edit collection picker. A dedicated query
 * rather than deriving from {@link getRecentCollections} — that function's
 * `limit` and heavy `items` include exist for the sidebar/dashboard, not for
 * populating a picker with every collection the user has.
 */
export async function getCollectionOptions(): Promise<CollectionOption[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    return prisma.collection.findMany({
        where: { userId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
    });
}

interface PrismaCollectionWithItems {
    id: string;
    name: string;
    description: string | null;
    isFavorite: boolean;
    createdAt: Date;
    items: Array<{ item: { itemType: { id: string; name: string; icon: string; color: string } } }>;
}

/**
 * Maps a Prisma collection (with its items' item types included) into the
 * {@link CollectionWithStats} shape — an item count, a border color derived
 * from the most-used item type, and the distinct list of type icons present.
 * Shared by {@link getRecentCollections} and {@link updateCollection} so both
 * compute stats the same way.
 */
function toCollectionWithStats(collection: PrismaCollectionWithItems): CollectionWithStats {
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
        color: sortedTypes[0]?.type.color ?? DEFAULT_COLLECTION_COLOR,
        types: sortedTypes.map((entry) => entry.type),
    };
}

const COLLECTION_WITH_ITEMS_INCLUDE = {
    items: {
        include: {
            item: {
                include: { itemType: true },
            },
        },
    },
} as const;

/**
 * Fetches the current user's collections, newest first, each with an item
 * count, a border color derived from its most-used item type, and the distinct
 * list of type icons present. Pass `limit` to cap the result (the dashboard's
 * Recent Collections grid, the sidebar); omit it for the full list (the
 * `/collections` page).
 */
export async function getRecentCollections(limit?: number): Promise<CollectionWithStats[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const collections = await prisma.collection.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: COLLECTION_WITH_ITEMS_INCLUDE,
    });

    return collections.map(toCollectionWithStats);
}

/**
 * Fetches one page of the current user's collections, newest first, in the
 * same {@link CollectionWithStats} shape as {@link getRecentCollections}, for
 * the `/collections` page. `page` is 1-based; only that page's rows are
 * fetched (`COLLECTIONS_PER_PAGE` each), alongside a total count.
 */
export async function getPaginatedCollections(page = 1): Promise<PaginatedCollections> {
    const userId = await getCurrentUserId();
    if (!userId) return { collections: [], totalCount: 0 };

    const { skip, take } = getPageRange(page, COLLECTIONS_PER_PAGE);
    const [collections, totalCount] = await Promise.all([
        prisma.collection.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            skip,
            take,
            include: COLLECTION_WITH_ITEMS_INCLUDE,
        }),
        prisma.collection.count({ where: { userId } }),
    ]);

    return { collections: collections.map(toCollectionWithStats), totalCount };
}

/**
 * Creates a new collection for the current user and returns it in the
 * {@link CollectionWithStats} shape so the caller can drop it straight into the
 * dashboard's collection lists without a re-fetch. A brand-new collection has no
 * items, so `itemCount` is 0, `types` is empty, and `color` falls back to the
 * neutral default.
 *
 * Scoped to the current user: returns `null` when there is no session and never
 * writes.
 */
export async function createCollection(
    data: CreateCollectionInput,
): Promise<CollectionWithStats | null> {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const collection = await prisma.collection.create({
        data: {
            name: data.name,
            description: data.description,
            userId,
        },
        select: {
            id: true,
            name: true,
            description: true,
            isFavorite: true,
            createdAt: true,
        },
    });

    return {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        isFavorite: collection.isFavorite,
        itemCount: 0,
        createdAt: collection.createdAt,
        color: DEFAULT_COLLECTION_COLOR,
        types: [],
    };
}

/**
 * Updates one collection's name/description. Scoped to the current user via
 * an ownership `findFirst` before writing, so a foreign or unknown id updates
 * nothing and returns `null` — the caller treats that as "not found".
 */
export async function updateCollection(
    id: string,
    data: UpdateCollectionInput,
): Promise<CollectionWithStats | null> {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const existing = await prisma.collection.findFirst({
        where: { id, userId },
        select: { id: true },
    });
    if (!existing) return null;

    const updated = await prisma.collection.update({
        where: { id },
        data: {
            name: data.name,
            description: data.description,
        },
        include: COLLECTION_WITH_ITEMS_INCLUDE,
    });

    return toCollectionWithStats(updated);
}

/**
 * Deletes one collection. Scoped to the current user via an ownership
 * `findFirst` before deleting, so a foreign or unknown id deletes nothing and
 * returns `false`.
 *
 * Only the collection row and its `ItemCollection` membership rows (cascaded
 * by the schema's `onDelete: Cascade` on `ItemCollection.collection`) are
 * removed — the collection's items are untouched, they simply stop belonging
 * to this collection.
 */
export async function deleteCollection(id: string): Promise<boolean> {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const existing = await prisma.collection.findFirst({
        where: { id, userId },
        select: { id: true },
    });
    if (!existing) return false;

    await prisma.collection.delete({ where: { id } });
    return true;
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

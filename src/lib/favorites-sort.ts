export const ITEM_SORT_OPTIONS = ["date", "name", "type"] as const;
export type ItemSortOption = (typeof ITEM_SORT_OPTIONS)[number];

export const COLLECTION_SORT_OPTIONS = ["date", "name"] as const;
export type CollectionSortOption = (typeof COLLECTION_SORT_OPTIONS)[number];

interface SortableFavoriteItem {
    title: string;
    updatedAt: Date;
    itemType: { name: string };
}

interface SortableFavoriteCollection {
    name: string;
    updatedAt: Date;
}

/**
 * Sorts a copy of the favorited items, leaving the input array untouched.
 * "date" (the default) matches the server's `updatedAt` desc order.
 */
export function sortFavoriteItems<T extends SortableFavoriteItem>(
    items: T[],
    sort: ItemSortOption,
): T[] {
    const sorted = [...items];
    switch (sort) {
        case "name":
            sorted.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case "type":
            sorted.sort(
                (a, b) =>
                    a.itemType.name.localeCompare(b.itemType.name) ||
                    a.title.localeCompare(b.title),
            );
            break;
        case "date":
        default:
            sorted.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
    return sorted;
}

/**
 * Sorts a copy of the favorited collections, leaving the input array
 * untouched. "date" (the default) matches the server's `updatedAt` desc order.
 */
export function sortFavoriteCollections<T extends SortableFavoriteCollection>(
    collections: T[],
    sort: CollectionSortOption,
): T[] {
    const sorted = [...collections];
    switch (sort) {
        case "name":
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case "date":
        default:
            sorted.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
    return sorted;
}

import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getCurrentUserIsPro } from "@/lib/db/current-user";
import {
    canCreateCollection,
    canCreateItem,
    hasProAccess,
} from "@/lib/billing/plans";

/**
 * DB-backed gate helpers for the create actions. The decisions themselves live
 * in the pure `plans.ts` (unit-tested); these only fetch the inputs. Each returns
 * an error message when creation is blocked, or `null` when it may proceed. A Pro
 * user (or gating switched off) skips the count query entirely.
 *
 * The check is count-then-insert, not atomic, so concurrent creates can overshoot
 * the limit by one. That is accepted for a soft product limit.
 */

/** Returns why the current user may not create an item of `itemType`, else `null`. */
export async function getItemCreationBlock(
    itemType: string,
): Promise<string | null> {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const hasPro = hasProAccess(await getCurrentUserIsPro());
    if (hasPro) return null;

    const itemCount = await prisma.item.count({ where: { userId } });
    const result = canCreateItem({ hasPro, itemCount, itemType });
    return result.allowed ? null : result.error;
}

/** Returns why the current user may not create a collection, else `null`. */
export async function getCollectionCreationBlock(): Promise<string | null> {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const hasPro = hasProAccess(await getCurrentUserIsPro());
    if (hasPro) return null;

    const collectionCount = await prisma.collection.count({ where: { userId } });
    const result = canCreateCollection({ hasPro, collectionCount });
    return result.allowed ? null : result.error;
}

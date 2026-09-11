import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getPaginatedCollections } from "@/lib/db/collections";
import { COLLECTIONS_PER_PAGE } from "@/lib/constants/pagination";
import { getTotalPages, parsePageParam } from "@/lib/pagination";
import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { PaginationControls } from "@/components/shared/PaginationControls";

export const metadata: Metadata = {
    title: "Collections · DevStash",
};

export const dynamic = "force-dynamic";

export default async function CollectionsPage({
    searchParams,
}: PageProps<"/collections">) {
    const { page: pageParam } = await searchParams;
    const page = parsePageParam(pageParam);

    const session = await auth();
    if (!session?.user) {
        redirect("/sign-in?callbackUrl=/collections");
    }

    const { collections, totalCount } = await getPaginatedCollections(page);
    const totalPages = getTotalPages(totalCount, COLLECTIONS_PER_PAGE);

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-2xl font-bold text-foreground">
                    Collections
                </h1>
                <p className="text-sm text-muted-foreground">
                    {totalCount}{" "}
                    {totalCount === 1 ? "collection" : "collections"}
                </p>
            </div>

            {totalCount === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No collections yet.
                </p>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {collections.map((collection) => (
                            <CollectionCard key={collection.id} collection={collection} />
                        ))}
                    </div>

                    <PaginationControls
                        basePath="/collections"
                        currentPage={page}
                        totalPages={totalPages}
                    />
                </>
            )}
        </div>
    );
}

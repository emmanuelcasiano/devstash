import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getRecentCollections } from "@/lib/db/collections";
import { CollectionCard } from "@/components/dashboard/CollectionCard";

export const metadata: Metadata = {
    title: "Collections · DevStash",
};

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
    const session = await auth();
    if (!session?.user) {
        redirect("/sign-in?callbackUrl=/collections");
    }

    const collections = await getRecentCollections();

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-2xl font-bold text-foreground">
                    Collections
                </h1>
                <p className="text-sm text-muted-foreground">
                    {collections.length}{" "}
                    {collections.length === 1 ? "collection" : "collections"}
                </p>
            </div>

            {collections.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No collections yet.
                </p>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {collections.map((collection) => (
                        <CollectionCard key={collection.id} collection={collection} />
                    ))}
                </div>
            )}
        </div>
    );
}

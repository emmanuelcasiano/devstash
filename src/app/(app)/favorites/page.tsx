import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Star } from "lucide-react";

import { auth } from "@/auth";
import { getFavoriteCollections } from "@/lib/db/collections";
import { getFavoriteItems } from "@/lib/db/items";
import { FavoriteItemsSection } from "@/components/favorites/FavoriteItemsSection";
import { FavoriteCollectionsSection } from "@/components/favorites/FavoriteCollectionsSection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Favorites · DevStash",
};

export default async function FavoritesPage() {
    const session = await auth();
    if (!session?.user) {
        redirect("/sign-in?callbackUrl=/favorites");
    }

    const [items, collections] = await Promise.all([
        getFavoriteItems(),
        getFavoriteCollections(),
    ]);

    const isEmpty = items.length === 0 && collections.length === 0;

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Favorites</h1>
                <p className="text-sm text-muted-foreground">
                    Items and collections you&apos;ve starred.
                </p>
            </div>

            {isEmpty ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                    <Star className="size-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                        Nothing favorited yet. Star an item or collection to see it here.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {items.length > 0 && <FavoriteItemsSection items={items} />}

                    {collections.length > 0 && (
                        <FavoriteCollectionsSection collections={collections} />
                    )}
                </div>
            )}
        </div>
    );
}

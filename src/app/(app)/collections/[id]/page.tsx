import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Folder, Star } from "lucide-react";

import { auth } from "@/auth";
import { getItemsByCollection } from "@/lib/db/items";
import { CollectionDetailActions } from "@/components/collections/CollectionDetailActions";
import { ItemCard } from "@/components/items/ItemCard";
import { ImageCard } from "@/components/items/ImageCard";
import { FileRow } from "@/components/items/FileRow";

export const metadata: Metadata = {
    title: "Collection · DevStash",
};

export const dynamic = "force-dynamic";

export default async function CollectionDetailPage({
    params,
}: PageProps<"/collections/[id]">) {
    const { id } = await params;

    const session = await auth();
    if (!session?.user) {
        redirect(`/sign-in?callbackUrl=${encodeURIComponent(`/collections/${id}`)}`);
    }

    const result = await getItemsByCollection(id);
    if (!result) {
        notFound();
    }

    const { collection, items } = result;
    const imageItems = items.filter((item) => item.itemType.name === "image");
    const fileItems = items.filter((item) => item.itemType.name === "file");
    const otherItems = items.filter(
        (item) => item.itemType.name !== "image" && item.itemType.name !== "file",
    );

    return (
        <div className="flex flex-col gap-8">
            <Link
                href="/collections"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="size-4" />
                Back to collections
            </Link>

            <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Folder className="size-5 text-muted-foreground" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h1 className="text-2xl font-bold text-foreground">
                                    {collection.name}
                                </h1>
                                {collection.isFavorite && (
                                    <Star className="size-4 shrink-0 fill-yellow-400 text-yellow-400" />
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {items.length}{" "}
                                {items.length === 1 ? "item" : "items"}
                            </p>
                        </div>
                    </div>
                    <CollectionDetailActions collection={collection} />
                </div>
                {collection.description && (
                    <p className="text-sm text-muted-foreground">
                        {collection.description}
                    </p>
                )}
            </div>

            {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No items in this collection yet.
                </p>
            ) : (
                <>
                    {otherItems.length > 0 && (
                        <section className="flex flex-col gap-3">
                            <h2 className="text-lg font-semibold text-foreground">
                                Items
                            </h2>
                            <div className="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {otherItems.map((item) => (
                                    <ItemCard key={item.id} item={item} />
                                ))}
                            </div>
                        </section>
                    )}

                    {imageItems.length > 0 && (
                        <section className="flex flex-col gap-3">
                            <h2 className="text-lg font-semibold text-foreground">
                                Images
                            </h2>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                {imageItems.map((item) => (
                                    <ImageCard key={item.id} item={item} />
                                ))}
                            </div>
                        </section>
                    )}

                    {fileItems.length > 0 && (
                        <section className="flex flex-col gap-3">
                            <h2 className="text-lg font-semibold text-foreground">
                                Files
                            </h2>
                            <div className="overflow-hidden rounded-xl border border-border">
                                <ul className="divide-y divide-border">
                                    {fileItems.map((item) => (
                                        <li key={item.id}>
                                            <FileRow item={item} />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}

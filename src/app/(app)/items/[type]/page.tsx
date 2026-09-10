import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/auth";
import { getItemsByType } from "@/lib/db/items";
import { CREATE_ITEM_TYPES, type CreateItemType } from "@/lib/validation/item";
import { ItemTypeIcon } from "@/components/shared/ItemTypeIcon";
import { ItemCard } from "@/components/items/ItemCard";
import { ImageCard } from "@/components/items/ImageCard";
import { FileRow } from "@/components/items/FileRow";
import { NewItemDialog } from "@/components/items/NewItemDialog";

export const dynamic = "force-dynamic";

function toTitleCase(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

export async function generateMetadata({
    params,
}: PageProps<"/items/[type]">): Promise<Metadata> {
    const { type } = await params;
    return { title: `${toTitleCase(type)} · DevStash` };
}

export default async function ItemsByTypePage({ params }: PageProps<"/items/[type]">) {
    const { type } = await params;

    const session = await auth();
    if (!session?.user) {
        redirect(`/sign-in?callbackUrl=${encodeURIComponent(`/items/${type}`)}`);
    }

    const result = await getItemsByType(type);
    if (!result) {
        notFound();
    }

    const { itemType, items } = result;
    const label = toTitleCase(itemType.name);
    const isImageGallery = itemType.name === "image";
    const isFileList = itemType.name === "file";
    const canCreate = (CREATE_ITEM_TYPES as readonly string[]).includes(
        itemType.name,
    );

    return (
        <div className="flex flex-col gap-8">
            <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="size-4" />
                Back to dashboard
            </Link>

            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${itemType.color}1a` }}
                    >
                        <ItemTypeIcon
                            iconName={itemType.icon}
                            className="size-5"
                            color={itemType.color}
                        />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {label}s
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {items.length}{" "}
                            {items.length === 1 ? "item" : "items"}
                        </p>
                    </div>
                </div>

                {canCreate && (
                    <NewItemDialog
                        defaultType={itemType.name as CreateItemType}
                        triggerLabel={`New ${label}`}
                    />
                )}
            </div>

            {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No {label.toLowerCase()} items yet.
                </p>
            ) : isFileList ? (
                <div className="overflow-hidden rounded-xl border border-border">
                    <ul className="divide-y divide-border">
                        {items.map((item) => (
                            <li key={item.id}>
                                <FileRow item={item} />
                            </li>
                        ))}
                    </ul>
                </div>
            ) : isImageGallery ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {items.map((item) => (
                        <ImageCard key={item.id} item={item} />
                    ))}
                </div>
            ) : (
                <div className="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                        <ItemCard key={item.id} item={item} />
                    ))}
                </div>
            )}
        </div>
    );
}

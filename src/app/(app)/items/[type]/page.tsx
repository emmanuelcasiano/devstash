import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/auth";
import { getItemsByType } from "@/lib/db/items";
import { ItemTypeIcon } from "@/components/shared/ItemTypeIcon";
import { ItemCard } from "@/components/items/ItemCard";

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

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-6">
            <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="size-4" />
                Back to dashboard
            </Link>

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
                    <h1 className="text-2xl font-bold text-foreground">{label}s</h1>
                    <p className="text-sm text-muted-foreground">
                        {items.length} {items.length === 1 ? "item" : "items"}
                    </p>
                </div>
            </div>

            {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No {label.toLowerCase()} items yet.
                </p>
            ) : (
                <div className="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2">
                    {items.map((item) => (
                        <ItemCard key={item.id} item={item} />
                    ))}
                </div>
            )}
        </div>
    );
}

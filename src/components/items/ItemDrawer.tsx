"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Check, Copy, FolderClosed, Pencil, Pin, Star, Tag, Trash2 } from "lucide-react";

import { ItemTypeIcon } from "@/components/shared/ItemTypeIcon";
import { useItemDrawer } from "@/components/items/item-drawer-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
} from "@/components/ui/sheet";
import type { ItemDetail } from "@/lib/db/items";
import { cn, formatFileSize, formatLongDate } from "@/lib/utils";

/** Item detail as it arrives over JSON — the `Date` fields are ISO strings. */
type ItemDetailPayload = Omit<ItemDetail, "createdAt" | "updatedAt"> & {
    createdAt: string;
    updatedAt: string;
};

function capitalize(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

export function ItemDrawer() {
    const { openItemId, closeItem } = useItemDrawer();

    // `item` / `errorId` are tagged with the id they belong to, so switching
    // items never flashes the previous item's content: anything that does not
    // match `openItemId` reads as "still loading".
    const [loadedItem, setLoadedItem] = useState<ItemDetailPayload | null>(null);
    const [errorId, setErrorId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        if (!openItemId) return;

        const controller = new AbortController();

        fetch(`/api/items/${openItemId}`, { signal: controller.signal })
            .then(async (res) => {
                if (!res.ok) throw new Error(`Request failed with ${res.status}`);
                return (await res.json()) as { item: ItemDetailPayload };
            })
            .then((data) => {
                setLoadedItem(data.item);
                setCopied(false);
            })
            .catch((error: unknown) => {
                if (controller.signal.aborted) return;
                console.error("Failed to load item detail:", error);
                setErrorId(openItemId);
            });

        return () => controller.abort();
    }, [openItemId, reloadKey]);

    const item =
        loadedItem && loadedItem.id === openItemId ? loadedItem : null;
    const isError = errorId !== null && errorId === openItemId;
    const isLoading = openItemId !== null && item === null && !isError;

    function retry() {
        setErrorId(null);
        setReloadKey((key) => key + 1);
    }

    const copyValue = item?.content ?? item?.url ?? item?.description ?? "";

    async function handleCopy() {
        if (!copyValue) return;
        try {
            await navigator.clipboard.writeText(copyValue);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch (error) {
            console.error("Failed to copy item:", error);
        }
    }

    return (
        <Sheet
            open={openItemId !== null}
            onOpenChange={(open) => {
                if (!open) {
                    closeItem();
                    setCopied(false);
                }
            }}
        >
            <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
                {isLoading && <DrawerSkeleton />}

                {isError && (
                    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                        <SheetTitle className="sr-only">Item details</SheetTitle>
                        <p className="text-sm text-muted-foreground">
                            Couldn&apos;t load this item.
                        </p>
                        <Button variant="outline" size="sm" onClick={retry}>
                            Try again
                        </Button>
                    </div>
                )}

                {item && (
                    <div className="flex h-full flex-col">
                        <div className="flex flex-col gap-3 p-6 pb-4">
                            <div className="flex items-start gap-3 pr-8">
                                <div
                                    className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                                    style={{ backgroundColor: `${item.itemType.color}1a` }}
                                >
                                    <ItemTypeIcon
                                        iconName={item.itemType.icon}
                                        className="size-5"
                                        color={item.itemType.color}
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <SheetTitle className="truncate text-base">
                                        {item.title}
                                    </SheetTitle>
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                        <Badge variant="secondary">
                                            {capitalize(item.itemType.name)}s
                                        </Badge>
                                        {item.language && (
                                            <Badge variant="secondary">{item.language}</Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <SheetDescription className="sr-only">
                                Detail view for {item.title}
                            </SheetDescription>

                            <div className="flex items-center gap-0.5">
                                <Button variant="ghost" size="sm">
                                    <Star
                                        className={cn(
                                            "size-4",
                                            item.isFavorite && "fill-yellow-400 text-yellow-400",
                                        )}
                                    />
                                    Favorite
                                </Button>
                                <Button variant="ghost" size="sm">
                                    <Pin
                                        className={cn(
                                            "size-4",
                                            item.isPinned && "fill-current",
                                        )}
                                    />
                                    Pin
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCopy}
                                    disabled={!copyValue}
                                >
                                    {copied ? (
                                        <Check className="size-4" />
                                    ) : (
                                        <Copy className="size-4" />
                                    )}
                                    {copied ? "Copied" : "Copy"}
                                </Button>
                                <Button variant="ghost" size="sm" className="ml-auto">
                                    <Pencil className="size-4" />
                                    Edit
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="text-destructive hover:text-destructive"
                                    aria-label="Delete item"
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        </div>

                        <Separator />

                        <div className="flex-1 space-y-6 overflow-y-auto p-6">
                            {item.description && (
                                <Section label="Description">
                                    <p className="text-sm text-foreground">{item.description}</p>
                                </Section>
                            )}

                            {item.content && (
                                <Section label="Content">
                                    <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs text-foreground">
                                        {item.content}
                                    </pre>
                                </Section>
                            )}

                            {item.url && (
                                <Section label="Link">
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm break-all text-primary hover:underline"
                                    >
                                        {item.url}
                                    </a>
                                </Section>
                            )}

                            {item.fileName && (
                                <Section label="File">
                                    <p className="text-sm text-foreground">
                                        {item.fileUrl ? (
                                            <a
                                                href={item.fileUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-primary hover:underline"
                                            >
                                                {item.fileName}
                                            </a>
                                        ) : (
                                            item.fileName
                                        )}
                                        {item.fileSize != null && (
                                            <span className="text-muted-foreground">
                                                {" "}
                                                · {formatFileSize(item.fileSize)}
                                            </span>
                                        )}
                                    </p>
                                </Section>
                            )}

                            {item.tags.length > 0 && (
                                <Section label="Tags" icon={<Tag className="size-3.5" />}>
                                    <div className="flex flex-wrap gap-1">
                                        {item.tags.map((tag) => (
                                            <Badge key={tag} variant="secondary">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </Section>
                            )}

                            {item.collections.length > 0 && (
                                <Section
                                    label="Collections"
                                    icon={<FolderClosed className="size-3.5" />}
                                >
                                    <div className="flex flex-wrap gap-1">
                                        {item.collections.map((collection) => (
                                            <Link
                                                key={collection.id}
                                                href={`/collections/${collection.id}`}
                                                onClick={closeItem}
                                            >
                                                <Badge
                                                    variant="secondary"
                                                    className="hover:bg-secondary/60"
                                                >
                                                    {collection.name}
                                                </Badge>
                                            </Link>
                                        ))}
                                    </div>
                                </Section>
                            )}

                            <Section
                                label="Details"
                                icon={<Calendar className="size-3.5" />}
                            >
                                <dl className="flex flex-col gap-1.5 text-sm">
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-muted-foreground">Created</dt>
                                        <dd className="text-foreground">
                                            {formatLongDate(new Date(item.createdAt))}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-muted-foreground">Updated</dt>
                                        <dd className="text-foreground">
                                            {formatLongDate(new Date(item.updatedAt))}
                                        </dd>
                                    </div>
                                </dl>
                            </Section>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

function Section({
    label,
    icon,
    children,
}: {
    label: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                {icon}
                {label}
            </h3>
            {children}
        </section>
    );
}

function DrawerSkeleton() {
    return (
        <div className="flex h-full flex-col p-6">
            <SheetTitle className="sr-only">Loading item</SheetTitle>
            <div className="flex items-start gap-3">
                <div className="size-10 shrink-0 animate-pulse rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                </div>
            </div>
            <div className="mt-6 h-8 w-full animate-pulse rounded bg-muted" />
            <div className="mt-8 space-y-4">
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-24 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
        </div>
    );
}

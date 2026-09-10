"use client";

import Link from "next/link";
import { Calendar, Download, File as FileIcon, FolderClosed, Tag } from "lucide-react";

import { DrawerSection } from "@/components/items/DrawerSection";
import { ItemContentField } from "@/components/items/ItemContentField";
import { DRAWER_CODE_MAX_HEIGHT } from "@/components/items/item-form";
import type { ItemDetailPayload } from "@/components/items/use-item-detail";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatFileSize, formatLongDate } from "@/lib/utils";

/** Read-mode body of the item drawer: the sections that only show when viewing. */
export function ItemDetailView({ item }: { item: ItemDetailPayload }) {
    const typeName = item.itemType.name;

    return (
        <>
            {item.description && (
                <DrawerSection label="Description">
                    <p className="text-sm text-foreground">{item.description}</p>
                </DrawerSection>
            )}

            {item.content && (
                <DrawerSection label="Content">
                    <ItemContentField
                        typeName={typeName}
                        value={item.content}
                        language={item.language}
                        codeMaxHeight={DRAWER_CODE_MAX_HEIGHT}
                        readOnly
                    />
                </DrawerSection>
            )}

            {item.url && (
                <DrawerSection label="Link">
                    <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm break-all text-primary hover:underline"
                    >
                        {item.url}
                    </a>
                </DrawerSection>
            )}

            {item.fileUrl && <ItemFileSection item={item} />}

            {item.tags.length > 0 && (
                <DrawerSection label="Tags" icon={<Tag className="size-3.5" />}>
                    <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                </DrawerSection>
            )}
        </>
    );
}

function ItemFileSection({ item }: { item: ItemDetailPayload }) {
    const typeName = item.itemType.name;
    const isImage = typeName === "image";

    return (
        <DrawerSection label={isImage ? "Image" : "File"}>
            <div className="flex flex-col gap-3">
                {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={item.fileUrl ?? undefined}
                        alt={item.fileName ?? item.title}
                        className="max-h-80 w-full rounded-lg border border-border object-contain"
                    />
                ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                            <FileIcon className="size-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                                {item.fileName ?? "Download"}
                            </p>
                            {item.fileSize != null && (
                                <p className="text-xs text-muted-foreground">
                                    {formatFileSize(item.fileSize)}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-3">
                    <a
                        href={`/api/items/${item.id}/download`}
                        className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                        })}
                    >
                        <Download className="size-4" />
                        Download
                    </a>
                    {isImage && item.fileSize != null && (
                        <span className="text-xs text-muted-foreground">
                            {item.fileName ? `${item.fileName} · ` : ""}
                            {formatFileSize(item.fileSize)}
                        </span>
                    )}
                </div>
            </div>
        </DrawerSection>
    );
}

/**
 * Collection memberships and the created/updated timestamps. Shown in both the
 * read and edit views, so it lives outside {@link ItemDetailView}.
 */
export function ItemMetaSections({
    item,
    onNavigate,
}: {
    item: ItemDetailPayload;
    onNavigate: () => void;
}) {
    return (
        <>
            {item.collections.length > 0 && (
                <DrawerSection
                    label="Collections"
                    icon={<FolderClosed className="size-3.5" />}
                >
                    <div className="flex flex-wrap gap-1">
                        {item.collections.map((collection) => (
                            <Link
                                key={collection.id}
                                href={`/collections/${collection.id}`}
                                onClick={onNavigate}
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
                </DrawerSection>
            )}

            <DrawerSection label="Details" icon={<Calendar className="size-3.5" />}>
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
            </DrawerSection>
        </>
    );
}

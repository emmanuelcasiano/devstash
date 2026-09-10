"use client";

import { createElement } from "react";
import {
    Download,
    File as FileIcon,
    FileCode,
    FileJson,
    FileSpreadsheet,
    FileText,
    type LucideIcon,
} from "lucide-react";

import { useItemDrawer } from "@/components/items/item-drawer-provider";
import { buttonVariants } from "@/components/ui/button";
import type { ItemWithType } from "@/lib/db/items";
import { extensionOf } from "@/lib/validation/upload";
import { cn, formatFileSize, formatShortDate } from "@/lib/utils";

/** Maps a file extension to a Lucide glyph; anything unknown falls back to a plain file. */
const FILE_ICONS: Record<string, LucideIcon> = {
    ".pdf": FileText,
    ".txt": FileText,
    ".md": FileText,
    ".json": FileJson,
    ".xml": FileCode,
    ".yaml": FileCode,
    ".yml": FileCode,
    ".toml": FileCode,
    ".ini": FileCode,
    ".csv": FileSpreadsheet,
};

function fileIconFor(fileName: string): LucideIcon {
    return FILE_ICONS[extensionOf(fileName)] ?? FileIcon;
}

/**
 * A single row in the `/items/file` list view (Google Drive / Dropbox style).
 * The whole row opens the {@link ItemDrawer}; the trailing download button is a
 * real link to the streaming endpoint and stops propagation so it never also
 * opens the drawer.
 */
export function FileRow({ item }: { item: ItemWithType }) {
    const { openItem } = useItemDrawer();
    const name = item.fileName ?? item.title;
    const size = item.fileSize != null ? formatFileSize(item.fileSize) : null;
    const date = formatShortDate(item.createdAt);

    return (
        <div className="group relative flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50">
            {/* Row-wide click target; sits behind the download link. */}
            <button
                type="button"
                onClick={() => openItem(item.id)}
                aria-label={`Open ${name}`}
                className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            />

            {createElement(fileIconFor(name), {
                className:
                    "pointer-events-none relative z-10 size-5 shrink-0 text-muted-foreground",
            })}

            <div className="pointer-events-none relative z-10 min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                    {name}
                </p>
                <div className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                    {size ? `${size} · ${date}` : date}
                </div>
            </div>

            <span className="pointer-events-none relative z-10 hidden w-16 shrink-0 text-right text-xs text-muted-foreground sm:block">
                {size ?? "—"}
            </span>
            <span className="pointer-events-none relative z-10 hidden w-20 shrink-0 text-right text-xs text-muted-foreground sm:block">
                {date}
            </span>

            <a
                href={`/api/items/${item.id}/download`}
                onClick={(event) => event.stopPropagation()}
                aria-label={`Download ${name}`}
                className={cn(
                    buttonVariants({ variant: "ghost", size: "icon-sm" }),
                    "relative z-10 shrink-0",
                )}
            >
                <Download className="size-4" />
            </a>
        </div>
    );
}

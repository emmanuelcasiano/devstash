import {
    Code,
    Sparkles,
    Terminal,
    StickyNote,
    File,
    Image,
    Link,
    type LucideIcon,
} from "lucide-react";

export const ITEM_TYPE_ICONS: Record<string, LucideIcon> = {
    Code,
    Sparkles,
    Terminal,
    StickyNote,
    File,
    Image,
    Link,
};

export function getItemTypeIcon(iconName: string): LucideIcon {
    return ITEM_TYPE_ICONS[iconName] ?? Code;
}

export function getItemTypeSlug(name: string): string {
    return name.toLowerCase();
}

// Brand colors for the 7 system item types, keyed by lowercase name. These
// mirror the seeded `ItemType.color` values (see `prisma/seed.ts`) so client
// components that have no DB access can still tint a type icon exactly like the
// sidebar does.
export const ITEM_TYPE_COLORS: Record<string, string> = {
    snippet: "#3b82f6",
    prompt: "#8b5cf6",
    command: "#f97316",
    note: "#fde047",
    file: "#6b7280",
    image: "#ec4899",
    link: "#10b981",
};

export function getItemTypeColor(name: string): string {
    return ITEM_TYPE_COLORS[name.toLowerCase()] ?? "#6b7280";
}

// File and Image item types are Pro-only features.
export const PRO_ITEM_TYPES = new Set(["file", "image"]);

export function isProItemType(name: string): boolean {
    return PRO_ITEM_TYPES.has(name.toLowerCase());
}

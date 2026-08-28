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

// File and Image item types are Pro-only features.
export const PRO_ITEM_TYPES = new Set(["file", "image"]);

export function isProItemType(name: string): boolean {
    return PRO_ITEM_TYPES.has(name.toLowerCase());
}

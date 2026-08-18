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

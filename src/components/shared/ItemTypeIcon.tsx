import { getItemTypeIcon } from "@/lib/constants/item-types";

export function renderItemTypeIcon(iconName: string, className?: string, color?: string) {
    const Icon = getItemTypeIcon(iconName);
    return <Icon className={className} style={{ color }} />;
}

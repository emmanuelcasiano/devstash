import { createElement } from "react";

import { getItemTypeIcon } from "@/lib/constants/item-types";

interface ItemTypeIconProps {
    iconName: string;
    className?: string;
    color?: string;
}

export function ItemTypeIcon({ iconName, className, color }: ItemTypeIconProps) {
    const icon = getItemTypeIcon(iconName);
    return createElement(icon, { className, style: { color } });
}

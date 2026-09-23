import Link from "next/link";

import { ItemTypeIcon } from "@/components/shared/ItemTypeIcon";
import { buttonVariants } from "@/components/ui/button";
import { getItemTypeColor } from "@/lib/constants/item-types";
import { capitalize } from "@/lib/utils";

const TYPE_ICON_NAME: Record<"file" | "image", string> = {
    file: "File",
    image: "Image",
};

/**
 * Full-page "this is a Pro feature" block shown to Free users who visit
 * `/items/file` or `/items/image` directly, in place of the item list.
 */
export function ProFeatureUpgrade({ type }: { type: "file" | "image" }) {
    const label = capitalize(type);
    const color = getItemTypeColor(type);

    return (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border py-16 text-center">
            <div
                className="flex size-14 items-center justify-center rounded-full"
                style={{ backgroundColor: `${color}1a` }}
            >
                <ItemTypeIcon
                    iconName={TYPE_ICON_NAME[type]}
                    className="size-7"
                    color={color}
                />
            </div>
            <div className="flex flex-col gap-1">
                <h1 className="text-xl font-semibold text-foreground">
                    {label} uploads are a Pro feature
                </h1>
                <p className="max-w-sm text-sm text-muted-foreground">
                    Upgrade to DevStash Pro to store and organize{" "}
                    {type === "file" ? "files" : "images"}, plus get unlimited
                    items and collections.
                </p>
            </div>
            <Link href="/settings#billing" className={buttonVariants()}>
                Upgrade to Pro
            </Link>
        </div>
    );
}

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { FormNotice } from "@/components/ui/form-message";

/**
 * Small "you've hit a Free-plan limit" block with a link to the billing
 * settings. A plain `<Link>` styled with `buttonVariants` — not
 * `Button render={<Link/>}`, which trips a base-ui warning (see `FileRow`).
 */
export function UpgradeNotice({ message }: { message: string }) {
    return (
        <FormNotice className="flex flex-wrap items-center justify-between gap-2">
            <span>{message}</span>
            <Link
                href="/settings"
                className={buttonVariants({ size: "sm" })}
            >
                Upgrade to Pro
            </Link>
        </FormNotice>
    );
}

import Link from "next/link";
import { Layers } from "lucide-react";

export function HomeLogo({ href = "/" }: { href?: string }) {
    return (
        <Link href={href} className="inline-flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
                <Layers className="size-4 text-white" />
            </span>
            <span className="text-lg font-semibold tracking-tight">DevStash</span>
        </Link>
    );
}

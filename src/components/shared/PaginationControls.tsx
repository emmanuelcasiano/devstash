import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buildPageTokens } from "@/lib/pagination";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationControlsProps {
    basePath: string;
    currentPage: number;
    totalPages: number;
}

function pageHref(basePath: string, page: number): string {
    return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

const DISABLED_CLASSES = "pointer-events-none opacity-40";

export function PaginationControls({
    basePath,
    currentPage,
    totalPages,
}: PaginationControlsProps) {
    if (totalPages <= 1) return null;

    const tokens = buildPageTokens(currentPage, totalPages);
    const hasPrev = currentPage > 1;
    const hasNext = currentPage < totalPages;

    return (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
            {hasPrev ? (
                <Link
                    href={pageHref(basePath, currentPage - 1)}
                    aria-label="Previous page"
                    className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }))}
                >
                    <ChevronLeft />
                </Link>
            ) : (
                <span
                    aria-disabled="true"
                    className={cn(
                        buttonVariants({ variant: "outline", size: "icon-sm" }),
                        DISABLED_CLASSES,
                    )}
                >
                    <ChevronLeft />
                </span>
            )}

            {tokens.map((token, index) =>
                token === "ellipsis" ? (
                    <span
                        key={`ellipsis-${index}`}
                        className="px-1.5 text-sm text-muted-foreground select-none"
                    >
                        …
                    </span>
                ) : (
                    <Link
                        key={token}
                        href={pageHref(basePath, token)}
                        aria-current={token === currentPage ? "page" : undefined}
                        className={cn(
                            buttonVariants({
                                variant: token === currentPage ? "secondary" : "outline",
                                size: "icon-sm",
                            }),
                        )}
                    >
                        {token}
                    </Link>
                ),
            )}

            {hasNext ? (
                <Link
                    href={pageHref(basePath, currentPage + 1)}
                    aria-label="Next page"
                    className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }))}
                >
                    <ChevronRight />
                </Link>
            ) : (
                <span
                    aria-disabled="true"
                    className={cn(
                        buttonVariants({ variant: "outline", size: "icon-sm" }),
                        DISABLED_CLASSES,
                    )}
                >
                    <ChevronRight />
                </span>
            )}
        </nav>
    );
}

export interface PageRange {
    skip: number;
    take: number;
}

/**
 * Parses a raw `?page=` search-param value into a safe 1-based page number.
 * Anything missing, non-numeric, non-integer, or less than 1 falls back to 1.
 */
export function parsePageParam(value: string | string[] | undefined): number {
    const raw = Array.isArray(value) ? value[0] : value;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
        return 1;
    }
    return parsed;
}

/** Computes the Prisma `skip`/`take` pair for a 1-based page and page size. */
export function getPageRange(page: number, perPage: number): PageRange {
    return { skip: (page - 1) * perPage, take: perPage };
}

/** Computes the total number of pages for a result set, always at least 1. */
export function getTotalPages(totalCount: number, perPage: number): number {
    return Math.max(1, Math.ceil(totalCount / perPage));
}

/** Clamps a page number into the valid `[1, totalPages]` range. */
export function clampPage(page: number, totalPages: number): number {
    return Math.min(Math.max(page, 1), totalPages);
}

export type PageToken = number | "ellipsis";

const SIBLING_COUNT = 1;
const MIN_TOTAL_BEFORE_COLLAPSE = SIBLING_COUNT * 2 + 5;

/**
 * Builds the sequence of page-number tokens to render around the current
 * page, collapsing distant pages into `"ellipsis"` gaps once there are more
 * pages than fit comfortably, e.g. `[1, "ellipsis", 4, 5, 6, "ellipsis", 20]`.
 */
export function buildPageTokens(currentPage: number, totalPages: number): PageToken[] {
    if (totalPages <= MIN_TOTAL_BEFORE_COLLAPSE) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const leftSibling = Math.max(currentPage - SIBLING_COUNT, 1);
    const rightSibling = Math.min(currentPage + SIBLING_COUNT, totalPages);
    const showLeftEllipsis = leftSibling > 2;
    const showRightEllipsis = rightSibling < totalPages - 1;

    const tokens: PageToken[] = [1];

    if (showLeftEllipsis) {
        tokens.push("ellipsis");
    } else {
        for (let page = 2; page < leftSibling; page++) tokens.push(page);
    }

    for (let page = leftSibling; page <= rightSibling; page++) {
        if (page !== 1 && page !== totalPages) tokens.push(page);
    }

    if (showRightEllipsis) {
        tokens.push("ellipsis");
    } else {
        for (let page = rightSibling + 1; page < totalPages; page++) tokens.push(page);
    }

    tokens.push(totalPages);
    return tokens;
}

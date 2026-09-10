/**
 * Pure, dependency-free validation for file / image uploads. Kept out of the
 * upload API route so it can be unit tested without pulling in the AWS SDK,
 * Prisma, or the auth stack. Both the client (`FileUpload`) and the server
 * (`POST /api/upload`) run these checks.
 */

export const UPLOAD_KINDS = ["file", "image"] as const;

export type UploadKind = (typeof UPLOAD_KINDS)[number];

interface KindConstraints {
    /** Maximum accepted size, in bytes. */
    maxBytes: number;
    /** Lower-case file extensions, each including the leading dot. */
    extensions: readonly string[];
    /** Accepted MIME types. Browsers are inconsistent for text formats, so a
     *  blank / octet-stream / text-plain MIME is also allowed when the
     *  extension matches (see {@link validateUpload}). */
    mimeTypes: readonly string[];
}

const MB = 1024 * 1024;

export const UPLOAD_CONSTRAINTS: Record<UploadKind, KindConstraints> = {
    image: {
        maxBytes: 5 * MB,
        extensions: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
        mimeTypes: [
            "image/png",
            "image/jpeg",
            "image/gif",
            "image/webp",
            "image/svg+xml",
        ],
    },
    file: {
        maxBytes: 10 * MB,
        extensions: [
            ".pdf",
            ".txt",
            ".md",
            ".json",
            ".yaml",
            ".yml",
            ".xml",
            ".csv",
            ".toml",
            ".ini",
        ],
        mimeTypes: [
            "application/pdf",
            "text/plain",
            "text/markdown",
            "application/json",
            "application/x-yaml",
            "text/yaml",
            "application/xml",
            "text/xml",
            "text/csv",
            "application/toml",
        ],
    },
};

/** MIME values that browsers hand back when they can't identify a text format. */
const LENIENT_MIME_TYPES = new Set(["", "application/octet-stream", "text/plain"]);

export function isUploadKind(value: unknown): value is UploadKind {
    return (
        typeof value === "string" &&
        (UPLOAD_KINDS as readonly string[]).includes(value)
    );
}

/** Lower-cased extension of a filename, including the leading dot (`""` if none). */
export function extensionOf(fileName: string): string {
    const base = fileName.split(/[\\/]/).pop() ?? "";
    const dot = base.lastIndexOf(".");
    return dot > 0 ? base.slice(dot).toLowerCase() : "";
}

/**
 * Strips any directory portion and reduces a filename to a safe basename:
 * ASCII letters/digits/`.`/`_`/`-` are kept, runs of anything else collapse to
 * a single `-`. Falls back to `"file"` when nothing usable remains.
 */
export function sanitizeFileName(fileName: string): string {
    const base = (fileName.split(/[\\/]/).pop() ?? "").trim();
    const cleaned = base
        .replace(/[^A-Za-z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-");
    return cleaned.length > 0 ? cleaned : "file";
}

export type UploadValidationResult =
    | { ok: true }
    | { ok: false; error: string };

/**
 * Validates an upload candidate against the per-kind size, extension, and MIME
 * constraints. `size` is in bytes; `mimeType` may be `""` when the browser
 * couldn't determine it.
 */
export function validateUpload(input: {
    kind: string;
    fileName: string;
    mimeType: string;
    size: number;
}): UploadValidationResult {
    const { kind, fileName, mimeType, size } = input;

    if (!isUploadKind(kind)) {
        return { ok: false, error: "Unknown upload type." };
    }

    const constraints = UPLOAD_CONSTRAINTS[kind];

    if (!Number.isFinite(size) || size <= 0) {
        return { ok: false, error: "The file is empty." };
    }

    if (size > constraints.maxBytes) {
        const maxMb = Math.round(constraints.maxBytes / MB);
        return {
            ok: false,
            error: `${kind === "image" ? "Images" : "Files"} must be ${maxMb} MB or smaller.`,
        };
    }

    const extension = extensionOf(fileName);
    if (!constraints.extensions.includes(extension)) {
        return {
            ok: false,
            error: `Unsupported ${kind} type. Allowed: ${constraints.extensions.join(", ")}.`,
        };
    }

    const normalizedMime = mimeType.toLowerCase().split(";")[0].trim();
    const mimeAccepted =
        constraints.mimeTypes.includes(normalizedMime) ||
        LENIENT_MIME_TYPES.has(normalizedMime);
    if (!mimeAccepted) {
        return { ok: false, error: `Unsupported ${kind} type.` };
    }

    return { ok: true };
}

/** `accept` attribute value for a file input of the given kind. */
export function acceptAttribute(kind: UploadKind): string {
    return UPLOAD_CONSTRAINTS[kind].extensions.join(",");
}

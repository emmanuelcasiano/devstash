import { z } from "zod";

/**
 * Pure, dependency-free validation for the item drawer's edit mode. Kept out of
 * the `"use server"` action file so it can be unit tested without pulling in
 * Prisma or the auth stack.
 */

/** A free-text field that is optional and stored as `null` when blank. */
const optionalText = z
    .string()
    .nullish()
    .transform((value) => {
        const trimmed = (value ?? "").trim();
        return trimmed.length > 0 ? trimmed : null;
    });

/**
 * True for a syntactically valid absolute URL that uses the `http` or `https`
 * scheme. A bare `z.url()` only checks that `new URL()` parses, so it would
 * happily accept `javascript:` / `data:` URLs — which then get rendered into an
 * `<a href>` / `<img src>` in the item drawer. Restricting the scheme here keeps
 * that class of value out of the database entirely.
 */
function isHttpUrl(value: string): boolean {
    let parsed: URL;
    try {
        parsed = new URL(value);
    } catch {
        return false;
    }
    return parsed.protocol === "http:" || parsed.protocol === "https:";
}

/** Like {@link optionalText} but must be a valid http(s) URL when present. */
const optionalUrl = z
    .string()
    .nullish()
    .transform((value) => (value ?? "").trim())
    .refine((value) => value === "" || isHttpUrl(value), {
        message: "Enter a valid http(s) URL.",
    })
    .transform((value) => (value.length > 0 ? value : null));

/** Trimmed, non-empty, de-duplicated tag list with first-seen order preserved. */
const tagList = z
    .array(z.string())
    .default([])
    .transform((tags) => {
        const seen = new Set<string>();
        for (const tag of tags) {
            const trimmed = tag.trim();
            if (trimmed) seen.add(trimmed);
        }
        return [...seen];
    });

/**
 * De-duplicated list of collection ids to assign the item to. An empty list is
 * valid — an item does not have to belong to any collection. Ownership of each
 * id is enforced separately by the `src/lib/db/items.ts` queries, which drop
 * any id that does not belong to the current user before writing.
 */
const collectionIdList = z
    .array(z.string())
    .default([])
    .transform((ids) => [...new Set(ids)]);

export const updateItemSchema = z.object({
    title: z.string().trim().min(1, "Title is required."),
    description: optionalText,
    content: optionalText,
    url: optionalUrl,
    language: optionalText,
    tags: tagList,
    collectionIds: collectionIdList,
});

/** The normalized payload after {@link updateItemSchema} has parsed the input. */
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

/**
 * The item types that can be created from the "New Item" dialog. File and Image
 * take an uploaded file instead of text content; the dialog swaps in the
 * `FileUpload` control for them.
 */
export const CREATE_ITEM_TYPES = [
    "snippet",
    "prompt",
    "command",
    "note",
    "link",
    "file",
    "image",
] as const;

export type CreateItemType = (typeof CREATE_ITEM_TYPES)[number];

/** Types whose content is an uploaded object in R2 rather than text or a URL. */
export const FILE_ITEM_TYPES = ["file", "image"] as const;

export function isFileItemType(type: string): boolean {
    return (FILE_ITEM_TYPES as readonly string[]).includes(type);
}

/** Types whose content is authored as text (a textarea / code / markdown editor). */
export const CONTENT_ITEM_TYPES = [
    "snippet",
    "prompt",
    "command",
    "note",
] as const;

export function isContentItemType(type: string): boolean {
    return (CONTENT_ITEM_TYPES as readonly string[]).includes(type);
}

/** Types that also carry a free-text `language` for syntax highlighting. */
export const LANGUAGE_ITEM_TYPES = ["snippet", "command"] as const;

export function isLanguageItemType(type: string): boolean {
    return (LANGUAGE_ITEM_TYPES as readonly string[]).includes(type);
}

/**
 * Forces the fields that don't apply to an item's type to `null` before a
 * write: a `link` keeps only `url`; `file` / `image` keep none of the three; any
 * text type keeps `content` / `language` but never `url`. Shared by the
 * `createItem` and `updateItem` queries so both stay in step; kept here (pure,
 * Prisma-free) so it can be unit tested.
 */
export function contentFieldsForType(
    typeName: string,
    data: { content: string | null; url: string | null; language: string | null },
): { content: string | null; url: string | null; language: string | null } {
    const isLink = typeName === "link";
    const isFile = isFileItemType(typeName);
    return {
        content: isLink || isFile ? null : data.content,
        url: isLink ? data.url : null,
        language: isLink || isFile ? null : data.language,
    };
}

/** A non-negative integer byte count, or `null` when absent. */
const optionalFileSize = z
    .number()
    .int()
    .positive()
    .nullish()
    .transform((value) => value ?? null);

export const createItemSchema = z
    .object({
        type: z.enum(CREATE_ITEM_TYPES, {
            message: "Choose an item type.",
        }),
        title: z.string().trim().min(1, "Title is required."),
        description: optionalText,
        content: optionalText,
        url: optionalUrl,
        language: optionalText,
        tags: tagList,
        collectionIds: collectionIdList,
        fileUrl: optionalUrl,
        fileName: optionalText,
        fileSize: optionalFileSize,
    })
    .refine((data) => data.type !== "link" || data.url !== null, {
        message: "URL is required for links.",
        path: ["url"],
    })
    .refine(
        (data) =>
            !isFileItemType(data.type) ||
            (data.fileUrl !== null &&
                data.fileName !== null &&
                data.fileSize !== null),
        {
            message: "Upload a file first.",
            path: ["fileUrl"],
        },
    );

/** The normalized payload after {@link createItemSchema} has parsed the input. */
export type CreateItemInput = z.infer<typeof createItemSchema>;

/**
 * Splits the drawer's comma-separated tag input into a clean list: trimmed,
 * non-empty, de-duplicated, order preserved.
 */
export function parseTagsInput(raw: string): string[] {
    const seen = new Set<string>();
    for (const part of raw.split(",")) {
        const trimmed = part.trim();
        if (trimmed) seen.add(trimmed);
    }
    return [...seen];
}

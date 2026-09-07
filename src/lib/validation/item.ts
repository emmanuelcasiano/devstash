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

/** Like {@link optionalText} but must be a valid URL when present. */
const optionalUrl = z
    .string()
    .nullish()
    .transform((value) => (value ?? "").trim())
    .refine((value) => value === "" || z.url().safeParse(value).success, {
        message: "Enter a valid URL.",
    })
    .transform((value) => (value.length > 0 ? value : null));

export const updateItemSchema = z.object({
    title: z.string().trim().min(1, "Title is required."),
    description: optionalText,
    content: optionalText,
    url: optionalUrl,
    language: optionalText,
    tags: z
        .array(z.string())
        .default([])
        .transform((tags) => {
            const seen = new Set<string>();
            for (const tag of tags) {
                const trimmed = tag.trim();
                if (trimmed) seen.add(trimmed);
            }
            return [...seen];
        }),
});

/** The normalized payload after {@link updateItemSchema} has parsed the input. */
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

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

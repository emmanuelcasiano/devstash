import { z } from "zod";

/**
 * Pure, dependency-free validation for creating a collection from the top-bar
 * "New Collection" dialog. Kept out of the `"use server"` action file so it can
 * be unit tested without pulling in Prisma or the auth stack, mirroring
 * `src/lib/validation/item.ts`.
 */

/** A free-text field that is optional and stored as `null` when blank. */
const optionalText = z
    .string()
    .nullish()
    .transform((value) => {
        const trimmed = (value ?? "").trim();
        return trimmed.length > 0 ? trimmed : null;
    });

export const createCollectionSchema = z.object({
    name: z.string().trim().min(1, "Name is required."),
    description: optionalText,
});

/** The normalized payload after {@link createCollectionSchema} has parsed the input. */
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

/** Editing a collection's metadata shares the same shape as creating one. */
export const updateCollectionSchema = createCollectionSchema;

/** The normalized payload after {@link updateCollectionSchema} has parsed the input. */
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;

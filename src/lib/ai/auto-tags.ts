import { z } from "zod";

/**
 * Pure, Prisma/auth/Gemini-free logic for the AI auto-tag suggestion feature —
 * kept out of `src/actions/ai.ts` so it can be unit tested without pulling in
 * `src/lib/prisma.ts` (which throws at import time under Vitest without
 * `DATABASE_URL`). Establishes the model/constant conventions the next AI
 * feature reuses.
 */

/** Google's cheapest, fastest current model — plenty for a short tag list. */
export const AI_MODEL = "gemini-3.5-flash-lite";

/** Caps output length; a tag-suggestion response is a handful of short words. */
export const AUTO_TAG_MAX_OUTPUT_TOKENS = 200;

/** Hard cap on how much item content is sent per call. */
export const AUTO_TAG_CONTENT_LIMIT = 2000;

/** The raw `{ title, content }` payload the client sends to `generateAutoTags`. */
export const generateAutoTagsInputSchema = z.object({
    title: z.string().trim().min(1, "Title is required."),
    content: z
        .string()
        .nullish()
        .transform((value) => (value ?? "").trim()),
});

export type GenerateAutoTagsInput = z.infer<typeof generateAutoTagsInputSchema>;

/**
 * Gemini's structured-output schema for the tag list, passed to
 * `responseJsonSchema` via Zod v4's native `.toJSONSchema()` export and reused
 * to re-validate `response.text` on the way back (the SDK never hands back a
 * pre-parsed, schema-typed object — see `src/actions/ai.ts`).
 */
export const tagSuggestionSchema = z.object({
    tags: z.array(z.string().trim().min(1).max(30)).min(1).max(8),
});

/** Truncates item content before it's sent to Gemini, per the feature spec. */
export function truncateAutoTagContent(content: string): string {
    return content.length > AUTO_TAG_CONTENT_LIMIT
        ? content.slice(0, AUTO_TAG_CONTENT_LIMIT)
        : content;
}

/** Combines the title and (already-truncated) content into the model prompt. */
export function buildAutoTagPrompt(title: string, content: string): string {
    return content ? `Title: ${title}\n\n${content}` : `Title: ${title}`;
}

/**
 * Parses and validates Gemini's raw JSON string response into a clean tag list:
 * lowercased and de-duplicated. The model may return `{"tags": [...]}` **or** a
 * bare `[...]` array depending on prompt phrasing, so a bare array is normalized
 * into the object shape before validating. Returns `null` for malformed JSON,
 * a schema mismatch, or an empty result — the caller treats that as a failure.
 */
export function parseTagSuggestions(rawText: string): string[] | null {
    let raw: unknown;
    try {
        raw = JSON.parse(rawText);
    } catch {
        return null;
    }

    const candidate = Array.isArray(raw) ? { tags: raw } : raw;
    const parsed = tagSuggestionSchema.safeParse(candidate);
    if (!parsed.success) return null;

    const seen = new Set<string>();
    for (const tag of parsed.data.tags) {
        const lower = tag.trim().toLowerCase();
        if (lower) seen.add(lower);
    }

    return seen.size > 0 ? [...seen] : null;
}

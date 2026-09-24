import { z } from "zod";

/**
 * Pure, Prisma/auth/Gemini-free logic for the AI description-generation
 * feature — kept out of `src/actions/ai.ts` so it can be unit tested without
 * pulling in `src/lib/prisma.ts` (which throws at import time under Vitest
 * without `DATABASE_URL`). Mirrors the shape `src/lib/ai/auto-tags.ts`
 * established for the first AI feature; reuses its `AI_MODEL` constant.
 */

/** Caps output length; a 1-2 sentence description is short. */
export const DESCRIBE_MAX_OUTPUT_TOKENS = 150;

/** Hard cap on how much item content is sent per call. */
export const DESCRIBE_CONTENT_LIMIT = 2000;

/**
 * The raw form-field payload the client sends to `generateDescription`. Every
 * field is optional since which ones are populated depends on the item type
 * (content/language for snippet/command, url for link, fileName for
 * file/image) — at least one of title/content/url/fileName must be present,
 * or there's nothing for the model to summarize.
 */
export const generateDescriptionInputSchema = z
    .object({
        title: z
            .string()
            .nullish()
            .transform((value) => (value ?? "").trim()),
        content: z
            .string()
            .nullish()
            .transform((value) => (value ?? "").trim()),
        url: z
            .string()
            .nullish()
            .transform((value) => (value ?? "").trim()),
        fileName: z
            .string()
            .nullish()
            .transform((value) => (value ?? "").trim()),
        language: z
            .string()
            .nullish()
            .transform((value) => (value ?? "").trim()),
    })
    .refine(
        (data) =>
            data.title !== "" ||
            data.content !== "" ||
            data.url !== "" ||
            data.fileName !== "",
        { message: "Add a title or some content first." },
    );

export type GenerateDescriptionInput = z.infer<
    typeof generateDescriptionInputSchema
>;

/**
 * Gemini's structured-output schema for the description, passed to
 * `responseJsonSchema` via Zod v4's native `.toJSONSchema()` export and reused
 * to re-validate `response.text` on the way back — same pattern as
 * `tagSuggestionSchema` in `auto-tags.ts`.
 */
export const descriptionSuggestionSchema = z.object({
    description: z.string().trim().min(1).max(300),
});

/** Truncates item content before it's sent to Gemini, per the feature spec. */
export function truncateDescribeContent(content: string): string {
    return content.length > DESCRIBE_CONTENT_LIMIT
        ? content.slice(0, DESCRIBE_CONTENT_LIMIT)
        : content;
}

/**
 * Combines whichever fields are populated into the model prompt. Content is
 * expected to already be truncated by the caller (via
 * `truncateDescribeContent`).
 */
export function buildDescribePrompt(input: {
    title: string;
    content: string;
    url: string;
    fileName: string;
    language: string;
}): string {
    const lines: string[] = [];
    if (input.title) lines.push(`Title: ${input.title}`);
    if (input.language) lines.push(`Language: ${input.language}`);
    if (input.url) lines.push(`URL: ${input.url}`);
    if (input.fileName) lines.push(`File name: ${input.fileName}`);
    if (input.content) lines.push(`Content:\n${input.content}`);
    return lines.join("\n\n");
}

/**
 * Parses and validates Gemini's raw JSON string response into a clean
 * description string. Returns `null` for malformed JSON, a schema mismatch,
 * or a blank result — the caller treats that as a failure.
 */
export function parseDescriptionSuggestion(rawText: string): string | null {
    let raw: unknown;
    try {
        raw = JSON.parse(rawText);
    } catch {
        return null;
    }

    const parsed = descriptionSuggestionSchema.safeParse(raw);
    if (!parsed.success) return null;

    const description = parsed.data.description.trim();
    return description.length > 0 ? description : null;
}

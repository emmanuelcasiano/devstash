import { z } from "zod";

/**
 * Pure, Prisma/auth/Gemini-free logic for the AI code-explanation feature —
 * kept out of `src/actions/ai.ts` so it can be unit tested without pulling in
 * `src/lib/prisma.ts` (which throws at import time under Vitest without
 * `DATABASE_URL`). Mirrors the shape `src/lib/ai/auto-tags.ts` established for
 * the first AI feature; reuses its `AI_MODEL` constant.
 */

/** Caps output length; a ~200-300 word Markdown explanation needs more room than the tag/description features. */
export const EXPLAIN_MAX_OUTPUT_TOKENS = 700;

/** Hard cap on how much item content is sent per call. */
export const EXPLAIN_CONTENT_LIMIT = 2000;

/** Explanation only adds value for actual code and terminal commands. */
export const EXPLAIN_ITEM_TYPES = ["snippet", "command"] as const;
export type ExplainItemType = (typeof EXPLAIN_ITEM_TYPES)[number];

/**
 * The raw `{ title, content, language, typeName }` payload the client sends to
 * `explainCode`. Runs against whatever's currently loaded in the item drawer —
 * there's no server-side item lookup, matching `generateAutoTags` /
 * `generateDescription`.
 */
export const explainCodeInputSchema = z.object({
    title: z
        .string()
        .nullish()
        .transform((value) => (value ?? "").trim()),
    content: z.string().trim().min(1, "There's no content to explain."),
    language: z
        .string()
        .nullish()
        .transform((value) => (value ?? "").trim()),
    typeName: z.enum(EXPLAIN_ITEM_TYPES),
});

export type ExplainCodeInput = z.infer<typeof explainCodeInputSchema>;

/**
 * Gemini's structured-output schema for the explanation, passed to
 * `responseJsonSchema` via Zod v4's native `.toJSONSchema()` export and reused
 * to re-validate `response.text` on the way back — same pattern as
 * `tagSuggestionSchema` / `descriptionSuggestionSchema`.
 */
export const explanationSuggestionSchema = z.object({
    explanation: z.string().trim().min(1).max(4000),
});

/** Truncates item content before it's sent to Gemini, per the feature spec. */
export function truncateExplainContent(content: string): string {
    return content.length > EXPLAIN_CONTENT_LIMIT
        ? content.slice(0, EXPLAIN_CONTENT_LIMIT)
        : content;
}

/**
 * Combines the title/type/language and (already-truncated) content into the
 * model prompt.
 */
export function buildExplainPrompt(input: {
    title: string;
    content: string;
    language: string;
    typeName: ExplainItemType;
}): string {
    const lines: string[] = [];
    if (input.title) lines.push(`Title: ${input.title}`);
    lines.push(
        `Type: ${
            input.typeName === "command" ? "Terminal command" : "Code snippet"
        }`,
    );
    if (input.language) lines.push(`Language: ${input.language}`);
    lines.push(`Content:\n${input.content}`);
    return lines.join("\n\n");
}

/**
 * Parses and validates Gemini's raw JSON string response into a clean,
 * trimmed Markdown explanation. Returns `null` for malformed JSON, a schema
 * mismatch, or a blank result — the caller treats that as a failure.
 */
export function parseExplanation(rawText: string): string | null {
    let raw: unknown;
    try {
        raw = JSON.parse(rawText);
    } catch {
        return null;
    }

    const parsed = explanationSuggestionSchema.safeParse(raw);
    if (!parsed.success) return null;

    const explanation = parsed.data.explanation.trim();
    return explanation.length > 0 ? explanation : null;
}

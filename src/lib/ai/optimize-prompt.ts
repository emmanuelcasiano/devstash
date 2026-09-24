import { z } from "zod";

/**
 * Pure, Prisma/auth/Gemini-free logic for the AI prompt-optimization
 * feature — kept out of `src/actions/ai.ts` so it can be unit tested without
 * pulling in `src/lib/prisma.ts` (which throws at import time under Vitest
 * without `DATABASE_URL`). Mirrors the shape `src/lib/ai/explain.ts`
 * established; reuses `AI_MODEL` from `auto-tags.ts`.
 */

/** Caps output length; an optimized prompt can run longer than a short explanation. */
export const OPTIMIZE_PROMPT_MAX_OUTPUT_TOKENS = 800;

/** Hard cap on how much prompt content is sent per call. */
export const OPTIMIZE_PROMPT_CONTENT_LIMIT = 4000;

/**
 * The raw `{ title, content }` payload the client sends to `optimizePrompt`.
 * Runs against whatever's currently staged in the create/edit form — no
 * server-side item lookup, matching `explainCode` / `generateDescription`.
 */
export const optimizePromptInputSchema = z.object({
    title: z
        .string()
        .nullish()
        .transform((value) => (value ?? "").trim()),
    content: z.string().trim().min(1, "There's no prompt to optimize."),
});

export type OptimizePromptInput = z.infer<typeof optimizePromptInputSchema>;

/**
 * Gemini's structured-output schema for the optimized prompt, passed to
 * `responseJsonSchema` via Zod v4's native `.toJSONSchema()` export and reused
 * to re-validate `response.text` on the way back — same pattern as
 * `explanationSuggestionSchema`.
 */
export const optimizedPromptSuggestionSchema = z.object({
    prompt: z.string().trim().min(1).max(6000),
});

/** Truncates prompt content before it's sent to Gemini, per the feature spec. */
export function truncateOptimizePromptContent(content: string): string {
    return content.length > OPTIMIZE_PROMPT_CONTENT_LIMIT
        ? content.slice(0, OPTIMIZE_PROMPT_CONTENT_LIMIT)
        : content;
}

/**
 * Combines the title and (already-truncated) prompt content into the model
 * prompt.
 */
export function buildOptimizePromptPrompt(input: {
    title: string;
    content: string;
}): string {
    const lines: string[] = [];
    if (input.title) lines.push(`Title: ${input.title}`);
    lines.push(`Prompt:\n${input.content}`);
    return lines.join("\n\n");
}

/**
 * Parses and validates Gemini's raw JSON string response into a clean,
 * trimmed optimized prompt. Returns `null` for malformed JSON, a schema
 * mismatch, or a blank result — the caller treats that as a failure.
 */
export function parseOptimizedPrompt(rawText: string): string | null {
    let raw: unknown;
    try {
        raw = JSON.parse(rawText);
    } catch {
        return null;
    }

    const parsed = optimizedPromptSuggestionSchema.safeParse(raw);
    if (!parsed.success) return null;

    const prompt = parsed.data.prompt.trim();
    return prompt.length > 0 ? prompt : null;
}

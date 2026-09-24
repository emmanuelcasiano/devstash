"use server";

import { ApiError } from "@google/genai";

import {
    GENERIC_ERROR,
    requireUserId,
    zodMessage,
    type ActionResult,
} from "@/actions/shared";
import {
    AI_MODEL,
    AUTO_TAG_MAX_OUTPUT_TOKENS,
    buildAutoTagPrompt,
    generateAutoTagsInputSchema,
    parseTagSuggestions,
    tagSuggestionSchema,
    truncateAutoTagContent,
} from "@/lib/ai/auto-tags";
import {
    DESCRIBE_MAX_OUTPUT_TOKENS,
    buildDescribePrompt,
    descriptionSuggestionSchema,
    generateDescriptionInputSchema,
    parseDescriptionSuggestion,
    truncateDescribeContent,
} from "@/lib/ai/describe";
import { hasProAccess } from "@/lib/billing/plans";
import { getCurrentUserIsPro } from "@/lib/db/current-user";
import { getGemini, isGeminiConfigured } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rate-limit";

const AI_UNAVAILABLE_ERROR = "AI features aren't available right now.";
const AI_PRO_ONLY_ERROR = "AI tag suggestions are a Pro feature. Upgrade to use them.";
const AI_DESCRIBE_PRO_ONLY_ERROR =
    "AI description generation is a Pro feature. Upgrade to use it.";
const AI_RATE_LIMIT_ERROR = "Too many AI requests. Please wait a bit and try again.";

/**
 * Suggests 3-5 freeform tags for an item's title/content via Gemini
 * (`gemini-3.5-flash-lite`), for the "Suggest Tags" button in the create item
 * dialog and the item drawer's edit mode.
 *
 * Runs against whatever text the client currently has staged in its form —
 * not a stored item — since the create dialog has no item id yet. This is the
 * same shape as every other Server Action in the project (`requireUserId` →
 * validate/gate → try/catch the external call → `ActionResult<T>`), with the
 * Pro gate and rate limit checked before the Gemini call so a Free user or a
 * client past its hourly allowance never reaches the API.
 */
export async function generateAutoTags(
    input: unknown,
): Promise<ActionResult<{ tags: string[] }>> {
    const user = await requireUserId("use AI tag suggestions");
    if ("error" in user) return { success: false, error: user.error };

    const parsed = generateAutoTagsInputSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: zodMessage(parsed.error) };
    }

    if (!hasProAccess(await getCurrentUserIsPro())) {
        return { success: false, error: AI_PRO_ONLY_ERROR };
    }
    if (!isGeminiConfigured()) {
        return { success: false, error: AI_UNAVAILABLE_ERROR };
    }

    const limit = await checkRateLimit("aiAutoTag", user.userId);
    if (!limit.success) {
        return { success: false, error: AI_RATE_LIMIT_ERROR };
    }

    const content = truncateAutoTagContent(parsed.data.content);

    try {
        const response = await getGemini().models.generateContent({
            model: AI_MODEL,
            contents: buildAutoTagPrompt(parsed.data.title, content),
            config: {
                systemInstruction:
                    "Suggest 3-5 short, lowercase, freeform tags for the given developer content (a code snippet, prompt, command, or note). Respond with tags only, no explanations.",
                maxOutputTokens: AUTO_TAG_MAX_OUTPUT_TOKENS,
                // `thinkingConfig: { thinkingBudget: 0 }` was tried here (per the
                // feature spec's suggestion) but gemini-3.5-flash-lite rejects it
                // with a hard 400 INVALID_ARGUMENT rather than treating it as a
                // no-op — confirmed empirically against the real API. Omitted.
                responseMimeType: "application/json",
                responseJsonSchema: tagSuggestionSchema.toJSONSchema(),
            },
        });

        if (!response.text) {
            return { success: false, error: GENERIC_ERROR };
        }

        const tags = parseTagSuggestions(response.text);
        if (!tags) {
            return { success: false, error: GENERIC_ERROR };
        }

        return { success: true, data: { tags } };
    } catch (error) {
        if (error instanceof ApiError && error.status === 429) {
            return { success: false, error: AI_RATE_LIMIT_ERROR };
        }
        console.error("AI auto-tag generation failed:", error);
        return { success: false, error: GENERIC_ERROR };
    }
}

/**
 * Generates a concise 1-2 sentence description/summary for the "Generate
 * description" button beside the Description field in the create item dialog
 * and the item drawer's edit mode.
 *
 * Like `generateAutoTags`, this runs against whatever the client currently
 * has staged in its form — title, content, url, file name, language — not a
 * stored item, so it works before the item is ever saved and for every item
 * type (file/image items have no content/url, so they fall back to title +
 * file name).
 */
export async function generateDescription(
    input: unknown,
): Promise<ActionResult<{ description: string }>> {
    const user = await requireUserId("generate an AI description");
    if ("error" in user) return { success: false, error: user.error };

    const parsed = generateDescriptionInputSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: zodMessage(parsed.error) };
    }

    if (!hasProAccess(await getCurrentUserIsPro())) {
        return { success: false, error: AI_DESCRIBE_PRO_ONLY_ERROR };
    }
    if (!isGeminiConfigured()) {
        return { success: false, error: AI_UNAVAILABLE_ERROR };
    }

    const limit = await checkRateLimit("aiDescribe", user.userId);
    if (!limit.success) {
        return { success: false, error: AI_RATE_LIMIT_ERROR };
    }

    const content = truncateDescribeContent(parsed.data.content);

    try {
        const response = await getGemini().models.generateContent({
            model: AI_MODEL,
            contents: buildDescribePrompt({ ...parsed.data, content }),
            config: {
                systemInstruction:
                    "Write a concise 1-2 sentence description summarizing the given developer content (a code snippet, prompt, command, note, link, or file). Respond with the description only, no explanations, no surrounding quotes.",
                maxOutputTokens: DESCRIBE_MAX_OUTPUT_TOKENS,
                responseMimeType: "application/json",
                responseJsonSchema: descriptionSuggestionSchema.toJSONSchema(),
            },
        });

        if (!response.text) {
            return { success: false, error: GENERIC_ERROR };
        }

        const description = parseDescriptionSuggestion(response.text);
        if (!description) {
            return { success: false, error: GENERIC_ERROR };
        }

        return { success: true, data: { description } };
    } catch (error) {
        if (error instanceof ApiError && error.status === 429) {
            return { success: false, error: AI_RATE_LIMIT_ERROR };
        }
        console.error("AI description generation failed:", error);
        return { success: false, error: GENERIC_ERROR };
    }
}

import { GoogleGenAI } from "@google/genai";

/**
 * Lazy Gemini client, mirroring the `src/lib/stripe.ts` / `src/lib/r2.ts`
 * pattern: cached on `globalThis` (so a `next dev` HMR reload doesn't create a
 * new client every time), with a companion `isGeminiConfigured()` callers check
 * before touching the client so AI features degrade gracefully when the API key
 * is unset instead of throwing.
 */

export function isGeminiConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY);
}

const globalForGemini = globalThis as unknown as { geminiClient?: GoogleGenAI };

export function getGemini(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set.");
    }

    if (!globalForGemini.geminiClient) {
        globalForGemini.geminiClient = new GoogleGenAI({ apiKey });
    }

    return globalForGemini.geminiClient;
}

# AI Auto-Tagging

## Overview

Add AI-powered tag suggestions for items using the Google Gemini "gemini-3.5-flash-lite" model. Users click a "Suggest Tags" button in the tags area, and the AI returns 3-5 freeform tag suggestions based on the item's title and content. Each suggestion has accept/reject controls. Pro-only feature with both UI-level and server-side gating. If this is the first AI feature implemented, it also establishes the Gemini foundation (client, server action, rate limit config) for subsequent AI features.

## Requirements

- Create Gemini client utility with `AI_MODEL` constant (if not already created by a prior AI feature)
- Use the standard `@google/genai` SDK and keep it simple
- Create `generateAutoTags` server action with auth, Pro gating, Zod validation, rate limiting
- Add AI rate limit config (20 requests/hour per user) to existing rate limit utility (if not already added)
- Add "Suggest Tags" button (Sparkles icon, ghost variant) near the tags input in create item dialog and item drawer edit mode
- Display suggested tags as badges with accept (check) and reject (X) controls per tag
- Accepted tags get added to the item's tag list
- Tags are freeform (not limited to existing tags in the database)
- Truncate content to 2000 chars before API call
- Hide the Suggest Tags button for free users (Pro-only UI gating)
- Error handling via toast (Pro gating, rate limit, AI service errors)
- Follow existing patterns
- Unit tests for server action

## CRITICAL: Gemini SDK & gemini-3.5-flash-lite gotchas

The `@google/genai` npm package is the **only current, GA** JS/TS SDK for the Gemini API — do not install the older `@google/generative-ai` package, which was end-of-lifed November 30, 2025 and still shows up in outdated tutorials.

### Use `responseJsonSchema` for structured output (NOT `responseSchema`)

Gemini supports two competing shapes for constrained JSON output. Use `responseJsonSchema` with a Zod v4 schema's **native** `.toJSONSchema()` export — no `zod-to-json-schema` package needed, since `zod` is already a project dependency at v4.

```typescript
// CORRECT — responseJsonSchema + Zod v4 native JSON Schema export
import { z } from "zod";

const TagSuggestionSchema = z.object({
  tags: z.array(z.string().min(1).max(30)).min(1).max(8),
});

const response = await client.models.generateContent({
  model: "gemini-3.5-flash-lite",
  contents: `Title: ...\n\n...`,
  config: {
    systemInstruction: "Suggest 3-5 short, lowercase tags...",
    responseMimeType: "application/json",
    responseJsonSchema: TagSuggestionSchema.toJSONSchema(),
    thinkingConfig: { thinkingBudget: 0 },
  },
});

const text = response.text; // <-- always a raw JSON STRING, not pre-parsed
```

### `response.text` is a raw JSON string — always parse AND re-validate

Unlike some other providers' structured-output helpers, the Gen AI SDK does **not** hand back a pre-parsed, schema-typed object. `response.text` is always a string, even under a `responseJsonSchema` constraint:

```typescript
if (!response.text) {
  // handle empty response
}

const parsed = TagSuggestionSchema.safeParse(JSON.parse(response.text));
if (!parsed.success) {
  // handle malformed/truncated JSON — rare under schema constraint, but possible
  // (e.g. output cut off at maxOutputTokens)
}
```

### Other gotchas

- `maxOutputTokens` (not `max_tokens`/`max_completion_tokens`) caps output length; keep it small (e.g. 200) for a tag-suggestion response.
- Set `thinkingConfig: { thinkingBudget: 0 }` to skip Gemini's internal reasoning pass — tag suggestion is not a multi-step reasoning task, and thinking tokens bill as output tokens. Verify empirically that Flash-Lite accepts this field; if not supported it should be a harmless no-op, not an error.
- The model may return `{"tags": ["a", "b"]}` OR `["a", "b"]` depending on prompt phrasing — the Zod schema above expects the object form; if the raw response is a bare array instead, normalize it to `{ tags: [...] }` before validating.
- Always normalize tags to lowercase after receiving them.
- The SDK throws a single `ApiError` class (with a `status` code) rather than a family of typed error subclasses — check `error.status === 429` for rate-limit responses from Google's side.
- The SDK already retries transient failures (408/429/5xx) internally with exponential backoff — no need to hand-roll retry logic in the action.

## Notes

- `GEMINI_API_KEY` already in `.env`
- `isPro` is available server-side via session but not passed to create/edit UI components — use server-side gating for enforcement, UI gating for button visibility requires passing `isPro` as a prop or fetching it client-side
- See `docs/ai-integration-plan-google.md` for full architectural context

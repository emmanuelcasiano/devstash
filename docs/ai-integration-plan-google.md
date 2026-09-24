# AI Integration Research: Google Gemini API in DevStash

> Research only — nothing in this document is built. It investigates how to wire
> the **Google Gen AI SDK** (`@google/genai`) into DevStash for the four Pro AI
> features named in `context/project-overview.md`: auto-tag suggestions, AI
> summaries, "Explain This Code," and the prompt optimizer. Grounded in the code
> as it exists today (Server Action `{ success, data, error }` contract,
> `src/lib/billing/plans.ts` Pro gating, Upstash rate limiting, the lazy-client
> pattern used by `src/lib/stripe.ts` / `src/lib/r2.ts`) and in Google's official
> documentation as of September 2026.

Source prompt: [`context/research/ai-integration-research-google.md`](../context/research/ai-integration-research-google.md)

A parallel research pass exists for OpenAI's `gpt-5-nano`:
[`docs/ai-integration-plan.md`](./ai-integration-plan.md). The two documents
make the same architectural choices (Server Actions, staged suggest/accept UI,
Pro-only gating, per-feature rate limits) so a provider swap is mostly a file
swap, not a redesign — the sections below call out the handful of places where
Gemini's SDK genuinely works differently from OpenAI's.

---

## 1. Summary of recommendations

| Concern | Recommendation |
| --- | --- |
| Provider surface | **Gemini Developer API** (the `apiKey`-based, Google-AI-Studio-issued path), not Vertex AI. Vertex AI needs a GCP project, IAM, and `gcloud` auth — overkill for four text-only features and a mismatch for the single-env-var pattern every other integration in this repo uses. |
| SDK | Official `@google/genai` npm package — the **only current, GA, non-deprecated** JS/TS SDK. The older `@google/generative-ai` package was end-of-lifed November 30, 2025; do not install it even though older tutorials still reference it. |
| Client setup | `src/lib/gemini.ts` — a lazy client cached on `globalThis`, mirroring `src/lib/stripe.ts` / `src/lib/r2.ts` exactly. `isGeminiConfigured()` companion, same shape as `isStripeConfigured()`. |
| Model | One constant, `AI_MODEL = "gemini-3.5-flash-lite"`, defined in a single file (`src/lib/ai/models.ts`) so a future model swap is a one-line change. It's Google's cheapest, fastest current model and carries a genuine free tier — confirm the exact id against `aistudio.google.com` at build time, since Google's Flash line has moved fast (2.5 → 3.5/3.6/3.7/3.8 across 2026) and access to older tiers is now restricted to accounts that already used them. |
| Structured features (tagging) | `responseMimeType: "application/json"` + `responseJsonSchema: schema.toJSONSchema()` (Zod v4's **native** JSON Schema export — already a dependency, no `zod-to-json-schema` package needed) in `generateContent`'s `config`. Gemini's controlled generation constrains the output at decode time, but the response still comes back as a JSON **string** (`response.text`), not a pre-parsed object like OpenAI's `output_parsed` — always `JSON.parse` + re-validate with the same Zod schema before trusting it. |
| Free-text features (summary, explain, optimize) | Plain `ai.models.generateContent()`, read `response.text`. No schema needed. |
| Pro gating | Reuse `hasProAccess(session.user.isPro)` from `src/lib/billing/plans.ts`, checked inside each action exactly like `getItemCreationBlock`. AI features get **no Free-tier fallback** — the whole action returns the existing Pro-upsell error-message pattern (`PRO_TYPE_ERROR`-style string). |
| Rate limiting | New Upstash entries in `RATE_LIMITS` (`src/lib/rate-limit.ts`), keyed on `session.user.id`, tighter than the billing limiter — even on Gemini's free tier, uncapped calls risk hitting Google's own per-key RPM/RPD ceiling and locking out every user at once. |
| Cost control | `gemini-3.5-flash-lite` is already the cheapest tier and has a genuine free allotment (unlike OpenAI, which has no free API tier at all). Layer on: capped `maxOutputTokens` per feature, `thinkingConfig: { thinkingBudget: 0 }` to skip the internal reasoning pass these tasks don't need, truncated input, user-initiated only, and persisting accepted results so re-opening the drawer never re-calls the API. |
| UI pattern | Suggestion-then-accept, not silent apply: AI output renders as a preview (tag chips, a summary block) with **Accept**/**Discard** actions, matching the existing edit-mode-before-save mental model already used by `ItemEditFields`. `useTransition` + `Loader2` spinner + `sonner` toast — identical to every other action call site in the repo. |
| Security | API key stays server-only (no `NEXT_PUBLIC_` prefix, never touches a client bundle — same rule as `STRIPE_SECRET_KEY`/R2 credentials), and should be scoped in Google AI Studio / Cloud Console to only the Generative Language API. Ownership-scoped queries only (a user can only run AI features against their own items). Output is rendered as plain text/badges, never `dangerouslySetInnerHTML`. |

---

## 2. Current state analysis

### 2.1 What already exists

Nothing AI-specific has been built. What's already in place and directly
reusable, confirmed by reading the actual files in this session:

- **`.env.example`** has an `OPENAI_API_KEY=''` line from the parallel OpenAI
  research pass, but **no Gemini/Google AI key** yet — confirms this
  integration hasn't started.
- **`zod` is already `^4.5.4`** (`src/lib/validation/*` depend on it
  throughout), which matters specifically for Gemini: Zod v4 ships a native
  `.toJSONSchema()` method, so structured output needs **no extra package** —
  a real advantage over the OpenAI plan, which still needs `openai`'s own
  `zodTextFormat` helper.
- **Pro gating primitives** (`src/lib/billing/plans.ts`): `hasProAccess(isPro)`,
  pure and unit-tested, already the single source of truth other Pro-only
  surfaces check (`getItemCreationBlock`, `resolveProItemTypeSlug` for the
  File/Image pages). AI features slot into this exact pattern, unchanged from
  the OpenAI plan.
- **Server Action contract** (`src/actions/shared.ts`): `ActionResult<T>`,
  `requireUserId(verb)`, `zodMessage(error)`, `GENERIC_ERROR`. Every action file
  (`items.ts`, `collections.ts`, `billing.ts`, `editor-preferences.ts`) follows
  `requireUserId` → validate → gate → try/catch query → typed result. AI
  actions should be a new `src/actions/ai.ts` following the identical shape.
- **Lazy external-client pattern**: `src/lib/stripe.ts` caches a client on
  `globalThis` keyed off an env var, with an `isXConfigured()` boolean check
  callers use before touching the client — read directly in this session (see
  §3 below for the Gemini equivalent). This avoids `next dev` HMR creating a
  new client per reload and gives every route a cheap way to short-circuit
  when the integration isn't configured.
- **Rate limiting** (`src/lib/rate-limit.ts`, read in full this session):
  fails open (never blocks the app if Upstash is unset or errors), one named
  entry per protected action in a `RATE_LIMITS` const, `checkRateLimit(name,
  identifier)` / `enforceRateLimit(name, identifier)`. The existing `billing`
  entry (10/hour, keyed on `session.user.id`) is the closest precedent for a
  paid/abuse-prone Server Action rather than an anonymous auth endpoint.
- **Ownership-scoped item access**: `getItemById(id)` (`src/lib/db/items.ts`)
  already does `findFirst({ where: { id, userId } })` so a foreign item id
  resolves to `null` — every AI action that operates on an existing item should
  fetch through this, never trust a client-sent `content` string for anything
  but the prompt-optimizer feature (which has no associated item).
- **Suggestion/edit UI precedent**: `ItemEditFields` + `ItemDrawer`'s edit mode
  already establishes a "stage changes, then Save" flow with local form state
  before an action commits it. Tag input in that flow is a plain
  comma-separated field (`parseTagsInput`, `src/lib/validation/item.ts`) —
  auto-tag suggestions should populate that same field state, not write
  directly to the DB.

### 2.2 What's genuinely new

- The `@google/genai` npm package.
- A `src/lib/gemini.ts` client module.
- A pure `src/lib/ai/` folder (prompts, model/parameter constants, Zod output
  schemas) — mirroring how `src/lib/billing/plans.ts` is kept Prisma/auth-free
  so Vitest can import it directly.
- `src/actions/ai.ts` — the four new Server Actions.
- New `RATE_LIMITS` entries.
- A Google AI Studio API key, generated at
  [aistudio.google.com/apikey](https://aistudio.google.com/apikey) against a
  Google Cloud project.
- UI: wherever each feature's trigger button/panel lives (drawer action bar for
  summary/explain/tags; the new-item/edit form for tag suggestions; a
  standalone optimizer surface, location TBD — not scoped by this research).

---

## 3. Architecture and Google Gen AI SDK setup

### 3.1 Gemini Developer API vs. Vertex AI — and why

`@google/genai` is a **unified** SDK for two backends, chosen by a constructor
flag:

```ts
// Gemini Developer API — API-key auth, Google AI Studio
new GoogleGenAI({ apiKey: "..." });

// Vertex AI — GCP project/IAM auth, Google Cloud Console
new GoogleGenAI({ vertexai: true, project: "...", location: "..." });
```

**Recommendation: Gemini Developer API.** Reasons, and the tradeoff being made
explicit:

- It's a single secret (`apiKey`), matching every other external integration
  in this codebase (`STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`,
  the R2 credentials) — one env var, no service-account JSON, no GCP IAM
  role to provision.
- It has a genuine **free tier** for development, which Vertex AI does not (Vertex
  is billed-GCP-project only, no free quota).
- Vertex AI's advantages — enterprise IAM, VPC-SC, regional data residency,
  higher default quotas — solve problems DevStash doesn't have yet (no
  enterprise/compliance requirement is named anywhere in `context/`).

If a future compliance or quota requirement emerges, migrating is a
constructor-flag change plus swapping the env var, since the rest of the SDK
surface (`ai.models.generateContent(...)`) is identical between the two
backends — worth knowing so this choice isn't treated as a one-way door.

### 3.2 Installing the SDK

```bash
npm install @google/genai
```

**Do not install `@google/generative-ai`.** It's a different, deprecated
package (end-of-lifed November 30, 2025 per Google's own repo notice) that
older blog posts and tutorials still reference; `@google/genai` is the only
current, GA library.

### 3.3 `src/lib/gemini.ts` — following the exact shape of `src/lib/stripe.ts`

```ts
import { GoogleGenAI } from "@google/genai";

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
```

Callers check `isGeminiConfigured()` first and return a friendly "AI features
aren't available right now." error instead of letting `getGemini()` throw —
keeps local dev usable without a key, matches how billing degrades when
Stripe env vars are absent.

**Env var naming:** the SDK's Node.js path will also auto-detect
`GOOGLE_API_KEY` or `GEMINI_API_KEY` from `process.env` if no `apiKey` is
passed to the constructor at all. Pass it explicitly anyway (as above) rather
than relying on SDK auto-detection — every other integration in this repo
reads its own env var explicitly and throws a named error when it's missing,
and that convention should hold here too for consistent error messages and
testability.

`.env.example` should document the key with the same comment style as the
rest of the file:

```
# Google Gemini — powers Pro AI features (auto-tag, summaries, code
# explanation, prompt optimizer). Key from https://aistudio.google.com/apikey.
# In the Cloud Console, restrict this key to the "Generative Language API"
# only. AI features are unavailable (not disabled-with-an-error, just
# hidden/graceful) when unset.
GEMINI_API_KEY=""
```

### 3.4 Model selection — `src/lib/ai/models.ts`

Keep the model id and every tunable in one pure file so it's both unit-testable
and a single edit point if pricing/availability changes:

```ts
export const AI_MODEL = "gemini-3.5-flash-lite";

export const AI_FEATURE_LIMITS = {
  autoTag: { maxOutputTokens: 200 },
  summary: { maxOutputTokens: 300 },
  explainCode: { maxOutputTokens: 800 },
  optimizePrompt: { maxOutputTokens: 1200 },
} as const;

/** Hard cap on how much source text is sent per call — controls input cost
 * and keeps a huge snippet/file from blowing the context window. */
export const AI_INPUT_CHAR_LIMIT = 8000;
```

**Why `gemini-3.5-flash-lite` over the alternatives**, per Google's live
model/pricing docs (fetched directly this session, not from third-party
aggregator pages, several of which quoted stale or inconsistent numbers):

| Model | Fit for DevStash's 4 features | Note |
| --- | --- | --- |
| **`gemini-3.5-flash-lite`** (recommended) | Best — Google's fastest, cheapest current model, with a genuine free tier and a paid rate of $0.30/$2.50 per 1M input/output tokens. All four DevStash features are short prompts with short-to-medium output; nothing here needs a smarter model. | |
| `gemini-3.8-flash` | Overkill for cost — "engineered for long-horizon software engineering, autonomous agents, and complex enterprise workflows," priced ~2.5x higher ($0.75/$3.75, promotional through end of 2026). Worth a second look only if "Explain This Code" quality on unusually gnarly snippets turns out to disappoint on Flash-Lite. | |
| `gemini-2.5-flash-lite` | Cheaper still ($0.10/$0.40) but Google has begun **restricting new access** to the 2.5 line to accounts that already used them — not a safe default for a project starting from zero today. | |

**Open question to verify before implementing:** Google's Flash line version
number has moved fast across 2026 (2.5 → 3.5/3.6/3.7/3.8), and this research
pass could not fetch a rate-limit dashboard (Google gates the numeric
RPM/TPM/RPD figures behind an authenticated `aistudio.google.com/rate-limit`
page, not the public docs). Before writing the four action bodies: (1) confirm
`gemini-3.5-flash-lite` is still the current recommended id at
`ai.google.dev/gemini-api/docs/models`, since Google's own docs say explicitly
this changes; (2) log into AI Studio with the project's key and read the real
free-tier RPM/RPD ceiling, since that number directly drives the `RATE_LIMITS`
values in §6.2.

---

## 4. Feature implementation patterns

### 4.1 Structured output — auto-tag suggestions

Auto-tagging is the one feature that wants a typed result (an array of tag
strings). Gemini's structured-output mechanism differs from OpenAI's in one
important way worth calling out: OpenAI's Responses API can hand back an
already-parsed, schema-validated object (`response.output_parsed`); Gemini's
`response.text` is always the **raw JSON string** the model generated under a
schema constraint. The SDK does not parse or re-validate it for you, so the
action code must do both:

```ts
// src/lib/ai/schemas.ts
import { z } from "zod";

export const TagSuggestionSchema = z.object({
  tags: z.array(z.string().min(1).max(30)).min(1).max(8),
});
```

```ts
// src/actions/ai.ts
"use server";

import { GENERIC_ERROR, requireUserId, type ActionResult } from "@/actions/shared";
import { hasProAccess } from "@/lib/billing/plans";
import { getCurrentUserIsPro } from "@/lib/db/current-user";
import { getItemById } from "@/lib/db/items";
import { getGemini, isGeminiConfigured } from "@/lib/gemini";
import { AI_MODEL, AI_FEATURE_LIMITS, AI_INPUT_CHAR_LIMIT } from "@/lib/ai/models";
import { TagSuggestionSchema } from "@/lib/ai/schemas";
import { checkRateLimit } from "@/lib/rate-limit";

const AI_UNAVAILABLE = "AI features aren't available right now.";
const AI_PRO_ONLY = "AI tagging is a Pro feature. Upgrade to use it.";
const AI_RATE_LIMITED = "Too many AI requests. Please wait a bit and try again.";

export async function suggestTags(
  itemId: string,
): Promise<ActionResult<{ tags: string[] }>> {
  const user = await requireUserId("use AI tagging");
  if ("error" in user) return { success: false, error: user.error };

  if (!hasProAccess(await getCurrentUserIsPro())) {
    return { success: false, error: AI_PRO_ONLY };
  }
  if (!isGeminiConfigured()) {
    return { success: false, error: AI_UNAVAILABLE };
  }

  const limit = await checkRateLimit("aiTag", user.userId);
  if (!limit.success) return { success: false, error: AI_RATE_LIMITED };

  const item = await getItemById(itemId);
  if (!item) return { success: false, error: "Item not found." };

  const source = (item.content ?? item.description ?? "").slice(0, AI_INPUT_CHAR_LIMIT);
  if (!source.trim()) {
    return { success: false, error: "Nothing to tag — add content or a description first." };
  }

  try {
    const response = await getGemini().models.generateContent({
      model: AI_MODEL,
      contents: `Title: ${item.title}\n\n${source}`,
      config: {
        systemInstruction:
          "Suggest 3-8 short, lowercase, single-word-or-hyphenated tags for the given developer content. No explanations.",
        maxOutputTokens: AI_FEATURE_LIMITS.autoTag.maxOutputTokens,
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseJsonSchema: TagSuggestionSchema.toJSONSchema(),
      },
    });

    if (!response.text) return { success: false, error: GENERIC_ERROR };

    const parsed = TagSuggestionSchema.safeParse(JSON.parse(response.text));
    if (!parsed.success) return { success: false, error: GENERIC_ERROR };

    return { success: true, data: { tags: parsed.data.tags } };
  } catch (error) {
    console.error("AI tag suggestion failed:", error);
    return { success: false, error: GENERIC_ERROR };
  }
}
```

Two deliberate choices in that snippet, beyond the parse-then-validate step
already called out:

- **`config.systemInstruction`** is a dedicated field, not a message role
  mixed into `contents` — keeps the task instruction authoritative and
  separate from the (untrusted-ish, user-owned) content being classified. See
  §7 for why this matters for prompt-injection hygiene.
- **`thinkingConfig: { thinkingBudget: 0 }`** explicitly disables Gemini's
  internal reasoning pass. Flash-tier "thinking" is meant for multi-step
  problems; classifying tags from a snippet is not one, and skipping it
  reduces both latency and output-token cost (thinking tokens are billed as
  output tokens). Verify empirically once a key is in hand — if Flash-Lite
  specifically doesn't support (or ignores) `thinkingConfig`, this becomes a
  no-op rather than an error, but it's worth confirming rather than assuming.

### 4.2 Free-text features — summary, explain, optimize

The other three actions (`generateSummary`, `explainCode`, `optimizePrompt`)
follow the identical guard order — `requireUserId` → Pro gate → configured
check → rate limit → fetch/validate input → try/catch the Gemini call — but
skip the schema entirely and read `response.text` as prose:

```ts
const response = await getGemini().models.generateContent({
  model: AI_MODEL,
  contents: source,
  config: {
    systemInstruction:
      "Explain what this code does in plain language, in 3-6 sentences. No code fences, no restating the code line by line.",
    maxOutputTokens: AI_FEATURE_LIMITS.explainCode.maxOutputTokens,
    thinkingConfig: { thinkingBudget: 0 },
  },
});

return { success: true, data: { explanation: response.text ?? "" } };
```

`optimizePrompt` is the one feature with **no associated item** — its input is
whatever the user typed into an optimizer textarea, so it skips
`getItemById`/ownership and instead validates the raw input with a small Zod
schema (`z.string().min(1).max(AI_INPUT_CHAR_LIMIT)`), the same way
`createItemSchema` validates form input today.

### 4.3 Why Server Actions, not a Route Handler

Next.js Server Actions cannot stream a response to the client the way a Route
Handler returning a `ReadableStream` can — that's the Vercel AI SDK's
`streamText`/`useChat` territory, or the Google SDK's own
`ai.models.generateContentStream()`, neither of which DevStash has any
plumbing for today (no SSE, no `@ai-sdk/react`). None of the four features
clearly need it:

- Auto-tag suggestions return a handful of short strings — a schema-validated
  object isn't something you'd stream anyway.
- Summaries are capped at a couple sentences by design.
- Code explanations and prompt-optimizer output are the longest, but
  `gemini-3.5-flash-lite` is specifically the low-latency tier — a 1-3 second
  `await` behind a loading spinner is consistent with every other mutation in
  this app (`createItem`, `updateItem`, Stripe checkout session creation) and
  needs zero new client architecture.

If a specific feature later produces long enough output that a non-streaming
wait feels bad, revisit with a dedicated Route Handler calling
`generateContentStream` for *that* feature only — don't build streaming
plumbing speculatively for all four.

---

## 5. Structured output — validation details

Beyond the tag-suggestion example in §4.1, two things worth being explicit
about since they differ from the OpenAI plan:

1. **Schema format.** Gemini's `GenerateContentConfig` accepts two competing
   shapes: `responseSchema` (Google's own `Schema` type — a constrained
   subset of OpenAPI 3.0, hand-written or converted) and `responseJsonSchema`
   (raw JSON Schema, `unknown`-typed on the wire). Since Zod v4 has a
   **native** `.toJSONSchema()` export, `responseJsonSchema` is the better
   fit — no format-conversion library needed, and the same Zod schema doubles
   as the runtime validator on the way back in. Do not reach for the
   `zod-to-json-schema` npm package; it predates Zod v4's built-in support and
   is redundant here.
2. **Controlled generation is not a substitute for validation.** Gemini
   enforces the schema at the token-sampling level (a real constraint on what
   the model can emit, not a request it might ignore), which makes malformed
   JSON rare — but "rare" is not "never," and a truncated response (hitting
   `maxOutputTokens` mid-object) or a schema edge case can still produce
   invalid JSON. Always wrap `JSON.parse` and follow it with
   `Schema.safeParse`, exactly as §4.1 does, rather than trusting
   `response.text` directly.

---

## 6. Error handling and rate limiting

### 6.1 SDK error types and built-in retries

The `@google/genai` SDK throws a single `ApiError` class (not a family of
subclasses like OpenAI's SDK) carrying `name`, `message`, and an HTTP
`status` code:

```ts
import { ApiError } from "@google/genai";

try {
  // ...
} catch (error) {
  if (error instanceof ApiError && error.status === 429) {
    return { success: false, error: "Gemini is rate-limiting us right now. Please try again shortly." };
  }
  console.error("AI request failed:", error);
  return { success: false, error: GENERIC_ERROR };
}
```

The SDK **already retries** transient failures internally before throwing —
its default `HttpRetryOptions` are 5 attempts, exponential backoff (base
2.0), starting at a 1-second delay capped at 60 seconds, automatically
triggered on HTTP 408, 429, and any 5xx. No need to hand-roll retry logic in
the action; if the defaults ever need tightening (e.g. failing faster so a
Server Action doesn't hang the request for tens of seconds), pass a custom
`httpOptions: { retryOptions: { attempts: 2 } }` per call rather than
building a separate retry wrapper.

### 6.2 Rate limiting — new `RATE_LIMITS` entries

Add to `src/lib/rate-limit.ts`, keyed on `session.user.id` (not IP — these are
authenticated, Pro-gated actions, same reasoning as the existing `billing`
entry):

```ts
export const RATE_LIMITS = {
  // ...existing entries...
  aiTag: { limit: 20, window: "1 h", prefix: "rl:ai-tag" },
  aiSummary: { limit: 20, window: "1 h", prefix: "rl:ai-summary" },
  aiExplain: { limit: 15, window: "1 h", prefix: "rl:ai-explain" },
  aiOptimize: { limit: 15, window: "1 h", prefix: "rl:ai-optimize" },
} as const satisfies Record<string, LimitConfig>;
```

Numbers are a starting point, not a researched ceiling — Google gates the
account's actual free-tier RPM/RPD figures behind an authenticated AI Studio
dashboard this research pass had no access to (see §3.4's open question), so
tune these once that number is in hand. Two things specific to Gemini worth
weighing that don't apply to the OpenAI plan:

- **A shared per-project quota.** Every DevStash user's AI calls draw from
  the *same* Gemini API key's rate limit — Google's free tier is quoted
  in low tens of RPM by third-party trackers (unverified against the
  official dashboard, see §3.4). If DevStash's own per-user limiters
  (`aiTag: 20/hour`, etc.) are individually generous, a handful of
  concurrently-active users could still collide with Google's account-wide
  ceiling well before any single user hits their own limit. Per-user limits
  bound abuse; they do not by themselves prevent a shared-quota collision
  under real concurrent load — worth a second look once usage data exists.
- **Fail-open vs. fail-closed**, same tradeoff the OpenAI plan flagged: the
  existing `checkRateLimit` fails open (allows the request) if Upstash is
  unconfigured or errors. That's an acceptable default for the free auth
  endpoints it protects today, but an AI limiter failing open during an
  Upstash outage means uncapped calls against a metered API. Flag this
  explicitly to the user rather than assuming fail-open is fine by default —
  it wasn't decided in this research pass.

### 6.3 Input sanitization

- Cap the text sent per call (`AI_INPUT_CHAR_LIMIT`) — protects both token
  cost and context-window limits for a large snippet or file description.
- `optimizePrompt`'s raw user-typed input still goes through a Zod
  `min(1).max(...)` check before the API call, exactly like every other
  Server Action input in this codebase.
- No HTML/script injection risk in the request direction (text-only API
  payload), but the **response** direction matters: render `response.text`
  (and the parsed `tags` array) as plain text / badge labels, never
  `dangerouslySetInnerHTML`. The existing Markdown rendering path
  (`react-markdown` + `remark-gfm` in `MarkdownEditor`) already establishes
  this project's "no raw HTML from an AI-adjacent source" posture; AI output
  should get the same treatment if it's ever shown as Markdown, or plain text
  otherwise.

---

## 7. Usage limits and cost optimization

### 7.1 DevStash's own Pro gate (usage limits)

Every AI action should call `hasProAccess(await getCurrentUserIsPro())` right
after `requireUserId`, before touching Gemini or Upstash — same ordering
`getItemCreationBlock` uses (auth → gate → cost-incurring work). A Free user
(or a signed-out request that somehow reaches the action) never causes a
Gemini API call.

Two things worth deciding explicitly, unchanged from the OpenAI plan's
framing:

1. **No partial access.** Unlike item/collection limits (Free gets 50 items,
   Pro gets unlimited), AI features per `project-overview.md`'s feature
   comparison table are Pro-only with no Free-tier quota at all — the gate is
   binary, closer to `PRO_TYPE_ERROR` (File/Image uploads) than
   `ITEM_LIMIT_ERROR`.
2. **`PRO_GATING_ENABLED="false"` still applies.** `hasProAccess()` already
   returns `true` for everyone when that dev-only env var is off, so AI
   features get the same "test as if you're Pro" escape hatch the rest of the
   Pro surface has, with no extra code.

UI-side, mirror `NewItemDialog`'s File/Image treatment: a **PRO** badge next
to each AI trigger for non-Pro users, and `UpgradeNotice` (or the same
component) in place of the feature's controls — UX polish layered on top of
the server-side gate, never a substitute for it.

### 7.2 Cost optimization strategies (Gemini-specific)

1. **Cheapest current model, plus a genuine free tier.**
   `gemini-3.5-flash-lite` is priced at $0.30/$2.50 per 1M input/output
   tokens (paid tier) but also carries a **free-of-charge tier** for
   development and low-volume production — a meaningful difference from
   OpenAI, which has no free API tier at all. This changes the dev-loop
   economics: iterating on prompts during development can run entirely free
   until real usage volume is reached.
2. **Cap output tokens per feature** (`AI_FEATURE_LIMITS`, §3.4) — a runaway
   completion is the most common source of surprise cost.
3. **Disable thinking for these tasks** (`thinkingConfig: { thinkingBudget: 0
   }`, §4.1) — none of the four features are multi-step reasoning problems,
   and thinking tokens bill as output tokens.
4. **Truncate input** (`AI_INPUT_CHAR_LIMIT`) rather than sending an entire
   large file or long note verbatim.
5. **User-initiated only, never automatic.** No AI call on item save, on
   drawer open, or on any background job — every one of the four features is
   a button click. This alone bounds worst-case cost to "however many times a
   user clicks," which the rate limiter then caps further.
6. **Persist results instead of re-generating.** A generated summary or tag
   suggestion the user accepted is just written to the item's existing
   `description`/`tags` fields via the existing `updateItem` action — no new
   storage needed, and reopening the drawer later shows the saved result with
   no new API call.
7. **Context caching exists but isn't a fit here.** Gemini supports
   `cachedContent` for reusing a large, repeated prefix across many calls
   (e.g. a long shared system document) at up to ~90% input-token savings.
   None of DevStash's four features share a large repeated context between
   calls — each call's input is a single user's short item content — so this
   is worth knowing about but not worth building for now; revisit only if a
   future feature (e.g. "ask questions about this whole collection")
   introduces a large, reused context.
8. **Batch API** (50% off, async turnaround) is the wrong shape for a
   click-and-wait UI feature, same conclusion as the OpenAI plan — skip it
   unless a future bulk operation (e.g. "auto-tag all my items") is built.
9. **Usage visibility.** Nothing in this codebase currently tracks
   third-party API spend. At minimum, log the response's `usageMetadata`
   (prompt/candidates/total token counts, available on every
   `generateContent` response) to the server console per call, matching the
   existing `console.error`-on-failure convention closely enough to grep
   later; a persisted usage table is out of scope unless the user asks for
   cost dashboards.

---

## 8. Security considerations

- **API key**: server-only, read via `process.env.GEMINI_API_KEY` inside
  `src/lib/gemini.ts`, never a `NEXT_PUBLIC_` var, never returned to a client
  component or included in any action's response payload — same rule already
  enforced for `STRIPE_SECRET_KEY` and the R2 credentials. Additionally,
  because a Google AI Studio key is a real Google Cloud API key under the
  hood, restrict it in the Cloud Console to the **Generative Language API**
  only, so a leaked key can't be used against unrelated Google Cloud services
  on the same project.
- **Ownership**: every item-based AI action fetches through an
  ownership-scoped query (`getItemById`, which already does
  `findFirst({ where: { id, userId } })`) rather than trusting a
  client-passed `content` string — a user can only run AI features against
  their own data. `optimizePrompt` has no item to scope, so its only input
  validation is the Zod length/non-empty check.
- **Prompt injection is a low-severity, self-directed risk here**, same
  conclusion as the OpenAI plan and for the same reason: the content sent to
  Gemini (a user's own snippet, note, or prompt) is the user's own data —
  there's no cross-user content mixing, so "injection" at worst influences the
  output shown back to the same user who supplied the input, not a shared or
  privileged context. Two Gemini-specific mitigations still worth taking:
  keep the task instruction in `config.systemInstruction` (a distinct field
  from `contents`, not string-concatenated into the user's content, per
  §4.1), and keep input length capped so a pathological snippet can't be used
  to push the instruction out of the model's effective attention window.
- **Safety filters can false-positive on legitimate code.** Gemini applies
  default `HarmCategory` safety filtering (e.g. `DANGEROUS_CONTENT`) to every
  response; a "explain this code" request over a security-research or
  exploit-adjacent snippet, or a "summarize" request over content discussing
  vulnerabilities, could plausibly get blocked at the default threshold. This
  is a real product-quality risk worth flagging (not a security
  vulnerability — the opposite, arguably too strict) rather than deciding
  silently: if it turns out to bite real users, the fix is passing an
  explicit, narrower `safetySettings` array rather than disabling safety
  filtering broadly.
- **Output rendering**: plain text or badge components only, never injected
  as raw HTML. If a future iteration renders AI output as Markdown, route it
  through the existing `react-markdown`/`remark-gfm` pipeline
  (`MarkdownEditor`) rather than a new renderer.
- **Rate limiting doubles as abuse/cost protection**, not just a UX nicety —
  see §6.2's fail-open/fail-closed and shared-quota questions, which matter
  more for AI than for the auth endpoints the limiter currently protects.
- **Webhook/callback surface**: none. Like the OpenAI plan, none of these four
  features need an inbound webhook from Google, so there's no equivalent of
  `POST /api/webhooks/stripe`'s signature-verification concerns.

---

## 9. UI patterns

These are unchanged from the OpenAI research pass — the model/SDK is a
backend swap, not a UX redesign — restated here for completeness.

### 9.1 Loading state

Identical to every existing action call site (`ChangePassword`,
`NewItemDialog`, `createCheckoutSession`): a `useTransition()` wraps the
action call, the trigger button shows a `Loader2` spinner and is disabled
while pending, and a failure surfaces via `FormError` (inline) and/or
`toast.error(...)` (`sonner`).

### 9.2 Accept/reject, not silent apply

None of the four features should write to the database on the AI response
alone — the model's output is a **suggestion** the user reviews, consistent
with how `ItemEditFields` already stages changes before `Save` commits them:

- **Auto-tag**: suggested tags render as removable/toggleable badge chips
  above (or merged into) the existing tag input; an **Add selected** action
  folds accepted tags into the same `tags` form state `parseTagsInput`
  already produces — no separate write path, it becomes part of the normal
  `updateItem`/`createItem` submit.
- **Summary**: suggested text populates the `description` field's local form
  state (pre-filled, still editable) rather than being saved directly — the
  user's existing Save button is the only commit point.
- **Explain This Code**: read-only by nature (it doesn't map to a stored
  field), so it can render directly as an inline panel/section in the drawer
  with no accept/reject step — a one-shot "show me" action, no persistence at
  all unless the user later asks for the explanation to be saved somewhere
  (e.g. appended to the description), which would then go through the same
  staged-edit path as Summary.
- **Prompt optimizer**: shows the optimized rewrite alongside the original (a
  before/after, not a silent replace) with an explicit **Use this version**
  action that copies the result into the target field/clipboard.

### 9.3 Where each feature's trigger lives (not decided by this research)

Same open item as the OpenAI plan — the research prompt didn't specify
placement, and it isn't obvious from existing UI alone. Flag this as a
decision for the actual feature spec (`context/current-feature.md`) rather
than assuming a placement here.

---

## 10. Suggested file structure

```
src/
├── lib/
│   ├── gemini.ts                 # NEW — lazy GoogleGenAI client + isGeminiConfigured()
│   └── ai/                       # NEW — pure, Prisma/auth-free (Vitest-importable)
│       ├── models.ts             #   AI_MODEL, AI_FEATURE_LIMITS, AI_INPUT_CHAR_LIMIT
│       └── schemas.ts            #   TagSuggestionSchema (Zod)
├── actions/
│   └── ai.ts                     # NEW — suggestTags, generateSummary, explainCode, optimizePrompt
└── components/
    └── items/                    # trigger UI — exact components TBD (§9.3)
```

Everything else (`src/lib/rate-limit.ts`, `src/lib/billing/plans.ts`,
`src/actions/shared.ts`, `src/lib/db/items.ts`) is extended in place, not
duplicated — the same files the OpenAI plan would touch, since the gating,
rate-limiting, and action-contract layers are provider-agnostic.

---

## 11. Basic testing strategy

Mirrors the rest of the codebase's established pattern (confirmed by reading
`context/coding-standards.md`'s Testing section and the existing `src/lib/**`
test files): Vitest covers **pure, Prisma/auth-free logic only**, never React
components, and never code that reaches `src/lib/prisma.ts` (which throws at
import time without `DATABASE_URL`, making anything importing it untestable
under Vitest).

What's testable and should get tests when this is built:

- `src/lib/ai/models.ts` — if any derived/computed constants are added beyond
  the flat exports shown in §3.4, they're trivial but cheap to cover.
- `src/lib/ai/schemas.ts` — `TagSuggestionSchema` accept/reject cases (empty
  array, too many tags, non-string entries), same style as every other
  `src/lib/validation/*.test.ts` file in the repo.
- Any new pure helper (e.g. an input-truncation function, if one gets
  extracted rather than inlined as `.slice(0, AI_INPUT_CHAR_LIMIT)`).

What stays untested, consistent with precedent:

- `src/lib/gemini.ts` (external client, mirrors `src/lib/stripe.ts` having no
  tests).
- `src/actions/ai.ts` (Prisma + `auth()` + an external API call — no mocking
  harness exists in this repo for any Server Action, including the OpenAI
  research pass's equivalent).
- The trigger UI components (React components are out of scope for Vitest
  per the coding standards' explicit Testing section).

No new test infrastructure (mocking library, MSW, etc.) is implied by this
feature — if Gemini-specific test coverage beyond pure-schema validation is
wanted later, that's a separate, explicit decision, not something to
introduce quietly while building four Server Actions.

---

## 12. Implementation roadmap

A suggested build order, sequenced so each step is independently testable
before the next depends on it:

1. **Provision.** Create a Google AI Studio API key at
   `aistudio.google.com/apikey`, restrict it to the Generative Language API in
   the Cloud Console, add `GEMINI_API_KEY` to `.env.example` and the local
   `.env`. Confirm the current recommended model id against
   `ai.google.dev/gemini-api/docs/models` (§3.4's open question) and check the
   account's real free-tier RPM/RPD at `aistudio.google.com/rate-limit`
   (§6.2's open question) — both block accurate downstream decisions.
2. **Install & wire the client.** `npm install @google/genai`;
   `src/lib/gemini.ts` per §3.3; a throwaway script or a temporary debug
   Server Action to confirm a real `generateContent` call round-trips — this
   is also where the `thinkingConfig` support question from §4.1 gets
   answered empirically.
3. **Pure logic layer.** `src/lib/ai/models.ts` and `src/lib/ai/schemas.ts`,
   with Vitest coverage per §11 — buildable and testable with zero Gemini
   calls.
4. **Rate limits.** Add the four `RATE_LIMITS` entries (§6.2) once real free
   -tier numbers are known from step 1.
5. **First action end-to-end: `suggestTags`.** The structured-output path is
   the riskiest one (JSON-Schema-via-Zod-v4, parse-then-validate) — build and
   manually verify it before the three free-text actions, which are strictly
   simpler once the client/gating/rate-limit plumbing is proven.
6. **Remaining three actions.** `generateSummary`, `explainCode`,
   `optimizePrompt` — same shape, no schema.
7. **UI wiring**, per the accept/reject patterns in §9, once a placement
   decision is made for each trigger (§9.3) — this is a `context/current
   -feature.md` decision, not something this research resolves.
8. **Cost/usage logging** (§7.2, point 9) — a one-line addition once the
   actions exist, not a blocker for the rest.

---

## 13. Open questions for the actual feature spec

1. Confirm `gemini-3.5-flash-lite` is still the correct current model id, and
   read the account's real free-tier rate limits from the AI Studio
   dashboard, before writing the four action bodies (§3.4, §6.2).
2. Whether `thinkingConfig: { thinkingBudget: 0 }` is accepted (or a no-op)
   on the Flash-Lite tier specifically — verify against a real call (§4.1).
3. Fail-open vs. fail-closed for the four new rate limiters when Upstash is
   unreachable, and whether DevStash's per-user limits need a project-wide
   ceiling too given Gemini's shared-key quota model (§6.2) — direct cost/
   availability exposure differs from the existing auth-endpoint limiters.
4. Whether default Gemini safety-filter thresholds cause false positives on
   legitimate code-explanation requests, and if so, what a narrower
   `safetySettings` override should look like (§8).
5. Where each feature's trigger UI lives (§9.3) — not resolved by this
   research.
6. Whether accepted AI output should be logged/tracked anywhere beyond a
   console line (§7.2, point 9) for cost visibility.
7. Whether "Explain This Code" output is ever meant to be persisted, or is
   always a one-shot, non-saved panel (§9.2).

---

## 14. Documentation references

Prioritized per the research prompt: official Google documentation first,
Context7-sourced SDK reference second, third-party sources used only where
flagged as unverified.

- [Gemini API — Models](https://ai.google.dev/gemini-api/docs/models) — current model ids, capabilities, deprecation status (fetched directly this session)
- [Gemini API — Pricing](https://ai.google.dev/gemini-api/docs/pricing) — per-model token pricing, free tier notes (fetched directly this session)
- [Gemini API — Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) — quota model, 429 handling guidance (fetched directly this session; exact RPM/TPM/RPD figures require an authenticated AI Studio dashboard, not published in the public docs)
- [Gemini API — Structured output](https://ai.google.dev/gemini-api/docs/structured-output) — `responseSchema` / `responseJsonSchema` mechanics
- [Google Gen AI SDK (JS/TS) reference](https://googleapis.github.io/js-genai/) — via Context7 (`/websites/googleapis_github_io_js-genai`): `GoogleGenAI` client, `GenerateContentConfig`, `ThinkingConfig`, `SafetySetting`, `HttpRetryOptions`, `ApiError`
- [deprecated-generative-ai-js (GitHub)](https://github.com/google-gemini/deprecated-generative-ai-js) — confirms `@google/generative-ai` end-of-life and the migration path to `@google/genai`
- [Google AI Studio](https://aistudio.google.com) — API key issuance (`aistudio.google.com/apikey`) and per-account rate limit dashboard (`aistudio.google.com/rate-limit`)
- Zod v4 native `.toJSONSchema()` — already a project dependency (`zod@^4.5.4`); no additional conversion package needed, unlike the OpenAI plan's reliance on `openai/helpers/zod`

Codebase files read directly to ground this plan in DevStash's actual
patterns: `src/lib/billing/plans.ts`, `src/lib/rate-limit.ts`,
`src/actions/shared.ts`, `src/lib/stripe.ts`, `.env.example`, and the parallel
OpenAI research deliverable `docs/ai-integration-plan.md`.

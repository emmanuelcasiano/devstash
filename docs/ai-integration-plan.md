# AI Integration Research: OpenAI `gpt-5-nano` in DevStash

> Research only — nothing in this document is built. It investigates how to wire
> OpenAI's `gpt-5-nano` into DevStash for the four Pro AI features named in
> `context/project-overview.md`: auto-tag suggestions, AI summaries, "Explain
> This Code," and the prompt optimizer. Grounded in the code as it exists today
> (Server Action `{ success, data, error }` contract, `src/lib/billing/plans.ts`
> Pro gating, Upstash rate limiting, the lazy-client pattern used by
> `src/lib/stripe.ts` / `src/lib/r2.ts`).

Source prompt: [`context/research/ai-integration-research.md`](../context/research/ai-integration-research.md)

---

## 1. Summary of recommendations

| Concern | Recommendation |
| --- | --- |
| Transport | **Server Actions**, not a streaming Route Handler. All four features return short-to-medium text/JSON; `gpt-5-nano` is the low-latency tier, so a single non-streaming `await` fits the existing action pattern (`createItem`, `updateItem`, …) with no new client-side streaming plumbing. |
| SDK | Official `openai` npm package, **Responses API** (`client.responses.create` / `.parse`), not the legacy Chat Completions API. |
| Client setup | `src/lib/openai.ts` — a lazy client cached on `globalThis`, mirroring `src/lib/stripe.ts` and `src/lib/r2.ts` exactly. `isOpenAIConfigured()` companion, same shape as `isStripeConfigured()`. |
| Model | One constant, `AI_MODEL = "gpt-5-nano"`, defined in a single file (`src/lib/ai/models.ts`) so a future model swap is a one-line change. Confirm the exact current model id in the OpenAI dashboard at build time — the nano tier is versioned (e.g. `gpt-5-nano`, `gpt-5.1-nano`) and your account's available models may differ from what's shown in general docs. |
| Structured features (tagging) | `openai.responses.parse()` + `zodTextFormat()` from `openai/helpers/zod` — the model returns a Zod-validated object, no hand-rolled JSON parsing. |
| Free-text features (summary, explain, optimize) | `openai.responses.create()`, read `response.output_text`. No schema needed. |
| Pro gating | Reuse `hasProAccess(session.user.isPro)` from `src/lib/billing/plans.ts`, checked inside each action exactly like `getItemCreationBlock`. AI features get **no Free-tier fallback** — the whole action 403s with the existing Pro-upsell copy pattern (`PRO_TYPE_ERROR`-style message). |
| Rate limiting | New Upstash entries in `RATE_LIMITS` (`src/lib/rate-limit.ts`), keyed on `session.user.id`, tighter than the billing limiter — these calls cost real money per request, unlike the free auth flows the limiter currently protects. |
| Cost control | `gpt-5-nano` is already the cheapest tier (~$0.05/1M input, ~$0.40/1M output). Layer on: capped `max_output_tokens` per feature, truncating item `content` before it's sent, user-initiated only (no auto-run on save/view), and persisting results so a re-open of the drawer doesn't re-call the API. |
| UI pattern | Suggestion-then-accept, not silent apply: AI output renders as a preview (tag chips, a summary block) with **Accept**/**Discard** actions, matching the existing edit-mode-before-save mental model already used by `ItemEditFields`. `useTransition` + `Loader2` spinner + `sonner` toast — identical to every other action call site in the repo. |
| Security | API key stays server-only (no `NEXT_PUBLIC_` prefix, never touches a client bundle — same rule as `STRIPE_SECRET_KEY`/R2 credentials). Ownership-scoped queries only (a user can only run AI features against their own items). Output is rendered as plain text/badges, never `dangerouslySetInnerHTML`. |

---

## 2. Current state analysis

### 2.1 What already exists

Nothing AI-specific has been built. What's already in place and directly reusable:

- **`.env.example`** already has an uncommitted `OPENAI_API_KEY=''` line (bottom of
  the file, no surrounding comment yet) — confirms the key is expected but no
  code reads it yet.
- **`openai` package is not installed.** `package.json` has no `openai` dependency.
  `zod@^4.5.4` is already a dependency (used throughout `src/lib/validation/*`),
  which the Responses API's `zodTextFormat` helper needs.
- **Pro gating primitives** (`src/lib/billing/plans.ts`): `hasProAccess(isPro)`,
  pure and unit-tested, already the single source of truth other Pro-only
  surfaces check (`getItemCreationBlock`, `resolveProItemTypeSlug` for the
  File/Image pages). AI features slot into this exact pattern.
- **Server Action contract** (`src/actions/shared.ts`): `ActionResult<T>`,
  `requireUserId(verb)`, `zodMessage(error)`, `GENERIC_ERROR`. Every action file
  (`items.ts`, `collections.ts`, `billing.ts`, `editor-preferences.ts`) follows
  `requireUserId` → validate → gate → try/catch query → typed result. AI actions
  should be a new `src/actions/ai.ts` following the identical shape.
- **Lazy external-client pattern**: `src/lib/stripe.ts` and (per the feature
  history) `src/lib/r2.ts` both cache a client on `globalThis` keyed off an env
  var, with an `isXConfigured()` boolean check callers use before touching the
  client. This avoids `next dev` HMR creating a new client per reload and gives
  every route a cheap way to short-circuit when the integration isn't
  configured (503/graceful-skip instead of a throw).
- **Rate limiting** (`src/lib/rate-limit.ts`): fails open (never blocks the app
  if Upstash is unset or errors), one named entry per protected action in a
  `RATE_LIMITS` const, `checkRateLimit(name, identifier)` /
  `enforceRateLimit(name, identifier)`. The existing `billing` entry (10/hour,
  keyed on `session.user.id`) is the closest precedent for a paid/abuse-prone
  Server Action rather than an anonymous auth endpoint.
- **Ownership-scoped item access**: `getItemById(id)` (`src/lib/db/items.ts`)
  already does `findFirst({ where: { id, userId } })` so a foreign item id
  resolves to `null` — every AI action that operates on an existing item should
  fetch through this (or an equivalent scoped query), never trust a client-sent
  `content` string for anything but the prompt-optimizer feature (which has no
  associated item).
- **Suggestion/edit UI precedent**: `ItemEditFields` + `ItemDrawer`'s edit mode
  already establishes a "stage changes, then Save" flow with local form state
  before an action commits it. Tag input in that flow is a plain comma-separated
  field (`parseTagsInput`, `src/lib/validation/item.ts`) — auto-tag suggestions
  should populate that same field state, not write directly to the DB.

### 2.2 What's genuinely new

- The `openai` npm package and its Zod helper import (`openai/helpers/zod`).
- A `src/lib/openai.ts` client module.
- A pure `src/lib/ai/` folder (prompts, model/parameter constants, Zod output
  schemas) — mirroring how `src/lib/billing/plans.ts` is kept Prisma/auth-free
  so Vitest can import it directly.
- `src/actions/ai.ts` — the four new Server Actions.
- New `RATE_LIMITS` entries.
- UI: wherever each feature's trigger button/panel lives (drawer action bar for
  summary/explain/tags; the new-item/edit form for tag suggestions; a
  standalone optimizer surface, location TBD — not scoped by this research).

---

## 3. SDK setup and configuration

Install the official SDK:

```bash
npm install openai
```

`src/lib/openai.ts`, following the exact shape of `src/lib/stripe.ts`:

```ts
import OpenAI from "openai";

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

const globalForOpenAI = globalThis as unknown as { openaiClient?: OpenAI };

export function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  if (!globalForOpenAI.openaiClient) {
    globalForOpenAI.openaiClient = new OpenAI({ apiKey: key });
  }

  return globalForOpenAI.openaiClient;
}
```

Callers check `isOpenAIConfigured()` first and return a friendly
"AI features aren't available right now." error (same shape as
`BILLING_UNAVAILABLE` in `src/actions/billing.ts`) instead of letting
`getOpenAI()` throw — keeps local dev usable without a key, matches how billing
degrades when Stripe env vars are absent.

`.env.example` should document the key with the same comment style as the rest
of the file:

```
# OpenAI — powers Pro AI features (auto-tag, summaries, code explanation, prompt
# optimizer). Key from https://platform.openai.com/api-keys. AI features are
# unavailable (not disabled-with-an-error, just hidden/graceful) when unset.
OPENAI_API_KEY=""
```

### Model and per-feature parameters — `src/lib/ai/models.ts`

Keep the model id and every tunable in one pure file so it's both unit-testable
and a single edit point if pricing/availability changes:

```ts
export const AI_MODEL = "gpt-5-nano";

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

**Open question to verify against the live API before implementing:**
community reports (September 2026) say `gpt-5-nano` rejects the `reasoning_effort`
parameter outright (400 error) unless it's omitted, and only accepts
`temperature` when `reasoning_effort` is unset/`"none"`. Do not pass
`reasoning_effort` or `verbosity` speculatively — omit both, test a real call,
and add them back only if the account's nano tier accepts them. Getting this
wrong fails **every** AI action, so it's worth a five-minute manual check
against the real API key before writing the four action bodies.

---

## 4. Server Action patterns for AI calls

### 4.1 Structured output — auto-tag suggestions

Auto-tagging is the one feature that wants a typed result (an array of tag
strings), so it uses `responses.parse()` with a Zod schema via `zodTextFormat`:

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

import { zodTextFormat } from "openai/helpers/zod";
import { GENERIC_ERROR, requireUserId, type ActionResult } from "@/actions/shared";
import { hasProAccess } from "@/lib/billing/plans";
import { getCurrentUserIsPro } from "@/lib/db/current-user";
import { getItemById } from "@/lib/db/items";
import { getOpenAI, isOpenAIConfigured } from "@/lib/openai";
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
  if (!isOpenAIConfigured()) {
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
    const response = await getOpenAI().responses.parse({
      model: AI_MODEL,
      max_output_tokens: AI_FEATURE_LIMITS.autoTag.maxOutputTokens,
      input: [
        {
          role: "system",
          content:
            "Suggest 3-8 short, lowercase, single-word-or-hyphenated tags for the given developer content. No explanations.",
        },
        { role: "user", content: `Title: ${item.title}\n\n${source}` },
      ],
      text: { format: zodTextFormat(TagSuggestionSchema, "tag_suggestions") },
    });

    const parsed = response.output_parsed;
    if (!parsed) return { success: false, error: GENERIC_ERROR };
    return { success: true, data: { tags: parsed.tags } };
  } catch (error) {
    console.error("AI tag suggestion failed:", error);
    return { success: false, error: GENERIC_ERROR };
  }
}
```

The other three actions (`generateSummary`, `explainCode`, `optimizePrompt`)
follow the same guard order — `requireUserId` → Pro gate → configured check →
rate limit → fetch/validate input → try/catch the OpenAI call — but use
`responses.create()` and read `response.output_text` directly, since their
output is prose, not a typed object:

```ts
const response = await getOpenAI().responses.create({
  model: AI_MODEL,
  max_output_tokens: AI_FEATURE_LIMITS.explainCode.maxOutputTokens,
  instructions:
    "Explain what this code does in plain language, in 3-6 sentences. No code fences, no restating the code line by line.",
  input: source,
});

return { success: true, data: { explanation: response.output_text } };
```

`optimizePrompt` is the one feature with **no associated item** — its input is
whatever the user typed into an optimizer textarea, so it skips
`getItemById`/ownership and instead validates the raw input with a small Zod
schema (`z.string().min(1).max(AI_INPUT_CHAR_LIMIT)`) the same way
`createItemSchema` validates form input today.

### 4.2 Why Server Actions, not a Route Handler

Next.js Server Actions cannot stream a response to the client the way a Route
Handler returning a `ReadableStream` can — that's the Vercel AI SDK's
`streamText`/`useChat` territory, which needs a POST-based Route Handler
consuming Server-Sent Events, not a `"use server"` action. DevStash has no such
infrastructure today (no SSE, no `@ai-sdk/react`), and none of these four
features clearly need it:

- Auto-tag suggestions return a handful of short strings — a Zod-parsed object
  isn't something you'd want to stream anyway.
- Summaries are capped at a couple sentences by design.
- Code explanations and prompt-optimizer output are the longest, but
  `gpt-5-nano` is the lowest-latency tier specifically for fast, short
  responses — a 1-3 second `await` behind a loading spinner is consistent with
  every other mutation in this app (`createItem`, `updateItem`, Stripe checkout
  session creation) and needs zero new client architecture.

If a specific feature later produces long enough output that a non-streaming
wait feels bad, revisit with a dedicated Route Handler for *that* feature only
— don't build streaming plumbing speculatively for all four.

---

## 5. Error handling and rate limiting

### 5.1 SDK error types

The `openai` SDK throws typed errors worth branching on in the `catch` block
(mirrors how `src/auth.ts` and the auth API routes already give specific
messages instead of a blanket 500):

```ts
import OpenAI from "openai";

try {
  // ...
} catch (error) {
  if (error instanceof OpenAI.RateLimitError) {
    return { success: false, error: "OpenAI is rate-limiting us right now. Please try again shortly." };
  }
  if (error instanceof OpenAI.APIConnectionError) {
    return { success: false, error: "Couldn't reach the AI service. Please try again." };
  }
  console.error("AI request failed:", error);
  return { success: false, error: GENERIC_ERROR };
}
```

The SDK already retries transient failures (connection errors, 5xxs, and 429s
with a `Retry-After` header) internally with exponential backoff before
throwing — no need to hand-roll retry logic in the action.

### 5.2 Rate limiting — new `RATE_LIMITS` entries

Add to `src/lib/rate-limit.ts`, keyed on `session.user.id` (not IP — these are
authenticated, Pro-gated actions, same reasoning as the `billing` entry) and
tighter than any existing limiter because every request has a real per-token
cost:

```ts
export const RATE_LIMITS = {
  // ...existing entries...
  aiTag: { limit: 20, window: "1 h", prefix: "rl:ai-tag" },
  aiSummary: { limit: 20, window: "1 h", prefix: "rl:ai-summary" },
  aiExplain: { limit: 15, window: "1 h", prefix: "rl:ai-explain" },
  aiOptimize: { limit: 15, window: "1 h", prefix: "rl:ai-optimize" },
} as const satisfies Record<string, LimitConfig>;
```

Numbers are a starting point, not a researched ceiling — tune once real usage
patterns and OpenAI cost data exist. The existing fail-open behavior
(`checkRateLimit` returns `ALLOW` if Upstash is unconfigured or errors) applies
unchanged; that's an acceptable tradeoff for auth endpoints but worth a second
look here specifically because a fail-open AI limiter during an Upstash outage
means uncapped OpenAI spend — consider whether these four limiters should
instead **fail closed** (block on Redis error) given the direct cost exposure,
and flag that decision to the user rather than assuming fail-open is fine by
default.

### 5.3 Input sanitization

- Cap the text sent per call (`AI_INPUT_CHAR_LIMIT`) — protects both token
  cost and context-window limits for a large snippet or file description.
- `optimizePrompt`'s raw user-typed input still goes through a Zod
  `min(1).max(...)` check before the API call, exactly like every other
  Server Action input in this codebase.
- No HTML/script injection risk in the request direction (text-only API
  payload), but the **response** direction matters: render `output_text` (and
  `output_parsed.tags`) as plain text / badge labels, never
  `dangerouslySetInnerHTML`. The existing Markdown rendering path
  (`react-markdown` + `remark-gfm` in `MarkdownEditor`) already establishes
  this project's "no raw HTML from an AI-adjacent source" posture; AI output
  should get the same treatment if it's ever shown as Markdown, or plain text
  otherwise.

---

## 6. Pro gating

Every AI action should call `hasProAccess(await getCurrentUserIsPro())` right
after `requireUserId`, before touching OpenAI or Upstash — same ordering
`getItemCreationBlock` uses (auth → gate → cost-incurring work). A Free user
(or a signed-out request that somehow reaches the action) never causes an
OpenAI API call.

Two things this project's existing gate helper does **not** currently need to
handle, worth deciding explicitly for AI:

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

---

## 7. Cost optimization strategies

1. **Cheapest model tier already chosen.** `gpt-5-nano` (~$0.05/1M input,
   ~$0.40/1M output as of September 2026) is already OpenAI's lowest-cost text
   model, so the main lever left is call volume and token count, not model
   choice.
2. **Cap output tokens per feature** (`AI_FEATURE_LIMITS`, above) — a runaway
   completion is the most common source of surprise cost.
3. **Truncate input** (`AI_INPUT_CHAR_LIMIT`) rather than sending an entire
   large file or long note verbatim.
4. **User-initiated only, never automatic.** No AI call on item save, on
   drawer open, or on any background job — every one of the four features is a
   button click. This alone bounds worst-case cost to "however many times a
   user clicks," which the rate limiter then caps further.
5. **Persist results instead of re-generating.** A generated summary or tag
   suggestion the user accepted is just written to the item's existing
   `description`/`tags` fields via the existing `updateItem` action — no new
   storage needed, and reopening the drawer later shows the saved result with
   no new API call. If a *cache-before-accept* is wanted (e.g. so navigating
   away and back doesn't lose an unsaved suggestion), that's local component
   state, not a DB write.
6. **Batch API is available but not a fit.** OpenAI's Batch API halves cost in
   exchange for asynchronous, non-interactive turnaround — wrong shape for a
   click-and-wait UI feature; skip it unless a future bulk operation (e.g.
   "auto-tag all my items") is built, at which point it's worth revisiting.
7. **Usage visibility.** Nothing in this codebase currently tracks third-party
   API spend. At minimum, log `response.usage` (input/output token counts) to
   the server console per call, matching the existing `console.error`-on-
   failure convention closely enough to grep later; a persisted usage table is
   out of scope unless the user asks for cost dashboards.

---

## 8. UI patterns

### 8.1 Loading state

Identical to every existing action call site (`ChangePassword`,
`NewItemDialog`, `createCheckoutSession`): a `useTransition()` wraps the action
call, the trigger button shows a `Loader2` spinner and is disabled while
pending, and a failure surfaces via `FormError` (inline) and/or
`toast.error(...)` (`sonner`), matching the dual-surface pattern
`NewItemDialog`/`ItemDrawer` already use.

### 8.2 Accept/reject, not silent apply

None of the four features should write to the database on the AI response
alone — the model's output is a **suggestion** the user reviews, consistent
with how `ItemEditFields` already stages changes before `Save` commits them:

- **Auto-tag**: suggested tags render as removable/toggleable badge chips
  above (or merged into) the existing tag input; an **Add selected** action
  folds accepted tags into the same `tags` form state `parseTagsInput` already
  produces — no separate write path, it becomes part of the normal
  `updateItem`/`createItem` submit.
- **Summary**: suggested text populates the `description` field's local form
  state (pre-filled, still editable) rather than being saved directly —
  the user's existing Save button is the only commit point.
- **Explain This Code**: read-only by nature (it doesn't map to a stored
  field), so it can render directly as an inline panel/section in the drawer
  with no accept/reject step — closer to a one-shot "show me" action, no
  persistence at all unless the user later asks for the explanation to be
  saved somewhere (e.g. appended to the description), which would then go
  through the same staged-edit path as Summary.
- **Prompt optimizer**: shows the optimized rewrite alongside the original
  (a before/after, not a silent replace) with an explicit **Use this version**
  action that copies the result into the target field/clipboard.

### 8.3 Where each feature's trigger lives (not decided by this research)

The research prompt didn't specify placement, and it isn't obvious from
existing UI alone — e.g. whether "Explain This Code" lives in the drawer's
`ItemActionBar` (next to Copy) or as a section inside `ItemDetailView`, and
where a prompt-optimizer surface would live at all (a prompt-type item's
drawer? a standalone tool?). Flag this as a decision for the actual feature
spec (`context/current-feature.md`) rather than assuming a placement here.

---

## 9. Security considerations

- **API key**: server-only, read via `process.env.OPENAI_API_KEY` inside
  `src/lib/openai.ts`, never a `NEXT_PUBLIC_` var, never returned to a client
  component or included in any action's response payload — same rule already
  enforced for `STRIPE_SECRET_KEY` and the R2 credentials.
- **Ownership**: every item-based AI action fetches through an
  ownership-scoped query (`getItemById`, which already does
  `findFirst({ where: { id, userId } })`) rather than trusting a client-passed
  `content` string — a user can only run AI features against their own data.
  `optimizePrompt` has no item to scope, so its only input validation is the
  Zod length/non-empty check.
- **Prompt injection is a low-severity, self-directed risk here.** The content
  sent to OpenAI (a user's own snippet, note, or prompt) is the user's own
  data — there's no cross-user content mixing, so "injection" at worst
  influences the output shown back to the same user who supplied the input,
  not a shared or privileged context. Still worth capping input length and
  keeping the system/instructions message authoritative (system role, not
  concatenated into user content) so the model doesn't treat item content as
  new instructions that override the feature's intent.
- **Output rendering**: plain text or badge components only, never injected as
  raw HTML. If a future iteration renders AI output as Markdown, route it
  through the existing `react-markdown`/`remark-gfm` pipeline
  (`MarkdownEditor`) rather than a new renderer.
- **Rate limiting doubles as abuse/cost protection**, not just a UX nicety —
  see §5.2's fail-open/fail-closed question, which matters more for AI than
  for the auth endpoints the limiter currently protects.
- **Webhook/callback surface**: none. Unlike Stripe, none of these four
  features need an inbound webhook from OpenAI, so there's no equivalent of
  `POST /api/webhooks/stripe`'s signature-verification concerns.

---

## 10. Open questions for the actual feature spec

1. Confirm `gpt-5-nano`'s exact accepted parameter set (`reasoning_effort`,
   `verbosity`, `temperature`) against the real API before writing the four
   action bodies — see §3's flagged uncertainty.
2. Fail-open vs. fail-closed for the four new rate limiters when Upstash is
   unreachable (§5.2) — direct cost exposure differs from the existing
   auth-endpoint limiters.
3. Where each feature's trigger UI lives (§8.3) — not resolved by this
   research.
4. Whether accepted AI output should be logged/tracked anywhere beyond a
   console line (§7, point 7) for cost visibility.
5. Whether "Explain This Code" output is ever meant to be persisted, or is
   always a one-shot, non-saved panel (§8.2).

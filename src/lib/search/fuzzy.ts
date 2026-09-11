const WORD_START_MULTIPLIER = 2;
const MID_WORD_MULTIPLIER = 1.5;
/** How much slack (beyond the query's own length) a loose match may span before it's rejected as unrelated. */
const LOOSE_MATCH_SLACK = 2;
/** Additional fixed slack so very short queries (1-2 chars) still get a usable window. */
const LOOSE_MATCH_MIN_EXTRA = 2;

/**
 * Scores how well `text` matches `query` for the command palette's
 * client-side search. Returns `0` for no match; otherwise a positive score
 * where higher means a better match, so results can be sorted best-first.
 *
 * A contiguous, case-insensitive substring match always wins and scores
 * higher the earlier it starts and the closer it sits to a word boundary.
 * When there is no substring match, a looser order-preserving character match
 * is still allowed (so a typo or a partial word like "snip" still finds
 * "snippet") but only when the matched characters are packed within a tight
 * window. That window is what keeps the search "fuzzy" without matching
 * strings that merely happen to contain the same letters scattered anywhere
 * in them (like a random database id or an unrelated paragraph).
 */
export function fuzzyScore(text: string, query: string): number {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return 1;

    const normalizedText = text.toLowerCase();
    const index = normalizedText.indexOf(normalizedQuery);
    if (index !== -1) {
        const isWordStart = index === 0 || /[^a-z0-9]/.test(normalizedText[index - 1] ?? "");
        const positionPenalty = index / (normalizedText.length + normalizedQuery.length);
        return (isWordStart ? WORD_START_MULTIPLIER : MID_WORD_MULTIPLIER) - positionPenalty;
    }

    let matchStart = -1;
    let matchEnd = -1;
    let queryIndex = 0;
    for (let i = 0; i < normalizedText.length && queryIndex < normalizedQuery.length; i++) {
        if (normalizedText[i] === normalizedQuery[queryIndex]) {
            if (matchStart === -1) matchStart = i;
            matchEnd = i;
            queryIndex += 1;
        }
    }
    if (queryIndex < normalizedQuery.length) return 0;

    const span = matchEnd - matchStart + 1;
    const maxSpan = normalizedQuery.length + Math.max(LOOSE_MATCH_SLACK, LOOSE_MATCH_MIN_EXTRA);
    if (span > maxSpan) return 0;

    return normalizedQuery.length / span;
}

/**
 * A `cmdk` `Command` `filter` implementation built on {@link fuzzyScore}.
 * Scores `value` directly and each `keywords` entry (secondary fields like an
 * item's type or content preview) at a discount, taking the best score across
 * all of them so a match on any field surfaces the result.
 */
const KEYWORD_SCORE_WEIGHT = 0.85;

export function commandFilter(value: string, search: string, keywords?: string[]): number {
    let best = fuzzyScore(value, search);
    for (const keyword of keywords ?? []) {
        const score = fuzzyScore(keyword, search) * KEYWORD_SCORE_WEIGHT;
        if (score > best) best = score;
    }
    return best;
}

/**
 * Item types whose text content is authored as Markdown and therefore get the
 * {@link MarkdownEditor} (Write/Preview tabs) instead of the plain textarea.
 *
 * Snippets and commands are code (see `code-language.ts`); notes and prompts are
 * prose, so they render through `react-markdown`.
 */
export const MARKDOWN_ITEM_TYPES = new Set(["note", "prompt"]);

export function isMarkdownItemType(name: string | null | undefined): boolean {
    return name != null && MARKDOWN_ITEM_TYPES.has(name.toLowerCase());
}

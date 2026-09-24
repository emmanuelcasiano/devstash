/**
 * Shared shape for the controlled item create/edit forms. The new-item dialog and
 * the item drawer's edit mode both drive these six string fields; which ones are
 * shown depends on the item type (see `isContentItemType` / `isLanguageItemType`
 * in `@/lib/validation/item`).
 */
export interface ItemFormValues {
    title: string;
    description: string;
    content: string;
    url: string;
    language: string;
    tags: string;
}

export const EMPTY_ITEM_FORM: ItemFormValues = {
    title: "",
    description: "",
    content: "",
    url: "",
    language: "",
    tags: "",
};

/**
 * How tall the code editor may grow inside the item drawer before it scrolls
 * internally. The drawer body already scrolls, so this is generous — almost any
 * snippet shows in full.
 */
export const DRAWER_CODE_MAX_HEIGHT = 1200;

/**
 * Combines the create/edit form's free-text fields into one string for the AI
 * auto-tag suggestion prompt — content first (the primary signal for
 * snippet/prompt/command/note), then URL (for links), then description as a
 * fallback so file/image items (which have neither) still give the model
 * something to work with.
 */
export function autoTagSourceText(form: ItemFormValues): string {
    return [form.content, form.url, form.description]
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .join("\n\n");
}

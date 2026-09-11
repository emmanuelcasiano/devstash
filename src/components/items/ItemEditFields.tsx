"use client";

import { CollectionPicker } from "@/components/items/CollectionPicker";
import { ItemContentField } from "@/components/items/ItemContentField";
import { DRAWER_CODE_MAX_HEIGHT, type ItemFormValues } from "@/components/items/item-form";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CollectionOption } from "@/lib/db/collections";
import {
    isContentItemType,
    isLanguageItemType,
} from "@/lib/validation/item";

/**
 * The editable fields shown in the item drawer's edit mode. Which optional
 * fields appear (content, language, URL) is derived from the item's type.
 * State lives in the drawer; this component is presentational.
 */
export function ItemEditFields({
    typeName,
    form,
    formError,
    updateField,
    onContentChange,
    collections,
    selectedCollectionIds,
    onCollectionsChange,
}: {
    typeName: string;
    form: ItemFormValues;
    formError: string | null;
    updateField: (
        field: keyof ItemFormValues,
    ) => (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => void;
    onContentChange: (value: string) => void;
    collections: CollectionOption[];
    selectedCollectionIds: string[];
    onCollectionsChange: (ids: string[]) => void;
}) {
    const showContentField = isContentItemType(typeName);
    const showLanguageField = isLanguageItemType(typeName);
    const showUrlField = typeName === "link";

    return (
        <>
            {formError && <FormError>{formError}</FormError>}

            <Field label="Title" htmlFor="item-title">
                <Input
                    id="item-title"
                    value={form.title}
                    onChange={updateField("title")}
                    required
                />
            </Field>

            <Field label="Description" htmlFor="item-description">
                <Textarea
                    id="item-description"
                    value={form.description}
                    onChange={updateField("description")}
                    rows={2}
                />
            </Field>

            {showContentField && (
                <Field label="Content" htmlFor="item-content">
                    <ItemContentField
                        typeName={typeName}
                        value={form.content}
                        language={form.language}
                        codeMaxHeight={DRAWER_CODE_MAX_HEIGHT}
                        onChange={onContentChange}
                        textareaId="item-content"
                    />
                </Field>
            )}

            {showLanguageField && (
                <Field label="Language" htmlFor="item-language">
                    <Input
                        id="item-language"
                        value={form.language}
                        onChange={updateField("language")}
                        placeholder="typescript"
                    />
                </Field>
            )}

            {showUrlField && (
                <Field label="URL" htmlFor="item-url">
                    <Input
                        id="item-url"
                        type="url"
                        value={form.url}
                        onChange={updateField("url")}
                        placeholder="https://example.com"
                    />
                </Field>
            )}

            <Field label="Tags" htmlFor="item-tags">
                <Input
                    id="item-tags"
                    value={form.tags}
                    onChange={updateField("tags")}
                    placeholder="react, hooks, patterns"
                />
                <p className="text-xs text-muted-foreground">
                    Separate tags with commas.
                </p>
            </Field>

            <Field label="Collections" htmlFor="item-collections">
                <CollectionPicker
                    id="item-collections"
                    collections={collections}
                    selectedIds={selectedCollectionIds}
                    onChange={onCollectionsChange}
                />
            </Field>
        </>
    );
}

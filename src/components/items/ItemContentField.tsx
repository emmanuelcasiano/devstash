"use client";

import { CodeEditor } from "@/components/items/CodeEditor";
import { MarkdownEditor } from "@/components/items/MarkdownEditor";
import { Textarea } from "@/components/ui/textarea";
import { isCodeItemType } from "@/lib/code-language";
import { isMarkdownItemType } from "@/lib/markdown-item";

interface ItemContentFieldProps {
    /** Item type name — decides code editor vs. markdown editor vs. plain text. */
    typeName: string;
    value: string;
    /** Free-text language, used only to seed the code editor's highlighting. */
    language?: string | null;
    /** Read view (no editing) vs. an editable field. */
    readOnly?: boolean;
    /** Tallest the code editor grows before it scrolls; omitted uses its default. */
    codeMaxHeight?: number;
    /** Called with the new value on every edit (ignored when `readOnly`). */
    onChange?: (value: string) => void;
    /** `id` and `rows` for the plain-textarea fallback (non-code, non-markdown). */
    textareaId?: string;
    rows?: number;
}

/**
 * Renders the right editor for an item's text content: Monaco for code types
 * (snippet, command), the Write/Preview markdown editor for prose types (note,
 * prompt), and a plain textarea (read view: a `<pre>`) for anything else. The
 * new-item dialog and the item drawer both had this ~30-line switch inline.
 */
export function ItemContentField({
    typeName,
    value,
    language,
    readOnly = false,
    codeMaxHeight,
    onChange,
    textareaId,
    rows = 8,
}: ItemContentFieldProps) {
    if (isCodeItemType(typeName)) {
        return (
            <CodeEditor
                value={value}
                language={language}
                typeName={typeName}
                readOnly={readOnly}
                maxHeight={codeMaxHeight}
                onValueChange={onChange}
            />
        );
    }

    if (isMarkdownItemType(typeName)) {
        return (
            <MarkdownEditor
                value={value}
                readOnly={readOnly}
                onValueChange={onChange}
            />
        );
    }

    if (readOnly) {
        return (
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs text-foreground">
                {value}
            </pre>
        );
    }

    return (
        <Textarea
            id={textareaId}
            value={value}
            onChange={(event) => onChange?.(event.target.value)}
            rows={rows}
            className="font-mono text-xs leading-relaxed md:text-xs"
        />
    );
}

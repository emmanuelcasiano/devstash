"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { LANGUAGE_OPTIONS, resolveLanguageOption } from "@/lib/code-language";

/**
 * Dropdown of common languages for snippets/commands, used by both the
 * new-item dialog and the item drawer's edit mode. `value` is the raw stored
 * `Item.language` string — it's resolved against `LANGUAGE_OPTIONS` (via
 * aliases) for display, so a pre-existing free-text value that doesn't match
 * any option shows the placeholder instead of a false selection.
 */
export function LanguageSelect({
    id,
    value,
    onChange,
}: {
    id: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <Select
            value={resolveLanguageOption(value)}
            onValueChange={(next: string | null) => {
                if (next !== null) {
                    onChange(next);
                }
            }}
        >
            <SelectTrigger id={id}>
                <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
                {LANGUAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

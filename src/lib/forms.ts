import type { Dispatch, SetStateAction } from "react";

/**
 * Builds a change-handler factory bound to a form's `setState`. `updateField` is
 * called with a field name and returns an `onChange` handler that writes
 * `event.target.value` into that field:
 *
 * ```ts
 * const updateField = makeFieldUpdater(setForm);
 * <Input onChange={updateField("title")} />
 * ```
 *
 * Replaces the identical `updateField` / `update` closures that were defined
 * inline in the item drawer, the new-item dialog, and the register form.
 */
export function makeFieldUpdater<T>(setForm: Dispatch<SetStateAction<T>>) {
    return (field: keyof T) =>
        (
            event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
        ) => {
            const { value } = event.target;
            setForm((prev) => ({ ...prev, [field]: value }) as T);
        };
}

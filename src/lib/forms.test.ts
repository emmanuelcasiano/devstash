import { describe, expect, it, vi } from "vitest";

import { makeFieldUpdater } from "@/lib/forms";

describe("makeFieldUpdater", () => {
    function changeEvent(value: string) {
        return {
            target: { value },
        } as React.ChangeEvent<HTMLInputElement>;
    }

    it("writes the event value into the named field via the functional updater", () => {
        const setForm = vi.fn();
        const updateField = makeFieldUpdater(setForm);

        updateField("title")(changeEvent("Hello"));

        expect(setForm).toHaveBeenCalledTimes(1);
        const updater = setForm.mock.calls[0][0] as (prev: Record<string, string>) => Record<string, string>;
        expect(updater({ title: "", body: "keep" })).toEqual({
            title: "Hello",
            body: "keep",
        });
    });

    it("only touches the targeted field", () => {
        const setForm = vi.fn();
        makeFieldUpdater(setForm)("body")(changeEvent("new body"));

        const updater = setForm.mock.calls[0][0] as (prev: Record<string, string>) => Record<string, string>;
        expect(updater({ title: "t", body: "old" })).toEqual({
            title: "t",
            body: "new body",
        });
    });
});

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";

import { updateCollection } from "@/actions/collections";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { makeFieldUpdater } from "@/lib/forms";

interface CollectionFormValues {
    name: string;
    description: string;
}

/**
 * Controlled edit dialog for a collection's name/description — used both by
 * the standalone Edit button on `/collections/[id]` and by `CollectionCard`'s
 * 3-dot menu, so `open`/`onOpenChange` are owned by the caller rather than a
 * built-in trigger (mirrors `DeleteItemDialog`).
 */
export function EditCollectionDialog({
    open,
    onOpenChange,
    collection,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    collection: { id: string; name: string; description: string | null };
}) {
    const router = useRouter();

    const [form, setForm] = useState<CollectionFormValues>({
        name: collection.name,
        description: collection.description ?? "",
    });
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const updateField = makeFieldUpdater(setForm);

    // Re-seed the form from the current collection each time the dialog opens.
    // Adjusted during render (not an effect) per React's guidance on resetting
    // state when a prop changes: https://react.dev/learn/you-might-not-need-an-effect
    const [prevOpen, setPrevOpen] = useState(open);
    if (open !== prevOpen) {
        setPrevOpen(open);
        if (open) {
            setForm({ name: collection.name, description: collection.description ?? "" });
            setError(null);
        }
    }

    const canSubmit = form.name.trim() !== "" && !submitting;

    function handleOpenChange(next: boolean) {
        if (submitting) return;
        onOpenChange(next);
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (!canSubmit) return;

        setSubmitting(true);
        setError(null);

        const result = await updateCollection(collection.id, {
            name: form.name,
            description: form.description,
        });

        setSubmitting(false);

        if (!result.success) {
            setError(result.error);
            toast.error(result.error);
            return;
        }

        onOpenChange(false);
        toast.success("Collection updated.");
        router.refresh();
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="size-4 text-muted-foreground" />
                        Edit collection
                    </DialogTitle>
                    <DialogDescription>
                        Update this collection&apos;s name and description.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && <FormError>{error}</FormError>}

                    <Field label="Name" htmlFor="edit-collection-name">
                        <Input
                            id="edit-collection-name"
                            value={form.name}
                            onChange={updateField("name")}
                            placeholder="React Patterns"
                            required
                            autoFocus
                        />
                    </Field>

                    <Field
                        label="Description"
                        htmlFor="edit-collection-description"
                    >
                        <Textarea
                            id="edit-collection-description"
                            value={form.description}
                            onChange={updateField("description")}
                            placeholder="What belongs in this collection?"
                            rows={3}
                        />
                    </Field>

                    <div className="flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenChange(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={!canSubmit}>
                            {submitting && (
                                <Loader2 className="size-4 animate-spin" />
                            )}
                            Save changes
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

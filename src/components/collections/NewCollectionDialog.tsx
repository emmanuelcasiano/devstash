"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderPlus, Loader2 } from "lucide-react";

import { createCollection } from "@/actions/collections";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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

const EMPTY_FORM: CollectionFormValues = { name: "", description: "" };

export function NewCollectionDialog() {
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<CollectionFormValues>(EMPTY_FORM);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const updateField = makeFieldUpdater(setForm);

    const canSubmit = form.name.trim() !== "" && !submitting;

    function resetForm() {
        setForm(EMPTY_FORM);
        setError(null);
    }

    function handleOpenChange(next: boolean) {
        if (submitting) return;
        setOpen(next);
        if (!next) resetForm();
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (!canSubmit) return;

        setSubmitting(true);
        setError(null);

        const result = await createCollection({
            name: form.name,
            description: form.description,
        });

        setSubmitting(false);

        if (!result.success) {
            setError(result.error);
            toast.error(result.error);
            return;
        }

        setOpen(false);
        resetForm();
        toast.success("Collection created.");
        router.refresh();
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
                <FolderPlus />
                New Collection
            </DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FolderPlus className="size-4 text-muted-foreground" />
                        New collection
                    </DialogTitle>
                    <DialogDescription>
                        Group related items together. You can add items to it
                        afterwards.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && <FormError>{error}</FormError>}

                    <Field label="Name" htmlFor="new-collection-name">
                        <Input
                            id="new-collection-name"
                            value={form.name}
                            onChange={updateField("name")}
                            placeholder="React Patterns"
                            required
                            autoFocus
                        />
                    </Field>

                    <Field
                        label="Description"
                        htmlFor="new-collection-description"
                    >
                        <Textarea
                            id="new-collection-description"
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
                            Create collection
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

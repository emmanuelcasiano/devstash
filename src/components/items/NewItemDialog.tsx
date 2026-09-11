"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Code,
    File as FileIcon,
    Image as ImageIcon,
    Link as LinkIcon,
    Loader2,
    Plus,
    Sparkles,
    StickyNote,
    Terminal,
    type LucideIcon,
} from "lucide-react";

import { createItem } from "@/actions/items";
import { CollectionPicker } from "@/components/items/CollectionPicker";
import { FileUpload, type UploadedFile } from "@/components/items/FileUpload";
import { ItemContentField } from "@/components/items/ItemContentField";
import {
    EMPTY_ITEM_FORM,
    type ItemFormValues,
} from "@/components/items/item-form";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getItemTypeColor } from "@/lib/constants/item-types";
import type { CollectionOption } from "@/lib/db/collections";
import { makeFieldUpdater } from "@/lib/forms";
import {
    isContentItemType,
    isLanguageItemType,
    isFileItemType,
    parseTagsInput,
    type CreateItemType,
} from "@/lib/validation/item";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS: { value: CreateItemType; label: string; icon: LucideIcon }[] =
    [
        { value: "snippet", label: "Snippet", icon: Code },
        { value: "prompt", label: "Prompt", icon: Sparkles },
        { value: "command", label: "Command", icon: Terminal },
        { value: "note", label: "Note", icon: StickyNote },
        { value: "link", label: "Link", icon: LinkIcon },
        { value: "file", label: "File", icon: FileIcon },
        { value: "image", label: "Image", icon: ImageIcon },
    ];

const DEFAULT_TYPE: CreateItemType = "snippet";

interface NewItemDialogProps {
    /** Item type the dialog opens with. Defaults to snippet. */
    defaultType?: CreateItemType;
    /** Trigger button text. Defaults to "New Item". */
    triggerLabel?: string;
    /** The current user's collections, for the collection picker. */
    collections: CollectionOption[];
}

export function NewItemDialog({
    defaultType = DEFAULT_TYPE,
    triggerLabel = "New Item",
    collections,
}: NewItemDialogProps) {
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [type, setType] = useState<CreateItemType>(defaultType);
    const [form, setForm] = useState<ItemFormValues>(EMPTY_ITEM_FORM);
    const [upload, setUpload] = useState<UploadedFile | null>(null);
    const [collectionIds, setCollectionIds] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const updateField = makeFieldUpdater(setForm);

    const isFileType = isFileItemType(type);
    const showContentField = isContentItemType(type);
    const showLanguageField = isLanguageItemType(type);
    const showUrlField = type === "link";

    const canSubmit =
        form.title.trim() !== "" &&
        (!showUrlField || form.url.trim() !== "") &&
        (!isFileType || upload !== null) &&
        !submitting;

    function resetForm() {
        setType(defaultType);
        setForm(EMPTY_ITEM_FORM);
        setUpload(null);
        setCollectionIds([]);
        setError(null);
    }

    function handleOpenChange(next: boolean) {
        if (submitting) return;
        setOpen(next);
        if (next) {
            setType(defaultType);
        } else {
            resetForm();
        }
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (!canSubmit) return;

        setSubmitting(true);
        setError(null);

        const result = await createItem({
            type,
            title: form.title,
            description: form.description,
            content: showContentField ? form.content : null,
            url: showUrlField ? form.url : null,
            language: showLanguageField ? form.language : null,
            tags: parseTagsInput(form.tags),
            collectionIds,
            fileUrl: isFileType ? (upload?.fileUrl ?? null) : null,
            fileName: isFileType ? (upload?.fileName ?? null) : null,
            fileSize: isFileType ? (upload?.fileSize ?? null) : null,
        });

        setSubmitting(false);

        if (!result.success) {
            setError(result.error);
            toast.error(result.error);
            return;
        }

        setOpen(false);
        resetForm();
        toast.success("Item created.");
        router.refresh();
    }

    const selectedOption =
        TYPE_OPTIONS.find((option) => option.value === type) ?? TYPE_OPTIONS[0];
    const SelectedIcon = selectedOption.icon;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger render={<Button size="sm" />}>
                <Plus />
                {triggerLabel}
            </DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <SelectedIcon
                            className="size-4"
                            style={{ color: getItemTypeColor(type) }}
                        />
                        New {selectedOption.label.toLowerCase()}
                    </DialogTitle>
                    <DialogDescription>
                        Add a snippet, prompt, command, note, link, file, or
                        image to your stash.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label>Type</Label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {TYPE_OPTIONS.map((option) => {
                                const Icon = option.icon;
                                const active = type === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setType(option.value)}
                                        aria-pressed={active}
                                        className={cn(
                                            "flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors",
                                            active
                                                ? "border-primary bg-primary/10 text-foreground"
                                                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                                        )}
                                    >
                                        <Icon
                                            className="size-4"
                                            style={{
                                                color: getItemTypeColor(
                                                    option.value,
                                                ),
                                            }}
                                        />
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {error && <FormError>{error}</FormError>}

                    <Field label="Title" htmlFor="new-item-title">
                        <Input
                            id="new-item-title"
                            value={form.title}
                            onChange={updateField("title")}
                            required
                            autoFocus
                        />
                    </Field>

                    <Field label="Description" htmlFor="new-item-description">
                        <Textarea
                            id="new-item-description"
                            value={form.description}
                            onChange={updateField("description")}
                            rows={2}
                        />
                    </Field>

                    {isFileType && (
                        <Field
                            label={type === "image" ? "Image" : "File"}
                            htmlFor="new-item-upload"
                        >
                            <FileUpload
                                kind={type === "image" ? "image" : "file"}
                                value={upload}
                                onChange={setUpload}
                                disabled={submitting}
                            />
                        </Field>
                    )}

                    {showContentField && (
                        <Field label="Content" htmlFor="new-item-content">
                            <ItemContentField
                                typeName={type}
                                value={form.content}
                                language={form.language}
                                rows={6}
                                textareaId="new-item-content"
                                onChange={(value) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        content: value,
                                    }))
                                }
                            />
                        </Field>
                    )}

                    {showLanguageField && (
                        <Field label="Language" htmlFor="new-item-language">
                            <Input
                                id="new-item-language"
                                value={form.language}
                                onChange={updateField("language")}
                                placeholder="typescript"
                            />
                        </Field>
                    )}

                    {showUrlField && (
                        <Field label="URL" htmlFor="new-item-url">
                            <Input
                                id="new-item-url"
                                type="url"
                                value={form.url}
                                onChange={updateField("url")}
                                placeholder="https://example.com"
                                required
                            />
                        </Field>
                    )}

                    <Field label="Tags" htmlFor="new-item-tags">
                        <Input
                            id="new-item-tags"
                            value={form.tags}
                            onChange={updateField("tags")}
                            placeholder="react, hooks, patterns"
                        />
                        <p className="text-xs text-muted-foreground">
                            Separate tags with commas.
                        </p>
                    </Field>

                    <Field label="Collections" htmlFor="new-item-collections">
                        <CollectionPicker
                            id="new-item-collections"
                            collections={collections}
                            selectedIds={collectionIds}
                            onChange={setCollectionIds}
                            disabled={submitting}
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
                            Create item
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

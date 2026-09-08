"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Code,
    Link as LinkIcon,
    Loader2,
    Plus,
    Sparkles,
    StickyNote,
    Terminal,
    type LucideIcon,
} from "lucide-react";

import { createItem } from "@/actions/items";
import { CodeEditor } from "@/components/items/CodeEditor";
import { MarkdownEditor } from "@/components/items/MarkdownEditor";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isCodeItemType } from "@/lib/code-language";
import { isMarkdownItemType } from "@/lib/markdown-item";
import { getItemTypeColor } from "@/lib/constants/item-types";
import { parseTagsInput, type CreateItemType } from "@/lib/validation/item";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS: { value: CreateItemType; label: string; icon: LucideIcon }[] =
    [
        { value: "snippet", label: "Snippet", icon: Code },
        { value: "prompt", label: "Prompt", icon: Sparkles },
        { value: "command", label: "Command", icon: Terminal },
        { value: "note", label: "Note", icon: StickyNote },
        { value: "link", label: "Link", icon: LinkIcon },
    ];

/** Types whose content textarea / language input are shown in the form. */
const CONTENT_TYPES = new Set<CreateItemType>([
    "snippet",
    "prompt",
    "command",
    "note",
]);
const LANGUAGE_TYPES = new Set<CreateItemType>(["snippet", "command"]);

interface NewItemForm {
    title: string;
    description: string;
    content: string;
    url: string;
    language: string;
    tags: string;
}

const EMPTY_FORM: NewItemForm = {
    title: "",
    description: "",
    content: "",
    url: "",
    language: "",
    tags: "",
};

const DEFAULT_TYPE: CreateItemType = "snippet";

interface NewItemDialogProps {
    /** Item type the dialog opens with. Defaults to snippet. */
    defaultType?: CreateItemType;
    /** Trigger button text. Defaults to "New Item". */
    triggerLabel?: string;
}

export function NewItemDialog({
    defaultType = DEFAULT_TYPE,
    triggerLabel = "New Item",
}: NewItemDialogProps = {}) {
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [type, setType] = useState<CreateItemType>(defaultType);
    const [form, setForm] = useState<NewItemForm>(EMPTY_FORM);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const showContentField = CONTENT_TYPES.has(type);
    const showLanguageField = LANGUAGE_TYPES.has(type);
    const showUrlField = type === "link";
    // Snippets and commands get the Monaco code editor; notes and prompts get
    // the Markdown editor; anything else keeps the plain textarea.
    const isCodeType = isCodeItemType(type);
    const isMarkdownType = isMarkdownItemType(type);

    const canSubmit =
        form.title.trim() !== "" &&
        (!showUrlField || form.url.trim() !== "") &&
        !submitting;

    function updateField(field: keyof NewItemForm) {
        return (
            event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
        ) => {
            const { value } = event.target;
            setForm((prev) => ({ ...prev, [field]: value }));
        };
    }

    function resetForm() {
        setType(defaultType);
        setForm(EMPTY_FORM);
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
                        Add a snippet, prompt, command, note, or link to your
                        stash.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label>Type</Label>
                        <div className="grid grid-cols-5 gap-1.5">
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

                    {error && (
                        <p
                            role="alert"
                            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                        >
                            {error}
                        </p>
                    )}

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

                    {showContentField && (
                        <Field label="Content" htmlFor="new-item-content">
                            {isCodeType ? (
                                <CodeEditor
                                    value={form.content}
                                    language={form.language}
                                    typeName={type}
                                    onValueChange={(value) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            content: value,
                                        }))
                                    }
                                />
                            ) : isMarkdownType ? (
                                <MarkdownEditor
                                    value={form.content}
                                    onValueChange={(value) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            content: value,
                                        }))
                                    }
                                />
                            ) : (
                                <Textarea
                                    id="new-item-content"
                                    value={form.content}
                                    onChange={updateField("content")}
                                    rows={6}
                                    className="font-mono text-xs leading-relaxed md:text-xs"
                                />
                            )}
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

function Field({
    label,
    htmlFor,
    children,
}: {
    label: string;
    htmlFor: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
        </div>
    );
}

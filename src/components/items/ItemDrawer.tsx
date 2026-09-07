"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Calendar,
    Check,
    Copy,
    FolderClosed,
    Loader2,
    Pencil,
    Pin,
    Star,
    Tag,
    Trash2,
} from "lucide-react";

import { ItemTypeIcon } from "@/components/shared/ItemTypeIcon";
import { useItemDrawer } from "@/components/items/item-drawer-provider";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
} from "@/components/ui/sheet";
import { deleteItem, updateItem } from "@/actions/items";
import type { ItemDetail } from "@/lib/db/items";
import { parseTagsInput } from "@/lib/validation/item";
import { cn, formatFileSize, formatLongDate } from "@/lib/utils";

/** Item detail as it arrives over JSON — the `Date` fields are ISO strings. */
type ItemDetailPayload = Omit<ItemDetail, "createdAt" | "updatedAt"> & {
    createdAt: string;
    updatedAt: string;
};

/** Item types whose content textarea / language input are shown in edit mode. */
const CONTENT_TYPES = new Set(["snippet", "prompt", "command", "note"]);
const LANGUAGE_TYPES = new Set(["snippet", "command"]);

interface EditForm {
    title: string;
    description: string;
    content: string;
    url: string;
    language: string;
    tags: string;
}

const EMPTY_FORM: EditForm = {
    title: "",
    description: "",
    content: "",
    url: "",
    language: "",
    tags: "",
};

function capitalize(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

/** The server action returns `Date` objects; the drawer state holds ISO strings. */
function toPayload(detail: ItemDetail): ItemDetailPayload {
    return {
        ...detail,
        createdAt: new Date(detail.createdAt).toISOString(),
        updatedAt: new Date(detail.updatedAt).toISOString(),
    };
}

export function ItemDrawer() {
    const { openItemId, closeItem } = useItemDrawer();
    const router = useRouter();

    // `item` / `errorId` are tagged with the id they belong to, so switching
    // items never flashes the previous item's content: anything that does not
    // match `openItemId` reads as "still loading".
    const [loadedItem, setLoadedItem] = useState<ItemDetailPayload | null>(null);
    const [errorId, setErrorId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    // Edit mode is likewise id-tagged: it only applies while the drawer is still
    // showing the item that was open when Edit was clicked.
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<EditForm>(EMPTY_FORM);
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Delete confirmation is id-tagged the same way: the dialog only stays open
    // while the drawer is still showing the item it was opened for.
    const [deleteForId, setDeleteForId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!openItemId) return;

        const controller = new AbortController();

        fetch(`/api/items/${openItemId}`, { signal: controller.signal })
            .then(async (res) => {
                if (!res.ok) throw new Error(`Request failed with ${res.status}`);
                return (await res.json()) as { item: ItemDetailPayload };
            })
            .then((data) => {
                setLoadedItem(data.item);
                setCopied(false);
            })
            .catch((error: unknown) => {
                if (controller.signal.aborted) return;
                console.error("Failed to load item detail:", error);
                setErrorId(openItemId);
            });

        return () => controller.abort();
    }, [openItemId, reloadKey]);

    const item =
        loadedItem && loadedItem.id === openItemId ? loadedItem : null;
    const isError = errorId !== null && errorId === openItemId;
    const isLoading = openItemId !== null && item === null && !isError;
    const isEditing = item !== null && editingId === openItemId;
    const isDeleteOpen = item !== null && deleteForId === openItemId;

    const typeName = item?.itemType.name ?? "";
    const showContentField = CONTENT_TYPES.has(typeName);
    const showLanguageField = LANGUAGE_TYPES.has(typeName);
    const showUrlField = typeName === "link";

    function retry() {
        setErrorId(null);
        setReloadKey((key) => key + 1);
    }

    function updateField(field: keyof EditForm) {
        return (
            event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
        ) => {
            const { value } = event.target;
            setForm((prev) => ({ ...prev, [field]: value }));
        };
    }

    function startEdit() {
        if (!item) return;
        setForm({
            title: item.title,
            description: item.description ?? "",
            content: item.content ?? "",
            url: item.url ?? "",
            language: item.language ?? "",
            tags: item.tags.join(", "),
        });
        setFormError(null);
        setEditingId(item.id);
    }

    function cancelEdit() {
        setEditingId(null);
        setFormError(null);
    }

    async function handleSave() {
        if (!item || saving) return;

        setSaving(true);
        setFormError(null);

        const result = await updateItem(item.id, {
            title: form.title,
            description: form.description,
            content: showContentField ? form.content : null,
            url: showUrlField ? form.url : null,
            language: showLanguageField ? form.language : null,
            tags: parseTagsInput(form.tags),
        });

        setSaving(false);

        if (!result.success) {
            setFormError(result.error);
            toast.error(result.error);
            return;
        }

        setLoadedItem(toPayload(result.data));
        setEditingId(null);
        toast.success("Item updated.");
        router.refresh();
    }

    function startDelete() {
        if (!item) return;
        setDeleteError(null);
        setDeleteForId(item.id);
    }

    function cancelDelete() {
        if (deleting) return;
        setDeleteForId(null);
        setDeleteError(null);
    }

    async function handleDelete() {
        if (!item || deleting) return;

        setDeleting(true);
        setDeleteError(null);

        const result = await deleteItem(item.id);

        setDeleting(false);

        if (!result.success) {
            setDeleteError(result.error);
            toast.error(result.error);
            return;
        }

        setDeleteForId(null);
        closeItem();
        setEditingId(null);
        toast.success("Item deleted.");
        router.refresh();
    }

    const copyValue = item?.content ?? item?.url ?? item?.description ?? "";

    async function handleCopy() {
        if (!copyValue) return;
        try {
            await navigator.clipboard.writeText(copyValue);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch (error) {
            console.error("Failed to copy item:", error);
        }
    }

    return (
        <Sheet
            open={openItemId !== null}
            onOpenChange={(open) => {
                if (!open) {
                    closeItem();
                    setCopied(false);
                    setEditingId(null);
                    setFormError(null);
                    setDeleteForId(null);
                    setDeleteError(null);
                }
            }}
        >
            <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
                {isLoading && <DrawerSkeleton />}

                {isError && (
                    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                        <SheetTitle className="sr-only">Item details</SheetTitle>
                        <p className="text-sm text-muted-foreground">
                            Couldn&apos;t load this item.
                        </p>
                        <Button variant="outline" size="sm" onClick={retry}>
                            Try again
                        </Button>
                    </div>
                )}

                {item && (
                    <>
                    <div className="flex h-full flex-col">
                        <div className="flex flex-col gap-3 p-6 pb-4">
                            <div className="flex items-start gap-3 pr-8">
                                <div
                                    className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                                    style={{ backgroundColor: `${item.itemType.color}1a` }}
                                >
                                    <ItemTypeIcon
                                        iconName={item.itemType.icon}
                                        className="size-5"
                                        color={item.itemType.color}
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    {isEditing ? (
                                        <>
                                            <SheetTitle className="sr-only">
                                                Editing {item.title}
                                            </SheetTitle>
                                            <p className="text-sm font-medium text-muted-foreground">
                                                Editing
                                            </p>
                                        </>
                                    ) : (
                                        <SheetTitle className="truncate text-base">
                                            {item.title}
                                        </SheetTitle>
                                    )}
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                        <Badge variant="secondary">
                                            {capitalize(item.itemType.name)}s
                                        </Badge>
                                        {!isEditing && item.language && (
                                            <Badge variant="secondary">{item.language}</Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <SheetDescription className="sr-only">
                                Detail view for {item.title}
                            </SheetDescription>

                            {isEditing ? (
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        onClick={handleSave}
                                        disabled={saving || form.title.trim() === ""}
                                    >
                                        {saving && (
                                            <Loader2 className="size-4 animate-spin" />
                                        )}
                                        Save
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={cancelEdit}
                                        disabled={saving}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-0.5">
                                    <Button variant="ghost" size="sm">
                                        <Star
                                            className={cn(
                                                "size-4",
                                                item.isFavorite &&
                                                    "fill-yellow-400 text-yellow-400",
                                            )}
                                        />
                                        Favorite
                                    </Button>
                                    <Button variant="ghost" size="sm">
                                        <Pin
                                            className={cn(
                                                "size-4",
                                                item.isPinned && "fill-current",
                                            )}
                                        />
                                        Pin
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCopy}
                                        disabled={!copyValue}
                                    >
                                        {copied ? (
                                            <Check className="size-4" />
                                        ) : (
                                            <Copy className="size-4" />
                                        )}
                                        {copied ? "Copied" : "Copy"}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="ml-auto"
                                        onClick={startEdit}
                                    >
                                        <Pencil className="size-4" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className="text-destructive hover:text-destructive"
                                        aria-label="Delete item"
                                        onClick={startDelete}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        <Separator />

                        <div className="flex-1 space-y-6 overflow-y-auto p-6">
                            {isEditing ? (
                                <>
                                    {formError && (
                                        <p
                                            role="alert"
                                            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                                        >
                                            {formError}
                                        </p>
                                    )}

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
                                            <Textarea
                                                id="item-content"
                                                value={form.content}
                                                onChange={updateField("content")}
                                                rows={8}
                                                className="font-mono text-xs leading-relaxed md:text-xs"
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
                                </>
                            ) : (
                                <>
                                    {item.description && (
                                        <Section label="Description">
                                            <p className="text-sm text-foreground">
                                                {item.description}
                                            </p>
                                        </Section>
                                    )}

                                    {item.content && (
                                        <Section label="Content">
                                            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs text-foreground">
                                                {item.content}
                                            </pre>
                                        </Section>
                                    )}

                                    {item.url && (
                                        <Section label="Link">
                                            <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-sm break-all text-primary hover:underline"
                                            >
                                                {item.url}
                                            </a>
                                        </Section>
                                    )}

                                    {item.fileName && (
                                        <Section label="File">
                                            <p className="text-sm text-foreground">
                                                {item.fileUrl ? (
                                                    <a
                                                        href={item.fileUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-primary hover:underline"
                                                    >
                                                        {item.fileName}
                                                    </a>
                                                ) : (
                                                    item.fileName
                                                )}
                                                {item.fileSize != null && (
                                                    <span className="text-muted-foreground">
                                                        {" "}
                                                        · {formatFileSize(item.fileSize)}
                                                    </span>
                                                )}
                                            </p>
                                        </Section>
                                    )}

                                    {item.tags.length > 0 && (
                                        <Section
                                            label="Tags"
                                            icon={<Tag className="size-3.5" />}
                                        >
                                            <div className="flex flex-wrap gap-1">
                                                {item.tags.map((tag) => (
                                                    <Badge key={tag} variant="secondary">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </Section>
                                    )}
                                </>
                            )}

                            {item.collections.length > 0 && (
                                <Section
                                    label="Collections"
                                    icon={<FolderClosed className="size-3.5" />}
                                >
                                    <div className="flex flex-wrap gap-1">
                                        {item.collections.map((collection) => (
                                            <Link
                                                key={collection.id}
                                                href={`/collections/${collection.id}`}
                                                onClick={closeItem}
                                            >
                                                <Badge
                                                    variant="secondary"
                                                    className="hover:bg-secondary/60"
                                                >
                                                    {collection.name}
                                                </Badge>
                                            </Link>
                                        ))}
                                    </div>
                                </Section>
                            )}

                            <Section
                                label="Details"
                                icon={<Calendar className="size-3.5" />}
                            >
                                <dl className="flex flex-col gap-1.5 text-sm">
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-muted-foreground">Created</dt>
                                        <dd className="text-foreground">
                                            {formatLongDate(new Date(item.createdAt))}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-muted-foreground">Updated</dt>
                                        <dd className="text-foreground">
                                            {formatLongDate(new Date(item.updatedAt))}
                                        </dd>
                                    </div>
                                </dl>
                            </Section>
                        </div>
                    </div>

                    <AlertDialog
                        open={isDeleteOpen}
                        onOpenChange={(open) => {
                            if (!open) cancelDelete();
                        }}
                    >
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete this item?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    &ldquo;{item.title}&rdquo; will be permanently
                                    removed. This can&apos;t be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>

                            {deleteError && (
                                <p
                                    role="alert"
                                    className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                                >
                                    {deleteError}
                                </p>
                            )}

                            <AlertDialogFooter>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={cancelDelete}
                                    disabled={deleting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleDelete}
                                    disabled={deleting}
                                >
                                    {deleting && (
                                        <Loader2 className="size-4 animate-spin" />
                                    )}
                                    Delete
                                </Button>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    </>
                )}
            </SheetContent>
        </Sheet>
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

function Section({
    label,
    icon,
    children,
}: {
    label: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                {icon}
                {label}
            </h3>
            {children}
        </section>
    );
}

function DrawerSkeleton() {
    return (
        <div className="flex h-full flex-col p-6">
            <SheetTitle className="sr-only">Loading item</SheetTitle>
            <div className="flex items-start gap-3">
                <div className="size-10 shrink-0 animate-pulse rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                </div>
            </div>
            <div className="mt-6 h-8 w-full animate-pulse rounded bg-muted" />
            <div className="mt-8 space-y-4">
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-24 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
        </div>
    );
}

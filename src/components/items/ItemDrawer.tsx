"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { ItemTypeIcon } from "@/components/shared/ItemTypeIcon";
import { ItemActionBar } from "@/components/items/ItemActionBar";
import { ItemDetailView, ItemMetaSections } from "@/components/items/ItemDetailView";
import { ItemEditFields } from "@/components/items/ItemEditFields";
import { DeleteItemDialog } from "@/components/items/DeleteItemDialog";
import { useItemDrawer } from "@/components/items/item-drawer-provider";
import {
    toPayload,
    useItemDetail,
} from "@/components/items/use-item-detail";
import { EMPTY_ITEM_FORM, type ItemFormValues } from "@/components/items/item-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
} from "@/components/ui/sheet";
import { updateItem } from "@/actions/items";
import { makeFieldUpdater } from "@/lib/forms";
import {
    isContentItemType,
    isLanguageItemType,
    parseTagsInput,
} from "@/lib/validation/item";
import { capitalize } from "@/lib/utils";

export function ItemDrawer() {
    const { openItemId, closeItem } = useItemDrawer();
    const router = useRouter();

    const { item, isLoading, isError, retry, setItem } =
        useItemDetail(openItemId);

    // Edit mode and the delete dialog are id-tagged: they only apply while the
    // drawer is still showing the item that was open when they were triggered.
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteForId, setDeleteForId] = useState<string | null>(null);

    const [form, setForm] = useState<ItemFormValues>(EMPTY_ITEM_FORM);
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const updateField = makeFieldUpdater(setForm);

    const isEditing = item !== null && editingId === openItemId;
    const isDeleteOpen = item !== null && deleteForId === openItemId;
    const typeName = item?.itemType.name ?? "";

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
            content: isContentItemType(typeName) ? form.content : null,
            url: typeName === "link" ? form.url : null,
            language: isLanguageItemType(typeName) ? form.language : null,
            tags: parseTagsInput(form.tags),
        });

        setSaving(false);

        if (!result.success) {
            setFormError(result.error);
            toast.error(result.error);
            return;
        }

        setItem(toPayload(result.data));
        setEditingId(null);
        toast.success("Item updated.");
        router.refresh();
    }

    function handleSheetOpenChange(open: boolean) {
        if (open) return;
        closeItem();
        setEditingId(null);
        setFormError(null);
        setDeleteForId(null);
    }

    return (
        <Sheet open={openItemId !== null} onOpenChange={handleSheetOpenChange}>
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
                                        style={{
                                            backgroundColor: `${item.itemType.color}1a`,
                                        }}
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
                                                <Badge variant="secondary">
                                                    {item.language}
                                                </Badge>
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
                                            disabled={
                                                saving || form.title.trim() === ""
                                            }
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
                                    <ItemActionBar
                                        key={item.id}
                                        item={item}
                                        onEdit={startEdit}
                                        onDelete={() => setDeleteForId(item.id)}
                                    />
                                )}
                            </div>

                            <Separator />

                            <div className="editor-scroll flex-1 space-y-6 overflow-y-auto p-6">
                                {isEditing ? (
                                    <ItemEditFields
                                        typeName={typeName}
                                        form={form}
                                        formError={formError}
                                        updateField={updateField}
                                        onContentChange={(value) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                content: value,
                                            }))
                                        }
                                    />
                                ) : (
                                    <ItemDetailView item={item} />
                                )}

                                <ItemMetaSections
                                    item={item}
                                    onNavigate={closeItem}
                                />
                            </div>
                        </div>

                        <DeleteItemDialog
                            open={isDeleteOpen}
                            onOpenChange={(open) => {
                                if (!open) setDeleteForId(null);
                            }}
                            itemId={item.id}
                            title={item.title}
                            onDeleted={() => {
                                setDeleteForId(null);
                                closeItem();
                                setEditingId(null);
                                router.refresh();
                            }}
                        />
                    </>
                )}
            </SheetContent>
        </Sheet>
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

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { deleteItem } from "@/actions/items";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-message";

/**
 * Confirmation dialog for deleting an item. Owns the pending / error state and
 * the {@link deleteItem} call plus its toast; the parent controls `open`
 * (id-tagged in the drawer) and reacts to a successful delete via `onDeleted`.
 */
export function DeleteItemDialog({
    open,
    onOpenChange,
    itemId,
    title,
    onDeleted,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    itemId: string;
    title: string;
    onDeleted: () => void;
}) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function handleOpenChange(next: boolean) {
        if (!next && deleting) return;
        setError(null);
        onOpenChange(next);
    }

    async function handleDelete() {
        if (deleting) return;

        setDeleting(true);
        setError(null);

        const result = await deleteItem(itemId);

        setDeleting(false);

        if (!result.success) {
            setError(result.error);
            toast.error(result.error);
            return;
        }

        toast.success("Item deleted.");
        onDeleted();
    }

    return (
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete this item?</AlertDialogTitle>
                    <AlertDialogDescription>
                        &ldquo;{title}&rdquo; will be permanently removed. This
                        can&apos;t be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {error && <FormError>{error}</FormError>}

                <AlertDialogFooter>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenChange(false)}
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
                        {deleting && <Loader2 className="size-4 animate-spin" />}
                        Delete
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

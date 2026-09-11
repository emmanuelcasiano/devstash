"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { deleteCollection } from "@/actions/collections";
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
 * Confirmation dialog for deleting a collection. Owns the pending / error
 * state and the {@link deleteCollection} call plus its toast; the parent
 * controls `open` and reacts to a successful delete via `onDeleted` (mirrors
 * `DeleteItemDialog`). Deleting a collection never deletes its items — they
 * only lose their membership in it.
 */
export function DeleteCollectionDialog({
    open,
    onOpenChange,
    collectionId,
    name,
    onDeleted,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    collectionId: string;
    name: string;
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

        const result = await deleteCollection(collectionId);

        setDeleting(false);

        if (!result.success) {
            setError(result.error);
            toast.error(result.error);
            return;
        }

        toast.success("Collection deleted.");
        onDeleted();
    }

    return (
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete this collection?</AlertDialogTitle>
                    <AlertDialogDescription>
                        &ldquo;{name}&rdquo; will be permanently removed. Its
                        items won&apos;t be deleted — they&apos;ll just no
                        longer belong to this collection.
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

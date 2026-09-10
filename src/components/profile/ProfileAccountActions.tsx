"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, FormNotice } from "@/components/ui/form-message";
import {
    AlertDialog,
    AlertDialogClose,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { postJson } from "@/lib/http";
import {
    MIN_PASSWORD_LENGTH,
    PASSWORD_LENGTH_MESSAGE,
} from "@/lib/validation/auth";

function ChangePassword() {
    const [open, setOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [pending, setPending] = useState(false);

    function reset() {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setError(null);
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setSuccess(false);

        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            setError(PASSWORD_LENGTH_MESSAGE);
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setPending(true);
        const result = await postJson("/api/auth/change-password", {
            currentPassword,
            newPassword,
            confirmPassword,
        });

        if (!result.ok) {
            setError(result.error ?? "Something went wrong. Please try again.");
            setPending(false);
            return;
        }

        reset();
        setOpen(false);
        setSuccess(true);
        setPending(false);
    }

    if (!open) {
        return (
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-foreground">Password</p>
                        <p className="text-sm text-muted-foreground">
                            Change the password you use to sign in.
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            setSuccess(false);
                            setOpen(true);
                        }}
                    >
                        Change password
                    </Button>
                </div>
                {success && <FormNotice>Password updated.</FormNotice>}
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <p className="text-sm font-medium text-foreground">Change password</p>

            {error && <FormError>{error}</FormError>}

            <div className="flex flex-col gap-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                />
            </div>
            <div className="flex flex-col gap-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                />
            </div>
            <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                />
            </div>
            <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
                    {pending && <Loader2 className="animate-spin" />}
                    Update password
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => {
                        reset();
                        setOpen(false);
                    }}
                >
                    Cancel
                </Button>
            </div>
        </form>
    );
}

function DeleteAccount({ email }: { email: string }) {
    const [confirmation, setConfirmation] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    const canDelete = confirmation.trim().toLowerCase() === email.toLowerCase();

    async function handleDelete() {
        if (!canDelete || pending) return;
        setError(null);
        setPending(true);

        const result = await postJson("/api/auth/delete-account", {
            confirmation,
        });

        if (!result.ok) {
            setError(result.error ?? "Something went wrong. Please try again.");
            setPending(false);
            return;
        }

        await signOut({ redirectTo: "/sign-in" });
    }

    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                <p className="text-sm font-medium text-foreground">Delete account</p>
                <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all of its items and
                    collections. This cannot be undone.
                </p>
            </div>
            <AlertDialog
                onOpenChange={(next) => {
                    if (!next) {
                        setConfirmation("");
                        setError(null);
                    }
                }}
            >
                <AlertDialogTrigger
                    render={<Button type="button" variant="destructive" />}
                >
                    Delete account
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This permanently deletes your account along with every
                            item and collection you own. This action cannot be
                            undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="deleteConfirmation">
                            Type <span className="font-medium text-foreground">{email}</span>{" "}
                            to confirm
                        </Label>
                        <Input
                            id="deleteConfirmation"
                            value={confirmation}
                            onChange={(event) => setConfirmation(event.target.value)}
                            autoComplete="off"
                        />
                        {error && (
                            <p role="alert" className="text-sm text-destructive">
                                {error}
                            </p>
                        )}
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogClose
                            render={<Button type="button" variant="outline" />}
                            disabled={pending}
                        >
                            Cancel
                        </AlertDialogClose>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={!canDelete || pending}
                            onClick={handleDelete}
                        >
                            {pending && <Loader2 className="animate-spin" />}
                            Delete account
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export function ProfileAccountActions({
    email,
    hasPassword,
}: {
    email: string;
    hasPassword: boolean;
}) {
    return (
        <div className="flex flex-col gap-6">
            {hasPassword && (
                <>
                    <ChangePassword />
                    <div className="h-px bg-border" />
                </>
            )}
            <DeleteAccount email={email} />
        </div>
    );
}

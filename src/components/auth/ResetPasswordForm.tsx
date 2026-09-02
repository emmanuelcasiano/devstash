"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_PASSWORD_LENGTH = 8;

export function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") ?? "";

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(
        token ? null : "This reset link is invalid or has expired.",
    );
    const [linkInvalid, setLinkInvalid] = useState(!token);
    const [pending, setPending] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        if (password.length < MIN_PASSWORD_LENGTH) {
            setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setPending(true);
        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password, confirmPassword }),
            });

            const data = (await response.json().catch(() => null)) as
                | { error?: string; code?: string }
                | null;

            if (!response.ok) {
                setError(data?.error ?? "Something went wrong. Please try again.");
                if (data?.code === "InvalidToken") {
                    setLinkInvalid(true);
                }
                setPending(false);
                return;
            }

            router.push("/sign-in?reset=1");
        } catch {
            setError("Something went wrong. Please try again.");
            setPending(false);
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 text-center">
                <h1 className="text-2xl font-semibold">Choose a new password</h1>
                <p className="text-sm text-muted-foreground">
                    Enter a new password for your DevStash account
                </p>
            </div>

            {error && (
                <p
                    role="alert"
                    className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                    {error}
                </p>
            )}

            {linkInvalid ? (
                <p className="text-center text-sm text-muted-foreground">
                    <Link
                        href="/forgot-password"
                        className="font-medium text-foreground underline underline-offset-4"
                    >
                        Request a new reset link
                    </Link>
                </p>
            ) : (
                <form
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-4"
                    noValidate
                >
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="password">New password</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
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
                            onChange={(event) =>
                                setConfirmPassword(event.target.value)
                            }
                            required
                        />
                    </div>
                    <Button type="submit" disabled={pending}>
                        {pending && <Loader2 className="animate-spin" />}
                        Update password
                    </Button>
                </form>
            )}

            <p className="text-center text-sm text-muted-foreground">
                <Link
                    href="/sign-in"
                    className="font-medium text-foreground underline underline-offset-4"
                >
                    Back to sign in
                </Link>
            </p>
        </div>
    );
}

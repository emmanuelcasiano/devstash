"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-message";
import { postJson } from "@/lib/http";
import { EMAIL_PATTERN } from "@/lib/validation/auth";

export function ForgotPasswordForm() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const [sent, setSent] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        if (!EMAIL_PATTERN.test(email)) {
            setError("Enter a valid email address.");
            return;
        }

        setPending(true);
        const result = await postJson("/api/auth/forgot-password", { email });

        if (!result.ok) {
            setError(result.error ?? "Something went wrong. Please try again.");
            setPending(false);
            return;
        }
        setSent(true);
    }

    if (sent) {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2 text-center">
                    <h1 className="text-2xl font-semibold">Check your email</h1>
                    <p className="text-sm text-muted-foreground">
                        If an account exists for {email}, a password reset link is
                        on its way. The link expires in 1 hour.
                    </p>
                </div>
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

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 text-center">
                <h1 className="text-2xl font-semibold">Forgot your password?</h1>
                <p className="text-sm text-muted-foreground">
                    Enter your email and we&apos;ll send you a reset link
                </p>
            </div>

            {error && <FormError>{error}</FormError>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                    />
                </div>
                <Button type="submit" disabled={pending}>
                    {pending && <Loader2 className="animate-spin" />}
                    Send reset link
                </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
                Remembered it?{" "}
                <Link
                    href="/sign-in"
                    className="font-medium text-foreground underline underline-offset-4"
                >
                    Sign in
                </Link>
            </p>
        </div>
    );
}

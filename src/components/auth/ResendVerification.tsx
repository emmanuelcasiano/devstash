"use client";

import { useState } from "react";

import { postJson } from "@/lib/http";
import { EMAIL_PATTERN } from "@/lib/validation/auth";

/**
 * The "Resend verification email" affordance shown below the sign-in form after
 * an unverified sign-in attempt or an invalid verification link. POSTs the
 * entered email to the resend route; the outcome message is deliberately neutral
 * so it can't be used to probe which addresses are registered.
 *
 * Owns its own `sent` / `pending` / `error` state — give it a `key` that changes
 * per sign-in attempt so it re-arms.
 */
export function ResendVerification({ email }: { email: string }) {
    const [pending, setPending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleResend() {
        setError(null);

        if (!EMAIL_PATTERN.test(email)) {
            setError("Enter your email address above first.");
            return;
        }

        setPending(true);
        const result = await postJson("/api/auth/resend-verification", { email });
        setPending(false);

        if (!result.ok) {
            setError(
                result.error ?? "Couldn't send the email. Please try again.",
            );
        } else {
            setSent(true);
        }
    }

    return (
        <div className="flex flex-col gap-1 text-sm">
            {sent ? (
                <p className="text-muted-foreground">
                    If that account still needs verifying, a new link is on its
                    way.
                </p>
            ) : (
                <button
                    type="button"
                    onClick={handleResend}
                    disabled={pending}
                    className="self-start font-medium text-foreground underline underline-offset-4 disabled:opacity-60"
                >
                    {pending ? "Sending…" : "Resend verification email"}
                </button>
            )}
            {error && (
                <p role="alert" className="text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}

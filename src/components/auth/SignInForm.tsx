"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitHubIcon } from "@/components/auth/GitHubIcon";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const OAUTH_ERRORS: Record<string, string> = {
    OAuthAccountNotLinked:
        "This email is already linked to a different sign-in method.",
    AccessDenied: "Access was denied. Please try again.",
};

const VERIFICATION_INVALID_MESSAGE =
    "That verification link is invalid or has expired. Enter your email below and we'll send a new one.";

export function SignInForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const rawCallback = searchParams.get("callbackUrl");
    const callbackUrl =
        rawCallback && rawCallback.startsWith("/") ? rawCallback : "/dashboard";
    const justRegistered = searchParams.get("registered") === "1";
    // RegisterForm appends `verify=0` when email verification is disabled, so the
    // banner can drop the "check your email" instruction.
    const registeredNeedsVerification = searchParams.get("verify") !== "0";
    const justVerified = searchParams.get("verified") === "1";
    const urlError = searchParams.get("error");
    const verificationLinkFailed = urlError === "VerificationInvalid";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(
        verificationLinkFailed
            ? VERIFICATION_INVALID_MESSAGE
            : urlError
              ? OAUTH_ERRORS[urlError] ?? "Unable to sign in. Please try again."
              : null,
    );
    const [pending, setPending] = useState(false);
    const [githubPending, setGithubPending] = useState(false);

    const [showResend, setShowResend] = useState(verificationLinkFailed);
    const [resendPending, setResendPending] = useState(false);
    const [resendDone, setResendDone] = useState(false);
    const [resendError, setResendError] = useState<string | null>(null);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setResendError(null);

        if (!EMAIL_PATTERN.test(email)) {
            setError("Enter a valid email address.");
            return;
        }
        if (!password) {
            setError("Enter your password.");
            return;
        }

        setPending(true);
        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });
        setPending(false);

        if (!result || result.error) {
            if (result?.code === "EmailNotVerified") {
                setError("Verify your email address before signing in.");
                setShowResend(true);
                setResendDone(false);
            } else {
                setError("Invalid email or password.");
            }
            return;
        }

        router.push(callbackUrl);
        router.refresh();
    }

    function handleGitHub() {
        setError(null);
        setGithubPending(true);
        void signIn("github", { redirectTo: callbackUrl });
    }

    async function handleResend() {
        setResendError(null);

        if (!EMAIL_PATTERN.test(email)) {
            setResendError("Enter your email address above first.");
            return;
        }

        setResendPending(true);
        try {
            const response = await fetch("/api/auth/resend-verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            if (!response.ok) {
                setResendError("Couldn't send the email. Please try again.");
            } else {
                setResendDone(true);
            }
        } catch {
            setResendError("Couldn't send the email. Please try again.");
        }
        setResendPending(false);
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 text-center">
                <h1 className="text-2xl font-semibold">Welcome back</h1>
                <p className="text-sm text-muted-foreground">
                    Sign in to your DevStash account
                </p>
            </div>

            {justVerified && (
                <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
                    Email verified. You can sign in now.
                </p>
            )}

            {justRegistered && (
                <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
                    {registeredNeedsVerification
                        ? "Account created. Check your email for a verification link to activate it."
                        : "Account created. You can sign in now."}
                </p>
            )}

            {error && (
                <p
                    role="alert"
                    className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                    {error}
                </p>
            )}

            {showResend && (
                <div className="flex flex-col gap-1 text-sm">
                    {resendDone ? (
                        <p className="text-muted-foreground">
                            If that account still needs verifying, a new link is
                            on its way.
                        </p>
                    ) : (
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={resendPending}
                            className="self-start font-medium text-foreground underline underline-offset-4 disabled:opacity-60"
                        >
                            {resendPending
                                ? "Sending…"
                                : "Resend verification email"}
                        </button>
                    )}
                    {resendError && (
                        <p role="alert" className="text-destructive">
                            {resendError}
                        </p>
                    )}
                </div>
            )}

            <Button
                type="button"
                variant="outline"
                onClick={handleGitHub}
                disabled={githubPending || pending}
            >
                {githubPending ? (
                    <Loader2 className="animate-spin" />
                ) : (
                    <GitHubIcon className="size-4" />
                )}
                Sign in with GitHub
            </Button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
            </div>

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
                <div className="flex flex-col gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                    />
                </div>
                <Button type="submit" disabled={pending || githubPending}>
                    {pending && <Loader2 className="animate-spin" />}
                    Sign in
                </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                    href="/register"
                    className="font-medium text-foreground underline underline-offset-4"
                >
                    Create one
                </Link>
            </p>
        </div>
    );
}

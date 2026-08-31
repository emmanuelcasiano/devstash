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

export function SignInForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const rawCallback = searchParams.get("callbackUrl");
    const callbackUrl =
        rawCallback && rawCallback.startsWith("/") ? rawCallback : "/dashboard";
    const justRegistered = searchParams.get("registered") === "1";
    const urlError = searchParams.get("error");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(
        urlError
            ? OAUTH_ERRORS[urlError] ?? "Unable to sign in. Please try again."
            : null,
    );
    const [pending, setPending] = useState(false);
    const [githubPending, setGithubPending] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

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
            setError("Invalid email or password.");
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

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 text-center">
                <h1 className="text-2xl font-semibold">Welcome back</h1>
                <p className="text-sm text-muted-foreground">
                    Sign in to your DevStash account
                </p>
            </div>

            {justRegistered && (
                <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
                    Account created. Sign in to continue.
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

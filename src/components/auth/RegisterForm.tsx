"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

type Field = "name" | "email" | "password" | "confirmPassword";

export function RegisterForm() {
    const router = useRouter();

    const [form, setForm] = useState<Record<Field, string>>({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    function update(field: Field) {
        return (event: React.ChangeEvent<HTMLInputElement>) => {
            const { value } = event.target;
            setForm((prev) => ({ ...prev, [field]: value }));
        };
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        const name = form.name.trim();
        if (!name) {
            setError("Enter your name.");
            return;
        }
        if (!EMAIL_PATTERN.test(form.email)) {
            setError("Enter a valid email address.");
            return;
        }
        if (form.password.length < MIN_PASSWORD_LENGTH) {
            setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
            return;
        }
        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setPending(true);
        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    email: form.email,
                    password: form.password,
                    confirmPassword: form.confirmPassword,
                }),
            });

            const data = (await response.json().catch(() => null)) as
                | { error?: string; verificationRequired?: boolean }
                | null;

            if (!response.ok) {
                setError(data?.error ?? "Something went wrong. Please try again.");
                setPending(false);
                return;
            }

            // When email verification is disabled the account is ready to use,
            // so send them to sign-in without the "check your email" prompt.
            router.push(
                data?.verificationRequired === false
                    ? "/sign-in?registered=1&verify=0"
                    : "/sign-in?registered=1",
            );
        } catch {
            setError("Something went wrong. Please try again.");
            setPending(false);
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 text-center">
                <h1 className="text-2xl font-semibold">Create your account</h1>
                <p className="text-sm text-muted-foreground">
                    Start building your DevStash
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

            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        value={form.name}
                        onChange={update("name")}
                        required
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={update("email")}
                        required
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        value={form.password}
                        onChange={update("password")}
                        required
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        value={form.confirmPassword}
                        onChange={update("confirmPassword")}
                        required
                    />
                </div>
                <Button type="submit" disabled={pending}>
                    {pending && <Loader2 className="animate-spin" />}
                    Create account
                </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
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

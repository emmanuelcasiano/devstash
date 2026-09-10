import { cn } from "@/lib/utils";

/**
 * Inline error banner for forms — a red, `role="alert"` block. Replaces the
 * `<p role="alert" className="rounded-lg border border-destructive/40 …">` markup
 * that was copy-pasted across the auth forms, the item drawer, and the new-item
 * dialog.
 */
export function FormError({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <p
            role="alert"
            className={cn(
                "rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive",
                className,
            )}
        >
            {children}
        </p>
    );
}

/**
 * Neutral informational banner — the muted "Account created", "Email verified",
 * "Password updated" confirmations shown above the sign-in form and on the
 * profile page.
 */
export function FormNotice({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <p
            className={cn(
                "rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground",
                className,
            )}
        >
            {children}
        </p>
    );
}

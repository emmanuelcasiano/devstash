import Link from "next/link";
import { redirect } from "next/navigation";
import { Layers } from "lucide-react";

import { auth } from "@/auth";

/**
 * Layout for the sign-in and register pages. Centers the form and bounces
 * already-authenticated users to the dashboard.
 */
export default async function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    if (session?.user) {
        redirect("/dashboard");
    }

    return (
        <div className="flex min-h-screen flex-1 flex-col items-center justify-center p-4">
            <div className="flex w-full max-w-sm flex-col gap-8">
                <Link
                    href="/"
                    aria-label="DevStash home"
                    className="flex items-center justify-center gap-2 self-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                    <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
                        <Layers className="size-4 text-white" />
                    </div>
                    <span className="text-lg font-semibold">DevStash</span>
                </Link>
                {children}
            </div>
        </div>
    );
}
